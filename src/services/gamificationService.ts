import prisma from "../db";

// ==================== INTERFACES ====================
interface AddPointData {
  point: number; // Required - points to add
  userId: string; // Required - user ID
  courseId?: string;
  organizationId?: string;
  lessonId?: string;
  quizAttemptId?: string;
  enrollmentId?: string;
  joinGroupId?: string; // This should be JoinedGroup.id, NOT Group.id
  eventId?: string;
  progressId?: string;
  reason?: string; // For tracking why points were added
  actionType?: ActionType; // For gamification tracking
}

interface PointResult {
  success: boolean;
  message: string;
  data?: {
    userPoints: number;
    coursePoints?: number;
    groupPoints?: number;
    pointsAdded: number;
    leveledUp?: boolean;
    newLevel?: string;
    badgesEarned?: BadgeEarned[];
    streakUpdated?: number;
  };
  error?: string;
}

interface BadgeEarned {
  badgeId: string;
  badgeName: string;
  badgeType: BadgeType;
  awardedAt: Date;
}

// ==================== ENUMS ====================
export enum ActionType {
  LESSON_COMPLETE = "LESSON_COMPLETE",
  QUIZ_PASS = "QUIZ_PASS",
  COURSE_COMPLETE = "COURSE_COMPLETE",
  STREAK_7_DAY = "STREAK_7_DAY",
  DISCUSSION_PARTICIPATION = "DISCUSSION_PARTICIPATION",
  JOIN_GROUP = "JOIN_GROUP",
  ASK_QUESTION = "ASK_QUESTION",
  ATTEND_EVENT = "ATTEND_EVENT",
  COURSE_ENROLLMENT = "COURSE_ENROLLMENT",
}

enum BadgeType {
  COURSE_COMPLETION = "COURSE_COMPLETION",
  CONSISTENCY = "CONSISTENCY",
  MASTERY = "MASTERY",
  MILESTONE = "MILESTONE",
  COMMUNITY = "COMMUNITY",
}

// ==================== XP CONFIGURATION ====================
export const XP_CONFIG: Record<ActionType, number> = {
  [ActionType.LESSON_COMPLETE]: 10,
  [ActionType.QUIZ_PASS]: 20,
  [ActionType.COURSE_COMPLETE]: 100,
  [ActionType.STREAK_7_DAY]: 50,
  [ActionType.DISCUSSION_PARTICIPATION]: 5,
  [ActionType.JOIN_GROUP]: 10,
  [ActionType.ASK_QUESTION]: 10,
  [ActionType.ATTEND_EVENT]: 10,
  [ActionType.COURSE_ENROLLMENT]: 50,
};

// ==================== LEVEL CONFIGURATION ====================
const LEVEL_CONFIG = [
  { level: 1, name: "Seeker", requiredXP: 0, threshold: 500 },
  { level: 2, name: "Learner", requiredXP: 500, threshold: 1000 },
  { level: 3, name: "Disciple", requiredXP: 1500, threshold: 2000 },
  { level: 4, name: "Ambassador", requiredXP: 3500, threshold: 4000 },
  { level: 5, name: "Mentor", requiredXP: 7500, threshold: 8000 },
];

// ==================== BADGE CONFIGURATION ====================
const BADGE_CONFIG: Record<
  BadgeType,
  { name: string; description: string; requirements: any }
> = {
  [BadgeType.COURSE_COMPLETION]: {
    name: "Course Completion Badge",
    description: "Completed a course",
    requirements: { type: "course_complete", count: 1 },
  },
  [BadgeType.CONSISTENCY]: {
    name: "Consistency Badge",
    description: "Maintained a 7-day learning streak",
    requirements: { type: "streak_7_days", count: 1 },
  },
  [BadgeType.MASTERY]: {
    name: "Mastery Badge",
    description: "Scored 80% or higher on a quiz",
    requirements: { type: "quiz_mastery", score: 80 },
  },
  [BadgeType.MILESTONE]: {
    name: "Milestone Badge",
    description: "Completed 5 or more courses",
    requirements: { type: "course_milestone", count: 5 },
  },
  [BadgeType.COMMUNITY]: {
    name: "Community Badge",
    description: "Active community participation",
    requirements: { type: "community_participation", count: 10 },
  },
};

export class GamificationService {
  // ==================== EXISTING BASE METHODS ====================

  /**
   * Add points to a user for various activities
   */
  static async AddPoint(data: AddPointData): Promise<PointResult> {
    try {
      // Validate required fields
      if (!data.userId || !data.point) {
        return {
          success: false,
          message: "User ID and point amount are required",
        };
      }

      // Validate point is positive (for addition)
      if (data.point <= 0 && data.point !== -Math.abs(data.point)) {
        return {
          success: false,
          message: "Point amount must be greater than 0",
        };
      }

      // Check if user exists
      const userExists = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { point: true },
      });

