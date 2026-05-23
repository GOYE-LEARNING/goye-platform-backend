import {
  Controller,
  Get,
  Path,
  Post,
  Query,
  Request,
  Route,
  Security,
  Tags,
} from "tsoa";
import prisma from "../db";
import { GrowthService } from "../services/growthService";
import {
  ActionType,
  GamificationService,
} from "../services/gamificationService";

@Tags("Levels and Badges Controller")
@Route("growth")
export class LevelSystem extends Controller {
  @Security("bearerAuth")
  @Post("/start-journey")
  public async StartJourney(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    try {
      if (!userId) {
        this.setStatus(401);
        return {
          message: "User Not authorized.",
        };
      }

      // Check if user already has a progress record
      const existingProgress = await prisma.progress.findFirst({
        where: {
          userId,
          startedJourney: true,
        },
      });

      if (existingProgress) {
        this.setStatus(400);
        return {
          message: "You have already started your journey!",
          data: existingProgress,
        };
      }

      // Now let the user start his journey
      const startJourney = await prisma.progress.create({
        data: {
          userId,
          startedJourney: true,
          progressBar: 0,
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      // Award XP for starting the journey (bonus points)
      const gamificationResult =
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.COURSE_ENROLLMENT, // Using enrollment as starting journey bonus
        );

      // Create achievement message
      const achievementResult = await GrowthService.AchievementMessage({
        message_title: "Christian Cadet",
        message_content: `${startJourney.user.first_name} you just joined the rest of the soldiers to join the army`,
        point: 10,
        progress_message: "",
        userId,
        badge: "CADET_BADGE",
        progressId: startJourney.id,
      });

      // Check if achievement was created successfully
      if (achievementResult.error) {
        console.error("Achievement creation failed:", achievementResult.error);
        // Still return success for journey but with achievement error
        this.setStatus(200);
        return {
          message:
            "Journey created successfully, but achievement creation failed",
          data: startJourney,
          achievementError: achievementResult.error,
          gamification: {
            pointsEarned: gamificationResult.data?.pointsAdded,
            leveledUp: gamificationResult.data?.leveledUp,
            newLevel: gamificationResult.data?.newLevel,
          },
        };
      }

      this.setStatus(200);
      return {
        message:
          "Journey created successfully! Welcome to your spiritual growth path! 🎉",
        data: startJourney,
        achievementMessage: achievementResult.data || achievementResult,
        gamification: {
          pointsEarned: gamificationResult.data?.pointsAdded,
          leveledUp: gamificationResult.data?.leveledUp,
          newLevel: gamificationResult.data?.newLevel,
          badgesEarned: gamificationResult.data?.badgesEarned,
        },
      };
    } catch (error) {
      console.error("Error in StartJourney:", error);
      this.setStatus(500);
      return {
        message: "An error occurred while starting your journey",
        error: error instanceof Error ? error.message : error,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/check-journey-status")
  public async CheckJourneyStatus(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    const progressId = req.progressId;
    try {
      if (!userId) {
        this.setStatus(401);
        return {
          message: "User Not authorized.",
        };
      }

      const checkJourney = await prisma.progress.findUnique({
        where: {
          id: progressId,
          userId,
        },
        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
              point: true,
              level: true,
            },
          },
          badges_and_levels: {
            include: {
              badges: true,
              achievement: true,
            },
          },
          achivement: true,
          pointHistory: {
            take: 10,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!checkJourney) {
        this.setStatus(404);
        return {
          message: "Journey not found. Please start your journey first.",
        };
      }

      // Calculate total XP
      const totalXP = checkJourney.user?.point || 0;
      const levelInfo = GamificationService.calculateLevel(totalXP);

      this.setStatus(200);
      return {
        message: "Status Fetched Successfully",
        data: {
          journey: checkJourney,
          status: checkJourney.startedJourney,
          progress: {
            totalXP,
            currentLevel: levelInfo.level,
            currentLevelName: levelInfo.name,
            nextLevelXP: levelInfo.nextLevelXP,
            progressToNextLevel: levelInfo.progressToNext,
          },
          badgesCount: checkJourney.badges_and_levels.reduce(
            (sum, bl) => sum + bl.badges.length,
            0,
          ),
          achievementsCount: checkJourney.achivement.length,
          recentActivity: checkJourney.pointHistory.map((h) => ({
            reason: h.reason,
            points: h.point,
            date: h.createdAt,
          })),
        },
      };
    } catch (error) {
      console.error("Error in CheckJourneyStatus:", error);
      this.setStatus(500);
      return {
        message: "An error occurred while fetching the status",
        error: error instanceof Error ? error.message : error,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-achievement")
  public async FetchAchievement(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    try {
      if (!userId) {
        this.setStatus(401);
        return {
          message: "User is unauthorized",
        };
      }

      const achievements = await prisma.achievement.findMany({
        where: {
          userId,
        },
        include: {
          badge: {
            include: {
              achievement: true,
            },
          },
          badges_and_levels: {
            include: {
              badges: true,
            },
          },
          progress: true,
          course: {
            select: {
              course_title: true,
            },
          },
          group: {
            select: {
              group_title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Get user's current level
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { point: true, level: true },
      });

      const levelInfo = GamificationService.calculateLevel(user?.point || 0);

      this.setStatus(200);
      return {
        message: "Achievements fetched successfully",
        data: {
          achievements,
          summary: {
            totalAchievements: achievements.length,
            totalBadges: achievements.reduce(
              (sum, a) => sum + (a.badge?.length || 0),
              0,
            ),
            currentLevel: levelInfo.level,
            currentLevelName: levelInfo.name,
            totalXP: user?.point || 0,
            nextLevelXP: levelInfo.nextLevelXP,
            progressToNextLevel: levelInfo.progressToNext,
          },
        },
      };
    } catch (error) {
      console.error("Error in FetchAchievement:", error);
      this.setStatus(500);
      return {
        message: "An error occurred while fetching achievements",
        error: error instanceof Error ? error.message : error,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-growth-user")
  public async FetchGrowth(
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id;
    const progressId = req.progressId
    try {
      if (!userId) {
        this.setStatus(401);
        return {
          message: "User Not authorized.",
        };
      }

      const fetchGrowth = await prisma.progress.findUnique({
        where: {
          id: progressId,
          userId,
        },
        include: {
          badges_and_levels: {
            include: {
              badges: {
                include: {
                  achievement: true,
                },
              },
              achievement: true,
            },
          },
          achivement: {
            include: {
              badge: true,
            },
          },
          user: {
            select: {
              first_name: true,
              last_name: true,
              point: true,
              level: true,
            },
          },
          courses: {
            select: {
              course_title: true,
              point: true,
            },
          },
          pointHistory: {
            take: 20,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!fetchGrowth) {
        this.setStatus(404);
        return {
          message: "Growth record not found. Please start your journey.",
        };
      }

      // Calculate total badges
      const totalBadges = fetchGrowth.badges_and_levels.reduce(
        (sum, bl) => sum + bl.badges.length,
        0,
      );

      // Calculate completed courses
      const completedCourses = fetchGrowth.courses.filter(
        (c) => c.point && c.point > 0,
      ).length;

      // Get level info
      const levelInfo = GamificationService.calculateLevel(
        fetchGrowth.user?.point || 0,
      );

      // Group achievements by type
      const achievements = {
        courseCompletions: fetchGrowth.achivement.filter(
          (a) => a.courseId !== null,
        ),
        groupAchievements: fetchGrowth.achivement.filter(
          (a) => a.groupId !== null,
        ),
        badges: fetchGrowth.badges_and_levels.flatMap((bl) => bl.badges),
        levelProgress: levelInfo,
      };

      this.setStatus(200);
      return {
        message: "Growth data fetched successfully",
        data: {
          user: {
            name: `${fetchGrowth.user?.first_name} ${fetchGrowth.user?.last_name}`,
            totalXP: fetchGrowth.user?.point || 0,
            currentLevel: fetchGrowth.user?.level || levelInfo.name,
            levelNumber: levelInfo.level,
            nextLevelXP: levelInfo.nextLevelXP,
            progressToNextLevel: levelInfo.progressToNext,
          },
          journey: {
            startedAt: fetchGrowth.createdAt,
            progressBar: fetchGrowth.progressBar,
            startedJourney: fetchGrowth.startedJourney,
          },
          stats: {
            totalBadges,
            totalAchievements: fetchGrowth.achivement.length,
            completedCourses,
            totalPoints: fetchGrowth.user?.point || 0,
            badgesAndLevels: fetchGrowth.badges_and_levels.length,
          },
          achievements,
          recentActivity: fetchGrowth.pointHistory.map((h) => ({
            action: h.reason,
            points: h.point,
            date: h.createdAt,
          })),
        },
      };
    } catch (error) {
      console.error("Error in FetchGrowth:", error);
      this.setStatus(500);
      return {
        message: "An error occurred while fetching user spiritual growth",
        error: error instanceof Error ? error.message : error,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/leaderboard")
  public async GetLeaderboard(
    @Request() req: any,
    @Query() type?: string,
    @Query() id?: string,
    @Query() limit: number = 10,
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      let leaderboard;

      if (type === "course" && id) {
        // Course leaderboard
        leaderboard = await GamificationService.GetCourseLeaderboard(id, 20);
      } else if (type === "group" && id) {
        // Group leaderboard
        leaderboard = await GamificationService.GetGroupLeaderboard(id, 20);
      } else {
        // Global leaderboard
        const topUsers = await prisma.user.findMany({
          where: {
            point: { gt: 0 },
          },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            user_pic: true,
            point: true,
            level: true,
          },
          orderBy: { point: "desc" },
          take: 50,
        });

        leaderboard = {
          success: true,
          data: topUsers.map((user, index) => ({
            rank: index + 1,
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            avatar: user.user_pic,
            totalXP: user.point || 0,
            level: user.level || "Seeker",
          })),
        };
      }

      // Get current user's rank
      let userRank = null;
      if (userId) {
        const allUsers = await prisma.user.findMany({
          where: { point: { gt: 0 } },
          orderBy: { point: "desc" },
          select: { id: true, point: true },
        });

        const rank = allUsers.findIndex((u) => u.id === userId) + 1;
        const userPoints = allUsers.find((u) => u.id === userId)?.point || 0;

        userRank = {
          rank: rank > 0 ? rank : null,
          totalXP: userPoints,
        };
      }

      this.setStatus(200);
      return {
        message: "Leaderboard fetched successfully",
        data: leaderboard.data || leaderboard,
        userRank,
      };
    } catch (error) {
      console.error("Error in GetLeaderboard:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch leaderboard",
        error: error instanceof Error ? error.message : error,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/user-summary")
  public async GetUserSummary(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    try {
      if (!userId) {
        this.setStatus(401);
        return { message: "User not authorized" };
      }

      const summary = await GamificationService.GetUserPointsSummary(userId);
      const dashboard = await GamificationService.getUserDashboard(userId);

      this.setStatus(200);
      return {
        message: "User summary fetched successfully",
        data: {
          points: summary.data,
          dashboard: dashboard.data,
        },
      };
    } catch (error) {
      console.error("Error in GetUserSummary:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch user summary",
        error: error instanceof Error ? error.message : error,
      };
    }
  }
}
