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
  userCertificateForCourse: (userId: string, courseId: string) =>
    `user:${userId}:certificate-check:${courseId}`,

  // ── Gamification / progress ────────────────────────────────────────────
  userJourneyStatus: (userId: string) => `user:${userId}:journey-status`,
  userAchievements: (userId: string) => `user:${userId}:achievements`,
  userSummary: (userId: string) => `user:${userId}:summary`,
  /**
   * Every point-bearing user, ordered — the raw material for rank lookups.
   * Shared deliberately: the old code ran this full scan once per request per
   * user purely to find one person's position in the list.
   */
  userRankTable: () => `gamification:rank-table`,

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

  // ── Social: groups and events ──────────────────────────────────────────
  groupList: (scope: string) => `groups:${scope}`,
  groupDetail: (groupId: string) => `group:${groupId}:detail`,
  groupEvents: (groupId: string) => `group:${groupId}:events`,
  tutorGroups: (tutorId: string) => `tutor:${tutorId}:groups`,

  // ── Discussion: people directories ─────────────────────────────────────
  tutorDirectory: (scope: string) => `directory:tutors:${scope}`,
  studentDirectory: (scope: string) => `directory:students:${scope}`,

  // ── Pricing (external API responses, not DB rows) ──────────────────────
  pricingDetails: () => `pricing:details`,
  pricingPlans: () => `pricing:plans`,

  // ── Platform-wide ──────────────────────────────────────────────────────
  leaderboard: (scope: string) => `leaderboard:${scope}`,
  superAdminOverview: () => `admin:overview`,
  feedbackList: () => `admin:feedback`,
} as const;

/** Glob patterns for bulk invalidation. Always swept with SCAN, never KEYS. */
export const CachePatterns = {
  allForUser: (userId: string) => `user:${userId}:*`,
  courseDetailForUser: (userId: string) => `user:${userId}:course-detail:*`,
  courseDetailAllUsers: (courseId: string) => `user:*:course-detail:${courseId}`,
  courseLevelsAllUsers: () => `user:*:courses:*`,
  allForOrg: (orgId: string) => `org:${orgId}:*`,
  allGroupLists: () => `groups:*`,
  allForGroup: (groupId: string) => `group:${groupId}:*`,
  allTutorDirectories: () => `directory:tutors:*`,
  allStudentDirectories: () => `directory:students:*`,
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
  /**
   * Everything derived from a user's points/badges/progress. Grouped into one
   * scope because these four views are all projections of the same underlying
   * numbers — awarding a single point makes all of them stale at once, and
   * clearing them individually is how they drift apart.
   */
  | "gamification"
  | "all";
