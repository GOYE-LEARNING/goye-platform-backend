import prisma from "../db";

export class GrowthServive {
  static async AchivementMessage(data: {
    message_title: string;
    message_content: string;
    point?: number;
    progress_message?: string;
    userId: string;
    groupId?: string;
    courseId?: string;
    badge?: string
  }) {
    //Let start with Sending message for the achievement
    try {
      const achievementMessage = {
        title: data.message_title,
        content: data.message_content,
        point: data.point,
        badges: data.badge,
        progressMessage: data.progress_message,
      };
      const achivement = await prisma.achievement.create({
        data: {
          ...achievementMessage,
          badge: {
            create: {
              badges: "CADET_BADGE",
            },
          },
        },
      });

      if (!data.userId) {
        return {
          message: "This user is unauthorized to view message",
        };
      }

      return {
        message: "Success sending Message",
        data: achivement,
      };
    } catch (error) {
      return {
        error,
      };
    }
  }
}
