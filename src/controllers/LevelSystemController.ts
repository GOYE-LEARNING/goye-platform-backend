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
import {
  CacheKeys,
  TTL,
  updateDataWithRedis,
  useCacheAside,
} from "../utils/redis";

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
        return { message: "User Not authorized." };
      }

      const existingProgress = await prisma.progress.findFirst({
        where: { userId, startedJourney: true },
      });
      if (existingProgress) {
        this.setStatus(400);
        return {
          message: "You have already started your journey!",
          data: existingProgress,
        };
      }

      const startJourney = await prisma.progress.create({
        data: { userId, startedJourney: true, progressBar: 0 },
        include: {
          user: { select: { id: true, first_name: true, last_name: true } },
        },
      });

      const gamificationResult =
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.COURSE_ENROLLMENT,
        );

      const achievementResult = await GrowthService.AchievementMessage({
        message_title: "Christian Cadet",
        message_content: `${startJourney.user.first_name} you just joined the rest of the soldiers to join the army`,
        point: 10,
        progress_message: "",
        userId,
        badge: "CADET_BADGE",
        progressId: startJourney.id,
      });

      // Starting a journey awards points and a badge, which makes every
      // gamification view of this user stale at once.
      await updateDataWithRedis(userId, ["gamification"]);

      if (achievementResult.error) {
        console.error("Achievement creation failed:", achievementResult.error);
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
    // ✅ FIX: read progress_id from cookies, not req.progressId
    let progressId = req.cookies?.progress_id;

    try {
      if (!userId) {
        this.setStatus(401);
        return { message: "User Not authorized." };
      }

      const cached = await useCacheAside(
        CacheKeys.userJourneyStatus(userId),
        TTL.medium,
        async () => ({ payload: await this.computeJourneyStatus(userId, progressId) }),
      );

      if (!cached.payload) {
        this.setStatus(404);
        return {
          message: "Journey not found. Please start your journey first.",
        };
      }

      this.setStatus(200);
      return {
        message: "Status Fetched Successfully",
        data: cached.payload,
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

  /**
   * The DB half of CheckJourneyStatus, split out so the result can be cached.
   * Returns null when the user has no journey yet; the caller turns that into
   * the 404. Wrapped by the caller rather than returned bare because a bare
   * null is not cacheable, and "no journey" is exactly the answer we'd want to
   * stop re-querying for.
   */
  private async computeJourneyStatus(userId: string, progressId?: string) {
    {
      let checkJourney = null;

      if (progressId) {
        checkJourney = await prisma.progress.findUnique({
          where: { id: progressId, userId },
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                point: true,
                level: true,
              },
            },
            badges_and_levels: { include: { badges: true, achievement: true } },
            achivement: true,
            pointHistory: { take: 10, orderBy: { createdAt: "desc" } },
          },
        });
      }

      // Fallback to userId if not found by cookie ID
      if (!checkJourney) {
        checkJourney = await prisma.progress.findFirst({
          where: { userId },
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                point: true,
                level: true,
              },
            },
            badges_and_levels: { include: { badges: true, achievement: true } },
            achivement: true,
            pointHistory: { take: 10, orderBy: { createdAt: "desc" } },
          },
        });
      }

      if (!checkJourney) return null;

      const totalXP = checkJourney.user?.point || 0;
      const levelInfo = GamificationService.calculateLevel(totalXP);

      return {
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
        return { message: "User is unauthorized" };
      }

      // Five-table join plus a second user lookup, on a page students open
      // constantly to admire their badges.
      const { achievements, user } = await useCacheAside(
        CacheKeys.userAchievements(userId),
        TTL.medium,
        async () => ({
          achievements: await prisma.achievement.findMany({
            where: { userId },
            include: {
              badge: { include: { achievement: true } },
              badges_and_levels: { include: { badges: true } },
              progress: true,
              course: { select: { course_title: true } },
              group: { select: { group_title: true } },
            },
            orderBy: { createdAt: "desc" },
          }),
          user: await prisma.user.findUnique({
            where: { id: userId },
            select: { point: true, level: true },
          }),
        }),
      );

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
  public async FetchGrowth(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    // ✅ FIX: read progress_id from cookies, not req.progressId
    let progressId = req.cookies?.progress_id;

    try {
      if (!userId) {
        this.setStatus(401);
        return { message: "User Not authorized." };
      }

      // The single most expensive read on the student dashboard: a deep
      // progress join, then three more enrollment queries on top of it.
      const data = await useCacheAside(
        CacheKeys.userGrowth(userId),
        TTL.medium,
        () => this.computeGrowth(userId, progressId, req),
      );

      this.setStatus(200);
      return {
        message: "Growth data fetched successfully",
        data,
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

  /**
   * The DB half of FetchGrowth, split out so the result can be cached.
   *
   * Keeps the auto-repair (create a Progress row when one is missing) inside
   * the cached path: it only runs on a miss, and once a row exists the cached
   * payload means we never re-check. The cookie it sets is likewise only
   * written on the request that actually creates the row — which is what the
   * uncached version did too.
   */
  private async computeGrowth(userId: string, progressId: string | undefined, req: any) {
    {
      let fetchGrowth = null;

      if (progressId) {
        fetchGrowth = await prisma.progress.findFirst({
          where: { id: progressId, userId },
          include: {
            badges_and_levels: {
              include: {
                badges: { include: { achievement: true } },
                achievement: true,
              },
            },
            achivement: { include: { badge: true } },
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
                id: true,
              },
            },
            pointHistory: { take: 20, orderBy: { createdAt: "desc" } },
          },
        });
      }

      // Fallback to userId if not found by cookie ID
      if (!fetchGrowth) {
        fetchGrowth = await prisma.progress.findFirst({
          where: { userId },
          include: {
            badges_and_levels: {
              include: {
                badges: { include: { achievement: true } },
                achievement: true,
              },
            },
            achivement: { include: { badge: true } },
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
                id: true,
              },
            },
            pointHistory: { take: 20, orderBy: { createdAt: "desc" } },
          },
        });
      }

      // If still not found, create one (auto-repair)
      if (!fetchGrowth) {
        fetchGrowth = await prisma.progress.create({
          data: { userId, startedJourney: true, progressBar: 0 },
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                point: true,
                level: true,
              },
            },
          },
        });
        // Set the cookie so future requests have it
        const isProduction = process.env.NODE_ENV === "production";
        req.res.cookie("progress_id", fetchGrowth.id, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      // ✅ FIX: Get completed courses count using enrollment.status
      const completedEnrollments = await prisma.enrollment.findMany({
        where: {
          userId,
          status: "COMPLETED",
        },
        select: {
          courseId: true,
          course: {
            select: {
              course_title: true,
              point: true,
            },
          },
        },
      });

      const completedCourses = completedEnrollments.length;
      const completedCoursesList = completedEnrollments.map((e) => ({
        courseId: e.courseId,
        course_title: e.course.course_title,
        points: e.course.point,
      }));

      // Get in-progress courses count
      const inProgressCourses = await prisma.enrollment.count({
        where: {
          userId,
          status: "IN_PROGRESS",
        },
      });

      // Get enrolled courses count
      const enrolledCourses = await prisma.enrollment.count({
        where: {
          userId,
          status: { in: ["ENROLLED", "IN_PROGRESS"] },
        },
      });

      // The auto-repair branch above creates the Progress row with only the
      // `user` relation included, so on a brand-new account these relations
      // are undefined rather than empty — reading them unguarded threw and
      // turned a first-time student's dashboard into a 500. Defaulting to []
      // gives a new user the empty state they should have seen all along.
      const badgesAndLevels = fetchGrowth.badges_and_levels ?? [];
      const achievementList = fetchGrowth.achivement ?? [];

      const totalBadges = badgesAndLevels.reduce(
        (sum, bl) => sum + bl.badges.length,
        0,
      );

      const levelInfo = GamificationService.calculateLevel(
        fetchGrowth.user?.point || 0,
      );

      return {
          user: {
            name: `${fetchGrowth.user?.first_name} ${fetchGrowth.user?.last_name}`,
            totalXP: fetchGrowth.user?.point || 0,
            currentLevel: fetchGrowth.user?.level || levelInfo.name,
            levelNumber: levelInfo.level,
            nextLevelXP: levelInfo.nextLevelXP,
            progressToNextLevel: levelInfo.progressToNext,
            currentLevelXP: levelInfo.currentLevelXP, // new
            xpForCurrentLevel: levelInfo.xpForCurrentLevel, // new
          },
          journey: {
            startedAt: fetchGrowth.createdAt,
            progressBar: fetchGrowth.progressBar,
            startedJourney: fetchGrowth.startedJourney,
          },
          stats: {
            totalBadges,
            totalAchievements: achievementList.length,
            completedCourses, // ✅ Now using enrollment.status
            inProgressCourses, // ✅ Added
            enrolledCourses, // ✅ Added
            totalPoints: fetchGrowth.user?.point || 0,
            badgesAndLevels: badgesAndLevels.length,
          },
          courses: {
            completed: completedCoursesList,
            summary: {
              totalCompleted: completedCourses,
              totalInProgress: inProgressCourses,
              totalEnrolled: enrolledCourses,
            },
          },
          achievements: {
            courseCompletions: achievementList.filter(
              (a) => a.courseId !== null,
            ),
            groupAchievements: achievementList.filter(
              (a) => a.groupId !== null,
            ),
            badges: badgesAndLevels.flatMap((bl) => bl.badges),
            levelProgress: levelInfo,
          },
          recentActivity: (fetchGrowth.pointHistory ?? []).map((h) => ({
            action: h.reason,
            points: h.point,
            date: h.createdAt,
          })),
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
      // The board itself is identical for everyone, so it's keyed on the
      // query rather than the caller.
      const scope = `growth:${type || "global"}:${id || "none"}`;
      const leaderboard = await useCacheAside(
        CacheKeys.leaderboard(scope),
        TTL.medium,
        async () => {
          if (type === "course" && id) {
            return GamificationService.GetCourseLeaderboard(id, 20);
          }
          if (type === "group" && id) {
            return GamificationService.GetGroupLeaderboard(id, 20);
          }
          const topUsers = await prisma.user.findMany({
            where: { point: { gt: 0 } },
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
          return {
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
        },
      );

      let userRank = null;
      if (userId) {
        // This was an unbounded findMany over every point-bearing user on the
        // platform, run once per request, purely to locate one person's index
        // in the list — the single worst query in this controller, and it gets
        // worse with every user who signs up.
        //
        // The table is the same for everybody, so it's fetched once and shared;
        // the per-user part is just an index lookup in memory. Invalidated
        // whenever points change (the "gamification" scope), with a short TTL
        // as the backstop since rank is the kind of number people watch move.
        const rankTable = await useCacheAside(
          CacheKeys.userRankTable(),
          TTL.short,
          () =>
            prisma.user.findMany({
              where: { point: { gt: 0 } },
              orderBy: { point: "desc" },
              select: { id: true, point: true },
            }),
        );
        const rank = rankTable.findIndex((u) => u.id === userId) + 1;
        const userPoints = rankTable.find((u) => u.id === userId)?.point || 0;
        userRank = { rank: rank > 0 ? rank : null, totalXP: userPoints };
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
      const data = await useCacheAside(
        CacheKeys.userSummary(userId),
        TTL.medium,
        async () => {
          // Two independent service calls, each with its own queries — run in
          // parallel now that they're behind a cache miss rather than on
          // every request.
          const [summary, dashboard] = await Promise.all([
            GamificationService.GetUserPointsSummary(userId),
            GamificationService.getUserDashboard(userId),
          ]);
          return { points: summary.data, dashboard: dashboard.data };
        },
      );

      this.setStatus(200);
      return {
        message: "User summary fetched successfully",
        data,
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