      if (!userExists) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Use transaction to ensure all updates succeed or fail together
      const result = await prisma.$transaction(async (tx) => {
        let updatedUser;
        let updatedCourse = null;
        let updatedGroup = null;
        let updatedQuizAttempt = null;
        let updatedEnrollment = null;
        let updatedProgress = null;

        // 1. Update user's total points
        const currentPoints = userExists.point || 0;
        const newPoints = currentPoints + data.point;

        updatedUser = await tx.user.update({
          where: { id: data.userId },
          data: {
            point: newPoints,
          },
        });

        // 2. Handle Course points
        if (data.courseId) {
          const course = await tx.course.findUnique({
            where: { id: data.courseId },
          });

          if (!course) {
            throw new Error(`Course with ID ${data.courseId} not found`);
          }

          const courseCurrentPoints = course.point || 0;
          updatedCourse = await tx.course.update({
            where: { id: data.courseId },
            data: {
              point: courseCurrentPoints + data.point,
            },
          });

          // Update or create enrollment points
          if (data.enrollmentId) {
            const enrollment = await tx.enrollment.findUnique({
              where: { id: data.enrollmentId },
            });
            const currentScore = enrollment?.score || 0;
            updatedEnrollment = await tx.enrollment.update({
              where: { id: data.enrollmentId },
              data: {
                score: currentScore + data.point,
              },
            });
          } else {
            const existingEnrollment = await tx.enrollment.findFirst({
              where: {
                userId: data.userId,
                courseId: data.courseId,
              },
            });

            if (existingEnrollment) {
              const currentScore = existingEnrollment.score || 0;
              updatedEnrollment = await tx.enrollment.update({
                where: { id: existingEnrollment.id },
                data: {
                  score: currentScore + data.point,
                },
              });
            } else {
              updatedEnrollment = await tx.enrollment.create({
                data: {
                  userId: data.userId,
                  courseId: data.courseId,
                  score: data.point > 0 ? data.point : 0,
                  status: "ENROLLED",
                  startedAt: new Date(),
                },
              });
            }
          }
        }

        // 3. Handle Group points - data.joinGroupId should be JoinedGroup.id
        if (data.joinGroupId) {
          const joinedGroup = await tx.joinedGroup.findUnique({
            where: { id: data.joinGroupId },
          });

          if (!joinedGroup) {
            throw new Error(
              `JoinedGroup with ID ${data.joinGroupId} not found`,
            );
          }

          const currentGroupPoints = joinedGroup.point || 0;
          updatedGroup = await tx.joinedGroup.update({
            where: { id: data.joinGroupId },
            data: {
              point: currentGroupPoints + data.point,
            },
          });
        }

        // 4. Handle Quiz points
        if (data.quizAttemptId) {
          const quizAttempt = await tx.quizAttempt.findUnique({
            where: { id: data.quizAttemptId },
          });

          if (!quizAttempt) {
            throw new Error(
              `Quiz attempt with ID ${data.quizAttemptId} not found`,
            );
          }

          const currentScore = quizAttempt.score || 0;
          updatedQuizAttempt = await tx.quizAttempt.update({
            where: { id: data.quizAttemptId },
            data: {
              score: currentScore + data.point,
            },
          });
        }

        // 5. Handle Progress points
        if (data.progressId) {
          const progress = await tx.progress.findUnique({
            where: { id: data.progressId },
          });

          if (progress) {
            const currentProgress = progress.progressBar || 0;
            updatedProgress = await tx.progress.update({
              where: { id: data.progressId },
              data: {
                progressBar: currentProgress + data.point,
              },
            });
          }
        }

        // 6. Create point history record for tracking
        await tx.pointHistory.create({
          data: {
            userId: data.userId,
            point: data.point,
            reason: data.reason || "Points awarded",
            courseId: data.courseId,
            lessonId: data.lessonId,
            quizAttemptId: data.quizAttemptId,
            joinedGroupId: data.joinGroupId,
            enrollmentId: data.enrollmentId,
            progressId: data.progressId,
          },
        });

        return {
          updatedUser,
          updatedCourse,
          updatedGroup,
          updatedQuizAttempt,
          updatedEnrollment,
          updatedProgress,
        };
      });

      // Prepare success response
      const responseData: any = {
        userPoints: result.updatedUser.point || 0,
        pointsAdded: data.point,
      };

      if (result.updatedCourse) {
        responseData.coursePoints = result.updatedCourse.point;
      }

      if (result.updatedGroup) {
        responseData.groupPoints = result.updatedGroup.point;
      }

      if (result.updatedEnrollment) {
        responseData.enrollmentPoints = result.updatedEnrollment.score;
      }

