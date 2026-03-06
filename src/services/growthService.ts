import prisma from "../db";

export class GrowthService {  // Fixed spelling
  static async AchievementMessage(data: {  // Fixed spelling
    message_title: string;
    message_content: string;
    point?: number;
    progress_message?: string;
    userId: string;
    groupId?: string;
    courseId?: string;
    badge?: string
  }) {
    try {
      if (!data.userId) {
        return {
          error: "User ID is required",
        };
      }

      const achievementMessage = {
        title: data.message_title,
        content: data.message_content,
        point: data.point,
        badges: data.badge,
        progressMessage: data.progress_message,
      };

      const achievement = await prisma.achievement.create({
        data: {
          ...achievementMessage,
          badge: {
            create: {
              badges:  "CADET_BADGE",
              userId: data.userId,
            },
          },
          badges_and_levels: {
            create: {
              level: 'LEVEL1_SEEKER',
              userId: data.userId
            }
          }
        },
      });

      return {
        message: "Success sending Message",
        data: achievement,
      };
    } catch (error) {
      return {
        error,
      };
    }
  }
}