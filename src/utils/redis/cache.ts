import { getRedis } from "./connection";
import { CacheKeys, CachePatterns, type CacheScope } from "./keys";

/**
 * Cache-aside read/write and invalidation.
 *
 * Every function is fail-open: if Redis is unconfigured, unreachable, or
 * throws, callers still get correct data straight from Postgres. Caching here
 * exists to cut database cost, so a cache fault must never become an API
 * fault.
 *
 * Invalidation is SYNCHRONOUS. The previous implementation pushed each
 * invalidation onto a BullMQ queue, but nothing consumed that queue in the
 * API process — so caches were written and then effectively never cleared,
 * and users would keep seeing stale profiles and course lists until the TTL
 * expired. A DEL costs microseconds; correctness is worth far more than that.
 */

// ─── Read-through ─────────────────────────────────────────────────────────

/**
 * Serve `key` from Redis when present; otherwise run `fallbackDbQuery`, cache
 * the result, and return it.
 *
 * Returns `T` rather than `T | null`: the previous signature returned null for
 * any falsy result, which typed a legitimately-empty list as "no data" at
 * every call site.
 */
export async function useCacheAside<T>(
  key: string,
  ttlInSeconds: number,
  fallbackDbQuery: () => Promise<T>,
): Promise<T> {
  const redis = await getRedis();

  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached !== null && cached !== undefined) {
        return JSON.parse(cached as string) as T;
      }
    } catch (err: any) {
      console.error(`[Cache] read failed for "${key}":`, err?.message ?? err);
    }
  }

  const fresh = await fallbackDbQuery();

  // An empty array is a real, cacheable answer — only skip null/undefined.
  if (redis && fresh !== undefined && fresh !== null) {
    try {
      await redis.set(key, JSON.stringify(fresh), { EX: ttlInSeconds });
    } catch (err: any) {
      console.error(`[Cache] write failed for "${key}":`, err?.message ?? err);
    }
  }

  return fresh;
}

// ─── Invalidation primitives ──────────────────────────────────────────────

/** Deletes specific keys. No-ops when Redis is unavailable. */
export async function invalidateKeys(...keys: string[]): Promise<void> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return;

  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.del(unique);
  } catch (err: any) {
    console.error(`[Cache] invalidate failed for ${unique.join(", ")}:`, err?.message ?? err);
  }
}

/**
 * Deletes every key matching a glob.
 *
 * Uses SCAN, never KEYS. KEYS blocks the entire Redis server until it
 * finishes, which on a managed/shared instance stalls every other client —
 * unacceptable on a request path.
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    let cursor = "0";
    do {
      const reply: any = await redis.scan(cursor as any, { MATCH: pattern, COUNT: 200 });
      cursor = String(reply.cursor);
      if (reply.keys?.length) await redis.del(reply.keys);
    } while (cursor !== "0");
  } catch (err: any) {
    console.error(`[Cache] pattern invalidate failed for "${pattern}":`, err?.message ?? err);
  }
}

// ─── Domain invalidation ──────────────────────────────────────────────────

/**
 * Clears cached data belonging to one user.
 *
 * Keeps its original name so existing call sites continue to work, but now
 * deletes immediately rather than enqueuing a job nothing consumed.
 */
export async function updateDataWithRedis(
  userId: string,
  scopes: CacheScope[],
): Promise<void> {
  if (!userId || scopes.length === 0) return;

  const keys: string[] = [];
  let sweepCourseDetail = false;

  for (const scope of scopes) {
    switch (scope) {
      case "profile":
        keys.push(CacheKeys.userProfile(userId));
        break;
      case "enrolled-courses":
        keys.push(CacheKeys.userEnrolledCourses(userId));
        break;
      case "saved-courses":
        keys.push(CacheKeys.userSavedCourses(userId));
        break;
      case "courses":
        keys.push(
          CacheKeys.userCoursesByLevel(userId, "beginner"),
          CacheKeys.userCoursesByLevel(userId, "intermediate"),
          CacheKeys.userCoursesByLevel(userId, "advanced"),
        );
        break;
      case "course-detail":
        sweepCourseDetail = true;
        break;
      case "notifications-all":
        keys.push(CacheKeys.notificationsAll(userId));
        break;
      case "notifications-unread":
        keys.push(CacheKeys.notificationsUnread(userId));
        break;
      case "notifications-counts":
        keys.push(CacheKeys.notificationCounts(userId));
        break;
      case "growth":
        keys.push(CacheKeys.userGrowth(userId));
        break;
      case "certificates":
        keys.push(CacheKeys.userCertificates(userId));
        break;
      case "gamification":
        keys.push(
          CacheKeys.userGrowth(userId),
          CacheKeys.userJourneyStatus(userId),
          CacheKeys.userAchievements(userId),
          CacheKeys.userSummary(userId),
        );
        // A points change also reorders everyone's rank, not just this user's.
        keys.push(CacheKeys.userRankTable());
        break;
      case "all":
        // One sweep is cheaper and safer than enumerating every key shape —
        // it can't miss a namespace someone added later.
        await invalidatePattern(CachePatterns.allForUser(userId));
        return;
    }
  }

  await invalidateKeys(...keys);
  if (sweepCourseDetail) {
    await invalidatePattern(CachePatterns.courseDetailForUser(userId));
  }
}

/**
 * Clears caches affected by a course changing: the shared catalogue, plus
 * every user's personalised view of that course.
 */
export async function invalidateCourseCaches(courseId?: string): Promise<void> {
  await invalidateKeys(CacheKeys.courseList());

  if (courseId) {
    await invalidateKeys(CacheKeys.courseDetail(courseId), CacheKeys.courseStats(courseId));
    await invalidatePattern(CachePatterns.courseDetailAllUsers(courseId));
  }

  // Per-user level listings are derived from the shared catalogue, so a
  // catalogue change makes all of them stale.
  await invalidatePattern(CachePatterns.courseLevelsAllUsers());
}

/** Clears an organization's cached dashboards after a membership/course change. */
export async function invalidateOrgCaches(orgId: string): Promise<void> {
  if (!orgId) return;
  await invalidatePattern(CachePatterns.allForOrg(orgId));
}

/**
 * Clears caches affected by a group changing.
 *
 * Sweeps every group listing rather than just the one that changed: the
 * listings are filtered/paginated slices of the same table, so a new or
 * deleted group can appear in or vanish from any of them.
 */
export async function invalidateGroupCaches(groupId?: string, tutorId?: string): Promise<void> {
  await invalidatePattern(CachePatterns.allGroupLists());
  if (groupId) await invalidatePattern(CachePatterns.allForGroup(groupId));
  if (tutorId) await invalidateKeys(CacheKeys.tutorGroups(tutorId));
}

/**
 * Clears the tutor/student directories.
 *
 * These are cached per query string, so a profile change has to sweep the
 * whole namespace — there's no way to know which search results contained a
 * given person without re-running every query.
 */
export async function invalidateDirectoryCaches(): Promise<void> {
  await invalidatePattern(CachePatterns.allTutorDirectories());
  await invalidatePattern(CachePatterns.allStudentDirectories());
}

/** Clears a user's notification caches. Used on send/read/delete. */
export async function invalidateNotificationCaches(userId: string): Promise<void> {
  await invalidateKeys(
    CacheKeys.notificationsAll(userId),
    CacheKeys.notificationsUnread(userId),
    CacheKeys.notificationCounts(userId),
  );
}