      return {
        success: true,
        message: `Successfully added ${Math.abs(data.point)} points${data.reason ? ` for: ${data.reason}` : ""}`,
        data: responseData,
      };
    } catch (error) {
      console.error("Error adding points:", error);
      return {
        success: false,
        message: "Failed to add points",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user's total points
   */
  static async GetUserPoints(userId: string): Promise<PointResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { point: true, first_name: true, email_address: true },
      });

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      return {
        success: true,
        message: "User points fetched successfully",
        data: {
          userPoints: user.point || 0,
          pointsAdded: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch user points",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user's points for a specific course
   */
  static async GetUserCoursePoints(
    userId: string,
    courseId: string,
  ): Promise<PointResult> {
    try {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId,
          courseId,
        },
        select: {
          score: true,
          course: {
            select: { course_title: true },
          },
        },
      });

      return {
        success: true,
        message: "Course points fetched successfully",
        data: {
          userPoints: enrollment?.score || 0,
          pointsAdded: 0,
          coursePoints: enrollment?.score || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch course points",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user's points for a specific group
   */
  static async GetUserGroupPoints(
    userId: string,
    groupId: string,
  ): Promise<PointResult> {
    try {
      const joinedGroup = await prisma.joinedGroup.findUnique({
        where: {
          groupId_studentId: {
            groupId,
            studentId: userId,
          },
        },
        select: {
          point: true,
          group: {
            select: { group_title: true },
          },
        },
      });

      return {
        success: true,
        message: "Group points fetched successfully",
        data: {
          userPoints: joinedGroup?.point || 0,
          pointsAdded: 0,
          groupPoints: joinedGroup?.point || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch group points",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get point history for a user
   */
  static async GetPointHistory(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<{
    success: boolean;
    message: string;
    data?: any[];
    error?: string;
  }> {
    try {
      const history = await prisma.pointHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit || 50,
        skip: offset || 0,
        include: {
          course: { select: { course_title: true } },
          joinedGroup: {
            include: {
              group: { select: { group_title: true } },
            },
          },
          enrollment: {
            include: {
              course: { select: { course_title: true } },
            },
          },
        },
      });

      return {
        success: true,
        message: "Point history fetched successfully",
        data: history,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch point history",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get leaderboard for a course
   */
  static async GetCourseLeaderboard(
    courseId: string,
    limit: number = 10,
  ): Promise<{
    success: boolean;
    message: string;
    data?: any[];
    error?: string;
  }> {
    try {
      const leaderboard = await prisma.enrollment.findMany({
        where: { courseId },
        orderBy: { score: "desc" },
        take: limit,
        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
              email_address: true,
              user_pic: true,
            },
          },
        },
      });

      return {
        success: true,
        message: "Leaderboard fetched successfully",
        data: leaderboard,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch leaderboard",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get leaderboard for a group
   */
  static async GetGroupLeaderboard(
    groupId: string,
    limit: number = 10,
  ): Promise<{
    success: boolean;
    message: string;
    data?: any[];
    error?: string;
  }> {
    try {
      const leaderboard = await prisma.joinedGroup.findMany({
        where: { groupId },
        orderBy: { point: "desc" },
        take: limit,
        include: {
          student: {
            select: {
              first_name: true,
              last_name: true,
              email_address: true,
              user_pic: true,
            },
          },
        },
      });

      return {
        success: true,
        message: "Group leaderboard fetched successfully",
        data: leaderboard,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch group leaderboard",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Deduct points from a user
   */
  static async DeductPoints(
    userId: string,
    points: number,
    reason?: string,
  ): Promise<PointResult> {
    if (points <= 0) {
      return {
        success: false,
        message: "Points to deduct must be greater than 0",
      };
    }

    return this.AddPoint({
      userId,
      point: -points,
      reason: reason || "Points deducted",
    });
  }

  /**
   * Reset user points
   */
  static async ResetUserPoints(userId: string): Promise<PointResult> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { point: 0 },
      });

      return {
        success: true,
        message: "User points reset successfully",
        data: {
          userPoints: 0,
          pointsAdded: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to reset user points",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user's total points summary
   */
  static async GetUserPointsSummary(userId: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      totalPoints: number;
      coursePoints: { courseId: string; courseTitle: string; points: number }[];
      groupPoints: { groupId: string; groupTitle: string; points: number }[];
      recentActivity: any[];
    };
    error?: string;
  }> {
    try {
      const [user, enrollments, joinedGroups, recentHistory] =
        await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: { point: true },
          }),
          prisma.enrollment.findMany({
            where: { userId },
            include: {
              course: { select: { course_title: true } },
            },
          }),
          prisma.joinedGroup.findMany({
            where: { studentId: userId },
            include: {
              group: { select: { group_title: true } },
            },
          }),
          prisma.pointHistory.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
        ]);

      return {
        success: true,
        message: "User points summary fetched successfully",
        data: {
          totalPoints: user?.point || 0,
          coursePoints: enrollments.map((e) => ({
            courseId: e.courseId,
            courseTitle: e.course.course_title,
            points: e.score || 0,
          })),
          groupPoints: joinedGroups.map((g) => ({
            groupId: g.groupId,
            groupTitle: g.group?.group_title || "",
            points: g.point || 0,
          })),
          recentActivity: recentHistory,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch user points summary",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ==================== GAMIFICATION METHODS ====================

  /**
   * Get XP points for a specific action
   */
  static getXPAction(action: ActionType): number {
    return XP_CONFIG[action] || 0;
  }

  /**
   * Calculate user's level based on total XP
   */
  static calculateLevel(totalXP: number): {
    level: number;
    name: string;
    nextLevelXP: number;
    progressToNext: number;
  } {
    let currentLevel = LEVEL_CONFIG[0];
    let nextLevel = LEVEL_CONFIG[1];

    for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
      if (totalXP >= LEVEL_CONFIG[i].requiredXP) {
        currentLevel = LEVEL_CONFIG[i];
        nextLevel = LEVEL_CONFIG[i + 1] || LEVEL_CONFIG[i];
        break;
      }
    }

    const xpNeededForNext = nextLevel.requiredXP - currentLevel.requiredXP;
    const xpGainedInCurrent = totalXP - currentLevel.requiredXP;
    const progressToNext =
      xpNeededForNext > 0 ? (xpGainedInCurrent / xpNeededForNext) * 100 : 100;

    const nextLevelXP = nextLevel.requiredXP - totalXP;

    return {
      level: currentLevel.level,
      name: currentLevel.name,
      nextLevelXP: nextLevelXP > 0 ? nextLevelXP : 0,
      progressToNext: Math.min(progressToNext, 100),
    };
  }

  /**
   * Add points with full gamification logic (levels, badges, streaks)
   */
  static async AddPointsWithGamification(
    userId: string,
    actionType: ActionType,
    metadata?: {
      courseId?: string;
      quizScore?: number;
      lessonId?: string;
      groupId?: string;
      joinedGroupId?: string;
      eventId?: string;
      quizAttemptId?: string;
    },
  ): Promise<PointResult> {
    try {
      const points = this.getXPAction(actionType);

      if (points === 0) {
        return {
          success: false,
          message: "Invalid action type",
        };
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          badges: true,
          badgesAndLevel: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      const previousXP = user.point || 0;
      const previousLevel = this.calculateLevel(previousXP);
      const currentStreak = await this.updateStreak(userId);

      const result = await this.AddPoint({
        userId,
        point: points,
        courseId: metadata?.courseId,
        joinGroupId: metadata?.joinedGroupId,
        eventId: metadata?.eventId,
        lessonId: metadata?.lessonId,
        quizAttemptId: metadata?.quizAttemptId,
        reason: `Earned ${points} XP for ${actionType}`,
        actionType,
      });

      if (!result.success) {
        return result;
      }

      const newTotalXP = result.data?.userPoints || previousXP + points;
      const newLevel = this.calculateLevel(newTotalXP);

      let leveledUp = false;
      let badgesEarned: BadgeEarned[] = [];

      if (newLevel.level > previousLevel.level) {
        leveledUp = true;

        await prisma.user.update({
          where: { id: userId },
          data: {
            level: newLevel.name,
          },
        });

        await prisma.pointHistory.create({
          data: {
            userId,
            point: 0,
            reason: `🏆 LEVEL UP! You've reached ${newLevel.name} level!`,
          },
        });

        await this.createNotification(
          userId,
          `🎉 Level Up! You're now a ${newLevel.name}!`,
          `Congratulations on reaching ${newLevel.name} level! Keep growing in your discipleship journey.`,
          "LEVEL_UP",
        );
      }

      badgesEarned = await this.checkAndAwardBadges(
        userId,
        actionType,
        metadata,
      );

      if (currentStreak === 7) {
        await this.AddPointsWithGamification(userId, ActionType.STREAK_7_DAY);
      }

      return {
        success: true,
        message: `✨ Earned ${points} XP for ${actionType.replace(/_/g, " ")}!`,
        data: {
          ...result.data,
          leveledUp,
          newLevel: leveledUp ? newLevel.name : undefined,
          badgesEarned,
          streakUpdated: currentStreak,
        },
      };
    } catch (error) {
      console.error("Error in gamification:", error);
      return {
        success: false,
        message: "Failed to process gamification",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check and award badges based on user activity
   */
  private static async checkAndAwardBadges(
    userId: string,
    actionType: ActionType,
    metadata?: {
      courseId?: string;
      quizScore?: number;
      lessonId?: string;
      groupId?: string;
      joinedGroupId?: string;
      eventId?: string;
      quizAttemptId?: string;
    },
  ): Promise<BadgeEarned[]> {
    const earnedBadges: BadgeEarned[] = [];

    const existingBadges = await prisma.badges.findMany({
      where: { userId },
      include: { achievement: true },
    });

    const existingBadgeTypes = existingBadges.map((b) => b.badges);

    // Course Completion Badge
    if (actionType === ActionType.COURSE_COMPLETE && metadata?.courseId) {
      if (!existingBadgeTypes.includes(BadgeType.COURSE_COMPLETION as any)) {
        const badge = await this.awardBadge(
          userId,
          BadgeType.COURSE_COMPLETION,
          {
            courseId: metadata.courseId,
          },
        );
        if (badge) earnedBadges.push(badge);
      }
    }

    // Mastery Badge (Quiz score >= 80%)
    if (
      actionType === ActionType.QUIZ_PASS &&
      metadata?.quizScore &&
      metadata.quizScore >= 80
    ) {
      if (!existingBadgeTypes.includes(BadgeType.MASTERY as any)) {
        const badge = await this.awardBadge(userId, BadgeType.MASTERY, {
          quizScore: metadata.quizScore,
        });
        if (badge) earnedBadges.push(badge);
      }
    }

    // Consistency Badge (7-day streak)
    if (actionType === ActionType.STREAK_7_DAY) {
      if (!existingBadgeTypes.includes(BadgeType.CONSISTENCY as any)) {
        const badge = await this.awardBadge(userId, BadgeType.CONSISTENCY);
        if (badge) earnedBadges.push(badge);
      }
    }

    // Milestone Badge (5+ courses completed)
    if (actionType === ActionType.COURSE_COMPLETE) {
      const completedCourses = await prisma.enrollment.count({
        where: {
          userId,
          status: "COMPLETED",
        },
      });

      if (
        completedCourses >= 5 &&
        !existingBadgeTypes.includes(BadgeType.MILESTONE as any)
      ) {
        const badge = await this.awardBadge(userId, BadgeType.MILESTONE, {
          completedCourses,
        });
        if (badge) earnedBadges.push(badge);
      }
    }

    // Community Badge (Active participation - 10 discussions)
    if (actionType === ActionType.DISCUSSION_PARTICIPATION) {
      const participationCount = await prisma.post.count({
        where: { userId },
      });

      if (
        participationCount >= 10 &&
        !existingBadgeTypes.includes(BadgeType.COMMUNITY as any)
      ) {
        const badge = await this.awardBadge(userId, BadgeType.COMMUNITY, {
          participationCount,
        });
        if (badge) earnedBadges.push(badge);
      }
    }

    return earnedBadges;
  }

  /**
   * Award a badge to a user
   */
  private static async awardBadge(
    userId: string,
    badgeType: BadgeType,
    metadata?: any,
  ): Promise<BadgeEarned | null> {
    try {
      const badgeConfig = BADGE_CONFIG[badgeType];

      const achievement = await prisma.achievement.create({
        data: {
          title: badgeConfig.name,
          content: badgeConfig.description,
          point: 0,
          userId,
        },
      });

      const badge = await prisma.badges.create({
        data: {
          badges: badgeType as any,
          userId,
          achievementId: achievement.id,
        },
      });

      await this.createNotification(
        userId,
        `🏆 New Badge: ${badgeConfig.name}!`,
        `${badgeConfig.description}. Keep up the great work!`,
        "BADGE_EARNED",
      );

      await this.AddPoint({
        userId,
        point: 25,
        reason: `🎖️ Bonus XP for earning ${badgeConfig.name} badge!`,
      });

      return {
        badgeId: badge.id,
        badgeName: badgeConfig.name,
        badgeType,
        awardedAt: new Date(),
      };
    } catch (error) {
      console.error("Error awarding badge:", error);
      return null;
    }
  }

  /**
   * Calculate and update user's streak
   */
  static async updateStreak(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastActivity = await prisma.pointHistory.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      if (!lastActivity) {
        return 1;
      }

      const lastActivityDate = new Date(lastActivity.createdAt);
      lastActivityDate.setHours(0, 0, 0, 0);

      if (lastActivityDate.getTime() === yesterday.getTime()) {
        const streakCount = await this.getCurrentStreak(userId);
        return streakCount + 1;
      } else if (lastActivityDate.getTime() === today.getTime()) {
        return await this.getCurrentStreak(userId);
      } else {
        return 1;
      }
    } catch (error) {
      console.error("Error updating streak:", error);
      return 0;
    }
  }

  /**
   * Get user's current streak
   */
  static async getCurrentStreak(userId: string): Promise<number> {
    try {
      const activities = await prisma.pointHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      for (const activity of activities) {
        const activityDate = new Date(activity.createdAt);
        activityDate.setHours(0, 0, 0, 0);

        if (activityDate.getTime() === currentDate.getTime()) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (activityDate.getTime() === currentDate.getTime()) {
          continue;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get user's complete gamification dashboard
   */
  static async getUserDashboard(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          badges: {
            include: { achievement: true },
            orderBy: { createdAt: "desc" },
          },
          pointHistory: {
            take: 20,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user) return null;
      const totalXP = user.point || 0;
      const levelInfo = this.calculateLevel(totalXP);
      const currentStreak = await this.getCurrentStreak(userId);

      const completedCourses = await prisma.enrollment.count({
        where: {
          userId,
          status: "COMPLETED",
        },
      });

      const inProgressCourses = await prisma.enrollment.count({
        where: {
          userId,
          status: "IN_PROGRESS",
        },
      });

      const masteryQuizzes = await prisma.quizAttempt.count({
        where: {
          userId,
          score: { gte: 80 },
        },
      });

      const xpNeededForNextLevel = levelInfo.nextLevelXP;

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email_address,
            avatar: user.user_pic,
            level: user.level || levelInfo.name,
          },
          gamification: {
            totalXP,
            level: levelInfo.level,
            levelName: levelInfo.name,
            nextLevelXP: xpNeededForNextLevel,
            progressToNextLevel: levelInfo.progressToNext,
            currentStreak,
            completedCourses,
            inProgressCourses,
            masteryQuizzes,
            badgesCount: user.badges.length,
          },
          recentActivity: user.pointHistory.slice(0, 10).map((history) => ({
            action: history.reason,
            points: history.point,
            date: history.createdAt,
            isBonus: history.point > 0 && history.reason?.includes("Bonus"),
          })),
          badges: user.badges.map((badge) => ({
            id: badge.id,
            name: badge.achievement?.title || badge.badges,
            type: badge.badges,
            description: badge.achievement?.content,
            earnedAt: badge.createdAt,
          })),
        },
      };
    } catch (error) {
      console.error("Error fetching user dashboard:", error);
      return {
        success: false,
        message: "Failed to fetch user dashboard",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get organization leaderboard with stats
   */
  static async getOrganizationLeaderboard(
    organizationId: string,
    limit: number = 10,
  ): Promise<any> {
    try {
      const members = await prisma.user.findMany({
        where: {
          organization: {
          
              id: organizationId,
            
          },
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          user_pic: true,
          point: true,
          level: true,
          enrollment: {
            where: { status: "COMPLETED" },
            select: { id: true },
          },
        },
        orderBy: { point: "desc" },
        take: limit,
      });

      const totalMembers = members.length;
      const totalXP = members.reduce((sum, m) => sum + (m.point || 0), 0);
      const totalCoursesCompleted = members.reduce(
        (sum, m) => sum + m.enrollment.length,
        0,
      );
      const activeMembers = members.filter((m) => {
        return m.enrollment.length > 0 || (m.point || 0) > 0;
      }).length;

      return {
        success: true,
        data: {
          organizationId,
          stats: {
            totalXP,
            totalCoursesCompleted,
            activeMembers,
            totalMembers,
            completionRate:
              totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0,
            averageXPPerMember: totalMembers > 0 ? totalXP / totalMembers : 0,
          },
          leaderboard: members.map((member, index) => ({
            rank: index + 1,
            id: member.id,
            name: `${member.first_name} ${member.last_name}`,
            avatar: member.user_pic,
            totalXP: member.point || 0,
            level: member.level || "Seeker",
            coursesCompleted: member.enrollment.length,
          })),
        },
      };
    } catch (error) {
      console.error("Error fetching organization leaderboard:", error);
      return {
        success: false,
        message: "Failed to fetch organization leaderboard",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user's progress for a specific course
   */
  static async getCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<any> {
    try {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId,
          courseId,
        },
        include: {
          course: {
            include: {
              module: {
                include: {
                  lesson: true,
                },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      });

      if (!enrollment) {
        return {
          success: false,
          message: "User not enrolled in this course",
        };
      }

      const totalLessons = enrollment.course.module.reduce(
        (sum, module) => sum + module.lesson.length,
        0,
      );

      const completedLessons = 0;

      const progressPercentage =
        totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      return {
        success: true,
        data: {
          courseId: enrollment.courseId,
          courseTitle: enrollment.course.course_title,
          status: enrollment.status,
          score: enrollment.score || 0,
          startedAt: enrollment.startedAt,
          completedAt: enrollment.completedAt,
          progress: {
            percentage: progressPercentage,
            lessonsCompleted: completedLessons,
            totalLessons,
          },
          modules: enrollment.course.module.map((module) => ({
            id: module.id,
            title: module.module_title,
            lessons: module.lesson.length,
            completed: 0,
          })),
        },
      };
    } catch (error) {
      console.error("Error fetching course progress:", error);
      return {
        success: false,
        message: "Failed to fetch course progress",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create notification for user
   */
  private static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          title,
          message,
          type,
          to: userId,
          role: "student",
          userId,
          isRead: false,
        },
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }

  // ==================== DELETE POINT METHODS ====================

  /**
   * Delete a specific point record (reverse a point addition)
   * Useful for admin corrections or reverting erroneous point awards
   */
  static async DeletePoint(
    pointHistoryId: string,
    reason?: string,
  ): Promise<PointResult> {
    try {
      const pointHistory = await prisma.pointHistory.findUnique({
        where: { id: pointHistoryId },
        include: {
          user: true,
          course: true,
          joinedGroup: true,
          enrollment: true,
          progress: true,
          quizAttempt: true,
        },
      });

      if (!pointHistory) {
        return {
          success: false,
          message: "Point history record not found",
        };
      }

      const result = await prisma.$transaction(async (tx) => {
        let updatedUser;
        let updatedCourse = null;
        let updatedGroup = null;
        let updatedQuizAttempt = null;
        let updatedEnrollment = null;
        let updatedProgress = null;

        // 1. Subtract points from user's total points
        const currentUserPoints = pointHistory.user?.point || 0;
        const newUserPoints = currentUserPoints - pointHistory.point;

        updatedUser = await tx.user.update({
          where: { id: pointHistory.userId },
          data: {
            point: newUserPoints,
          },
        });

        // 2. Handle Course points deduction
        if (pointHistory.courseId) {
          const course = await tx.course.findUnique({
            where: { id: pointHistory.courseId },
          });

          if (course) {
            const currentCoursePoints = course.point || 0;
            updatedCourse = await tx.course.update({
              where: { id: pointHistory.courseId },
              data: {
                point: currentCoursePoints - pointHistory.point,
              },
            });
          }

          // Handle enrollment points deduction
          if (pointHistory.enrollmentId) {
            const enrollment = await tx.enrollment.findUnique({
              where: { id: pointHistory.enrollmentId },
            });

            if (enrollment) {
              const currentScore = enrollment.score || 0;
              updatedEnrollment = await tx.enrollment.update({
                where: { id: pointHistory.enrollmentId },
                data: {
                  score: currentScore - pointHistory.point,
                },
              });
            }
          } else {
            const enrollment = await tx.enrollment.findFirst({
              where: {
                userId: pointHistory.userId,
                courseId: pointHistory.courseId,
              },
            });

            if (enrollment) {
              const currentScore = enrollment.score || 0;
              updatedEnrollment = await tx.enrollment.update({
                where: { id: enrollment.id },
                data: {
                  score: currentScore - pointHistory.point,
                },
              });
            }
          }
        }

        // 3. Handle Group points deduction (using JoinedGroup)
        if (pointHistory.joinedGroupId) {
          const joinedGroup = await tx.joinedGroup.findUnique({
            where: { id: pointHistory.joinedGroupId },
          });

          if (joinedGroup) {
            const currentGroupPoints = joinedGroup.point || 0;
            updatedGroup = await tx.joinedGroup.update({
              where: { id: pointHistory.joinedGroupId },
              data: {
                point: currentGroupPoints - pointHistory.point,
              },
            });
          }
        }

        // 4. Handle Quiz points deduction
        if (pointHistory.quizAttemptId) {
          const quizAttempt = await tx.quizAttempt.findUnique({
            where: { id: pointHistory.quizAttemptId },
          });

          if (quizAttempt) {
            const currentScore = quizAttempt.score || 0;
            updatedQuizAttempt = await tx.quizAttempt.update({
              where: { id: pointHistory.quizAttemptId },
              data: {
                score: currentScore - pointHistory.point,
              },
            });
          }
        }

        // 5. Handle Progress points deduction
        if (pointHistory.progressId) {
          const progress = await tx.progress.findUnique({
            where: { id: pointHistory.progressId },
          });

          if (progress) {
            const currentProgress = progress.progressBar || 0;
            updatedProgress = await tx.progress.update({
              where: { id: pointHistory.progressId },
              data: {
                progressBar: currentProgress - pointHistory.point,
              },
            });
          }
        }

        // 6. Create a reversal record
        await tx.pointHistory.create({
          data: {
            userId: pointHistory.userId,
            point: -pointHistory.point,
            reason:
              reason ||
              `Reversal: ${pointHistory.reason || "Point adjustment"}`,
            courseId: pointHistory.courseId,
            lessonId: pointHistory.lessonId,
            quizAttemptId: pointHistory.quizAttemptId,
            joinedGroupId: pointHistory.joinedGroupId,
            enrollmentId: pointHistory.enrollmentId,
            progressId: pointHistory.progressId,
          },
        });

        return {
          updatedUser,
          updatedCourse,
          updatedGroup,
          updatedQuizAttempt,
          updatedEnrollment,
          updatedProgress,
        };
      });

      const responseData: any = {
        userPoints: result.updatedUser.point || 0,
        pointsRemoved: pointHistory.point,
      };

      if (result.updatedCourse) {
        responseData.coursePoints = result.updatedCourse.point;
      }

      if (result.updatedGroup) {
        responseData.groupPoints = result.updatedGroup.point;
      }

      if (result.updatedEnrollment) {
        responseData.enrollmentPoints = result.updatedEnrollment.score;
      }

      return {
        success: true,
        message: `Successfully removed ${Math.abs(pointHistory.point)} points. ${reason || "Point reversal completed."}`,
        data: responseData,
      };
    } catch (error) {
      console.error("Error deleting point:", error);
      return {
        success: false,
        message: "Failed to delete point",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete all points for a specific JoinedGroup (when user leaves a group)
   * This removes all points earned from that specific group membership
   */
  static async DeletePointsByJoinedGroup(
    joinedGroupId: string,
    reason?: string,
  ): Promise<PointResult> {
    try {
      const pointHistories = await prisma.pointHistory.findMany({
        where: {
          joinedGroupId: joinedGroupId,
        },
        include: {
          user: true,
          joinedGroup: true,
        },
      });

      if (pointHistories.length === 0) {
        return {
          success: false,
          message: "No point records found for this group membership",
        };
      }

      const totalPointsToRemove = pointHistories.reduce(
        (sum, record) => sum + record.point,
        0,
      );

      const userId = pointHistories[0].userId;

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { point: true },
        });

        const currentUserPoints = user?.point || 0;
        const newUserPoints = currentUserPoints - totalPointsToRemove;

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            point: newUserPoints,
          },
        });

        const joinedGroup = await tx.joinedGroup.findUnique({
          where: { id: joinedGroupId },
        });

        let updatedGroup = null;
        if (joinedGroup) {
          const currentGroupPoints = joinedGroup.point || 0;
          updatedGroup = await tx.joinedGroup.update({
            where: { id: joinedGroupId },
            data: {
              point: currentGroupPoints - totalPointsToRemove,
            },
          });
        }

        await tx.pointHistory.create({
          data: {
            userId: userId,
            point: -totalPointsToRemove,
            reason:
              reason ||
              `Points removed for leaving group: ${joinedGroup?.groupId?.toString() || "Unknown group"}`,
            joinedGroupId: joinedGroupId,
          },
        });

        const pointIds = pointHistories.map((p) => p.id);
        await tx.pointHistory.deleteMany({
          where: {
            id: { in: pointIds },
          },
        });

        return {
          updatedUser,
          updatedGroup,
          pointsRemoved: pointHistories.length,
          totalPointsRemoved: totalPointsToRemove,
        };
      });

      return {
        success: true,
        message: `Successfully removed ${result.pointsRemoved} point records totaling ${Math.abs(result.totalPointsRemoved)} points from group membership.`,
        data: {
          userPoints: result.updatedUser.point || 0,
          groupPoints: result.updatedGroup?.point,
          pointsRemoved: result.pointsRemoved,
          totalPointsRemoved: result.totalPointsRemoved,
        } as any,
      };
    } catch (error) {
      console.error("Error deleting points by joined group:", error);
      return {
        success: false,
        message: "Failed to delete group points",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete multiple point records for a user (bulk delete)
   */
  static async DeleteUserPoints(
    userId: string,
    options?: {
      courseId?: string;
      joinedGroupId?: string;
      actionType?: ActionType;
      beforeDate?: Date;
      maxPoints?: number;
      reason?: string;
    },
  ): Promise<PointResult> {
    try {
      const whereClause: any = { userId };

      if (options?.courseId) {
        whereClause.courseId = options.courseId;
      }

      if (options?.joinedGroupId) {
        whereClause.joinedGroupId = options.joinedGroupId;
      }

      if (options?.actionType) {
        whereClause.reason = {
          contains: options.actionType,
        };
      }

      if (options?.beforeDate) {
        whereClause.createdAt = {
          lt: options.beforeDate,
        };
      }

      const pointHistories = await prisma.pointHistory.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" },
      });

      if (pointHistories.length === 0) {
        return {
          success: false,
          message: "No point records found to delete",
        };
      }

      const pointsToDelete = options?.maxPoints
        ? pointHistories.slice(0, options.maxPoints)
        : pointHistories;

      const totalPointsToRemove = pointsToDelete.reduce(
        (sum, record) => sum + record.point,
        0,
      );

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { point: true },
        });

        const currentUserPoints = user?.point || 0;
        const newUserPoints = currentUserPoints - totalPointsToRemove;

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            point: newUserPoints,
          },
        });

        let updatedCourse = null;
        if (options?.courseId) {
          const course = await tx.course.findUnique({
            where: { id: options.courseId },
          });

          if (course) {
            const currentCoursePoints = course.point || 0;
            updatedCourse = await tx.course.update({
              where: { id: options.courseId },
              data: {
                point: currentCoursePoints - totalPointsToRemove,
              },
            });
          }
        }

        let updatedGroup = null;
        if (options?.joinedGroupId) {
          const joinedGroup = await tx.joinedGroup.findFirst({
            where: {
              studentId: userId,
              id: options.joinedGroupId,
            },
          });

          if (joinedGroup) {
            const currentGroupPoints = joinedGroup.point || 0;
            updatedGroup = await tx.joinedGroup.update({
              where: { id: joinedGroup.id },
              data: {
                point: currentGroupPoints - totalPointsToRemove,
              },
            });
          }
        }

        await tx.pointHistory.create({
          data: {
            userId,
            point: -totalPointsToRemove,
            reason:
              options?.reason ||
              `Bulk reversal: Removed ${pointsToDelete.length} point records`,
            courseId: options?.courseId,
            joinedGroupId: options?.joinedGroupId,
          },
        });

        const pointIds = pointsToDelete.map((p) => p.id);
        await tx.pointHistory.deleteMany({
          where: {
            id: { in: pointIds },
          },
        });

        return {
          updatedUser,
          updatedCourse,
          updatedGroup,
          pointsRemoved: pointsToDelete.length,
          totalPointsRemoved: totalPointsToRemove,
        };
      });

      return {
        success: true,
        message: `Successfully removed ${result.pointsRemoved} point records totaling ${Math.abs(result.totalPointsRemoved)} points.`,
        data: {
          userPoints: result.updatedUser.point || 0,
          coursePoints: result.updatedCourse?.point,
          groupPoints: result.updatedGroup?.point,
          pointsRemoved: result.pointsRemoved,
          totalPointsRemoved: result.totalPointsRemoved,
        } as any,
      };
    } catch (error) {
      console.error("Error deleting user points:", error);
      return {
        success: false,
        message: "Failed to delete user points",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}