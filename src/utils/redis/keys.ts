/**
 * Cache key registry and TTL policy.
 *
 * Every cache key in the codebase is constructed here. Keeping them in one
 * place is what stops the read path and the invalidation path from drifting
 * apart — the failure mode where data is cached under one string and cleared
 * under a slightly different one, so the cache never actually clears.
 *
 * Naming convention: `<entity>:<id>:<what>` — colon-separated, most general
 * segment first, so related keys share a prefix and can be swept with SCAN.
 */

export const CacheKeys = {
  // ── Per-user ───────────────────────────────────────────────────────────
  userProfile: (userId: string) => `user:${userId}:profile`,
  userEnrolledCourses: (userId: string) => `user:${userId}:enrolled-courses`,
  userSavedCourses: (userId: string) => `user:${userId}:saved-courses`,
  userCoursesByLevel: (userId: string, level: string) =>
    `user:${userId}:courses:${level.toLowerCase()}`,
  userCourseDetail: (userId: string, courseId: string) =>
    `user:${userId}:course-detail:${courseId}`,
  userGrowth: (userId: string) => `user:${userId}:growth`,
  userCertificates: (userId: string) => `user:${userId}:certificates`,

  // ── Notifications ──────────────────────────────────────────────────────
  notificationsAll: (userId: string) => `user:${userId}:notifications:all`,
  notificationsUnread: (userId: string) => `user:${userId}:notifications:unread`,
  notificationCounts: (userId: string) => `user:${userId}:notifications:counts`,

  // ── Shared catalogue ───────────────────────────────────────────────────
  courseList: () => `courses:all`,
  courseDetail: (courseId: string) => `course:${courseId}:detail`,
  courseStats: (courseId: string) => `course:${courseId}:stats`,

  // ── Organization ───────────────────────────────────────────────────────
  orgAnalytics: (orgId: string) => `org:${orgId}:analytics`,
  orgOverview: (orgId: string) => `org:${orgId}:overview`,
  orgMembers: (orgId: string) => `org:${orgId}:members`,
  orgCourses: (orgId: string) => `org:${orgId}:courses`,
  orgBreakdown: (orgId: string) => `org:${orgId}:breakdown`,

  // ── Platform-wide ──────────────────────────────────────────────────────
  leaderboard: (scope: string) => `leaderboard:${scope}`,
  superAdminOverview: () => `admin:overview`,
} as const;

/** Glob patterns for bulk invalidation. Always swept with SCAN, never KEYS. */
export const CachePatterns = {
  allForUser: (userId: string) => `user:${userId}:*`,
  courseDetailForUser: (userId: string) => `user:${userId}:course-detail:*`,
  courseDetailAllUsers: (courseId: string) => `user:*:course-detail:${courseId}`,
  courseLevelsAllUsers: () => `user:*:courses:*`,
  allForOrg: (orgId: string) => `org:${orgId}:*`,
} as const;

/**
 * TTL policy, in seconds.
 *
 * Anything with explicit invalidation can afford a long TTL; the TTL is only
 * the backstop for an invalidation we forgot. Anything without explicit
 * invalidation gets a short one, because the TTL *is* the correctness
 * mechanism there.
 */
export const TTL = {
  /** Live-ish counters and presence. */
  short: 60,
  /** Dashboards and aggregates that tolerate slight lag. */
  medium: 300,
  /** Catalogue data that changes rarely. */
  long: 1800,
  /** Data with explicit invalidation on every write path. */
  hour: 3600,
} as const;

export type CacheScope =
  | "profile"
  | "courses"
  | "enrolled-courses"
  | "saved-courses"
  | "course-detail"
  | "notifications-all"
  | "notifications-unread"
  | "notifications-counts"
  | "growth"
  | "certificates"
  | "all";
