import prisma from "../db";

export class GrowthService {
  static async AchievementMessage(data: {
    message_title: string;
    message_content: string;
    point?: number;
    progress_message?: string;
    userId: string;
    groupId?: string;
    courseId?: string;
    badge?: string;
    progressId: string;
  }) {
    try {
      if (!data.userId) {
        return {
          error: "User ID is required",
        };
      }

      // First, create the achievement
      const achievement = await prisma.achievement.create({
        data: {
          title: data.message_title,
          content: data.message_content,
          point: data.point || 0,
          progressMessage: data.progress_message,
          progress: {
            connect: {
                id: data.progressId
            }
          },
          // Connect to user if needed
          ...(data.userId && {
            user: {
              connect: { id: data.userId },
            },
          }),
          ...(data.courseId && {
            course: {
              connect: { id: data.courseId },
            },
          }),
          ...(data.groupId && {
            group: {
              connect: { id: data.groupId },
            },
          }),
        },
      });

      // Create badges_and_levels entry
      const badgesandLevels = await prisma.badgesAndLevelEarned.create({
        data: {
          level: "LEVEL1_SEEKER",
          user: {
            connect: { id: data.userId },
          },
          progress: {
            connect: {
                id: data.progressId
            }
          },
          achievement: {
            connect: { id: achievement.id },
          },
          ...(data.courseId && {
            course: {
              connect: { id: data.courseId },
            },
          }),
        },
      });

      // Then create the badge separately and connect it to the achievement
      if (data.badge) {
        await prisma.badges.create({
          data: {
            badges: "CADET_BADGE",
            badgesAndLevelEarned: {
              connect: {
                id: badgesandLevels.id,
              },
            },
            progress: {
              connect: {
                id: data.progressId,
              },
            },
            achievement: {
              connect: { id: achievement.id },
            },
            user: {
              connect: { id: data.userId },
            },
          },
        });
      }

      // Fetch the complete achievement with all relations
      const completeAchievement = await prisma.achievement.findUnique({
        where: { id: achievement.id },
        include: {
          badge: true,
          badges_and_levels: {
            include: {
              badges: true,
            },
          },
          user: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      return {
        message: "Success sending Message",
        data: completeAchievement,
      };
    } catch (error) {
      console.error("Achievement creation error:", error);
      return {
        error,
      };
    }
  }
}
