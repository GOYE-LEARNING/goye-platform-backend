import {
  Controller,
  Get,
  Route,
  Tags,
  Security,
  Request,
  Path,
  Query,
} from "tsoa";
import prisma from "../db";
import {
  ActionType,
  GamificationService,
} from "../services/gamificationService";

@Route("gamification")
@Tags("Gamification & Leaderboard APIs")
export class LeaderBoardAndGamificationController extends Controller {
  
  /**
   * Get user's complete gamification dashboard
   */
  @Security("bearerAuth")
  @Get("/dashboard")
  public async GetDashboard(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const dashboard = await GamificationService.getUserDashboard(userId);
      
      if (!dashboard.success) {
        this.setStatus(500);
        return dashboard;
      }

      this.setStatus(200);
      return dashboard;
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch dashboard",
        error: error.message,
      };
    }
  }

  /**
   * Get user's current level and XP
   */
  @Security("bearerAuth")
  @Get("/level")
  public async GetCurrentLevel(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { point: true, level: true },
      });

      const totalXP = user?.point || 0;
      const levelInfo = GamificationService.calculateLevel(totalXP);

      // Get all levels for reference
      const levels = [
        { level: 1, name: "Seeker", requiredXP: 0, nextLevelXP: 500 },
        { level: 2, name: "Learner", requiredXP: 500, nextLevelXP: 1500 },
        { level: 3, name: "Disciple", requiredXP: 1500, nextLevelXP: 3500 },
        { level: 4, name: "Ambassador", requiredXP: 3500, nextLevelXP: 7500 },
        { level: 5, name: "Mentor", requiredXP: 7500, nextLevelXP: null },
      ];

      this.setStatus(200);
      return {
        success: true,
        data: {
          current_level: levelInfo.level,
          current_level_name: levelInfo.name,
          total_xp: totalXP,
          xp_needed_for_next_level: levelInfo.nextLevelXP,
          progress_to_next_level: levelInfo.progressToNext,
          levels: levels,
          next_level_name: levelInfo.level < 5 ? levels[levelInfo.level]?.name : "Max Level",
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch level info",
        error: error.message,
      };
    }
  }

  /**
   * Get leaderboard (global, course-specific, or group-specific)
   */
  @Get("/leaderboard")
  public async GetLeaderboard(
    @Query() type?: "global" | "course" | "group",
    @Query() id?: string,
    @Query() limit: number = 20
  ): Promise<any> {
    try {
      let leaderboard;
      let title = "Global Leaderboard";

      if (type === "course" && id) {
        // Course leaderboard
        const result = await GamificationService.GetCourseLeaderboard(id, limit);
        leaderboard = result.data;
        title = "Course Leaderboard";
        
        // Get course name
        const course = await prisma.course.findUnique({
          where: { id },
          select: { course_title: true },
        });
        if (course) {
          title = `Leaderboard: ${course.course_title}`;
        }
      } 
      else if (type === "group" && id) {
        // Group leaderboard
        const result = await GamificationService.GetGroupLeaderboard(id, limit);
        leaderboard = result.data;
        title = "Group Leaderboard";
        
        // Get group name
        const group = await prisma.group.findUnique({
          where: { id },
          select: { group_title: true },
        });
        if (group) {
          title = `Leaderboard: ${group.group_title}`;
        }
      } 
      else {
        // Global leaderboard - top users by XP
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
            enrollment: {
              where: { status: "COMPLETED" },
              select: { id: true },
            },
          },
          orderBy: { point: 'desc' },
          take: limit,
        });

        leaderboard = topUsers.map((user, index) => {
          const levelInfo = GamificationService.calculateLevel(user.point || 0);
          return {
            rank: index + 1,
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            avatar: user.user_pic,
            total_xp: user.point || 0,
            level: user.level || levelInfo.name,
            level_number: levelInfo.level,
            courses_completed: user.enrollment.length,
          };
        });
      }

      this.setStatus(200);
      return {
        success: true,
        message: `${title} fetched successfully`,
        data: {
          title,
          type: type || "global",
          id: id || null,
          leaderboard,
          total: leaderboard?.length || 0,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch leaderboard",
        error: error.message,
      };
    }
  }

  /**
   * Get user's rank on leaderboard
   */
  @Security("bearerAuth")
  @Get("/my-rank")
  public async GetMyRank(
    @Request() req: any,
    @Query() type?: "global" | "course",
    @Query() id?: string
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      let rank = null;
      let totalUsers = 0;
      let userXP = 0;

      if (type === "course" && id) {
        // Course rank
        const enrollments = await prisma.enrollment.findMany({
          where: { courseId: id },
          orderBy: { score: 'desc' },
          select: { userId: true, score: true },
        });

        totalUsers = enrollments.length;
        const userIndex = enrollments.findIndex(e => e.userId === userId);
        rank = userIndex !== -1 ? userIndex + 1 : null;
        
        const userEnrollment = enrollments.find(e => e.userId === userId);
        userXP = userEnrollment?.score || 0;
      } 
      else {
        // Global rank
        const allUsers = await prisma.user.findMany({
          where: { point: { gt: 0 } },
          orderBy: { point: 'desc' },
          select: { id: true, point: true },
        });

        totalUsers = allUsers.length;
        const userIndex = allUsers.findIndex(u => u.id === userId);
        rank = userIndex !== -1 ? userIndex + 1 : null;
        
        const userData = allUsers.find(u => u.id === userId);
        userXP = userData?.point || 0;
      }

      this.setStatus(200);
      return {
        success: true,
        data: {
          rank: rank,
          total_users: totalUsers,
          total_xp: userXP,
          percentile: rank ? Math.round((1 - rank / totalUsers) * 100) : 0,
          message: rank ? `You are rank #${rank} out of ${totalUsers} users` : "Not ranked yet",
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch rank",
        error: error.message,
      };
    }
  }

  /**
   * Get all available badges and achievements
   */
  @Get("/badges")
  public async GetAllBadges(@Query() earned?: boolean): Promise<any> {
    try {
      // Define all badges in the system
      const allBadges = [
        {
          id: "course_completion",
          name: "Course Completion Badge",
          description: "Completed a course",
          icon: "🏆",
          type: "COURSE_COMPLETION",
          requirement: "Complete any course",
        },
        {
          id: "mastery",
          name: "Mastery Badge",
          description: "Scored 80% or higher on a quiz",
          icon: "⭐",
          type: "MASTERY",
          requirement: "Score 80% or above on any quiz",
        },
        {
          id: "consistency",
          name: "Consistency Badge",
          description: "Maintained a 7-day learning streak",
          icon: "🔥",
          type: "CONSISTENCY",
          requirement: "Complete activities for 7 consecutive days",
        },
        {
          id: "milestone",
          name: "Milestone Badge",
          description: "Completed 5 or more courses",
          icon: "🎯",
          type: "MILESTONE",
          requirement: "Complete 5+ courses",
        },
        {
          id: "community",
          name: "Community Badge",
          description: "Active community participation",
          icon: "💬",
          type: "COMMUNITY",
          requirement: "Participate in 10+ discussions",
        },
        {
          id: "cadet",
          name: "Christian Cadet",
          description: "Started your spiritual journey",
          icon: "🛡️",
          type: "CADET_BADGE",
          requirement: "Start your journey",
        },
      ];

      // If we need to check which badges are earned by user (requires auth)
      if (earned && typeof earned === 'boolean') {
        // This would need userId, so we'd need auth
        return {
          success: false,
          message: "Please authenticate to see earned badges",
        };
      }

      this.setStatus(200);
      return {
        success: true,
        data: {
          total_badges: allBadges.length,
          badges: allBadges,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch badges",
        error: error.message,
      };
    }
  }

  /**
   * Get user's earned badges
   */
  @Security("bearerAuth")
  @Get("/my-badges")
  public async GetMyBadges(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const badges = await prisma.badges.findMany({
        where: { userId },
        include: {
          achievement: true,
          badgesAndLevelEarned: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      this.setStatus(200);
      return {
        success: true,
        data: {
          total_badges: badges.length,
          badges: badges.map(b => ({
            id: b.id,
            name: b.achievement?.title || b.badges,
            description: b.achievement?.content,
            type: b.badges,
            earned_at: b.createdAt,
          })),
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch badges",
        error: error.message,
      };
    }
  }

  /**
   * Get user's point history
   */
  @Security("bearerAuth")
  @Get("/point-history")
  public async GetPointHistory(
    @Request() req: any,
    @Query() limit: number = 20,
    @Query() offset: number = 0
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const history = await GamificationService.GetPointHistory(userId, limit, offset);

      this.setStatus(200);
      return history;
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch point history",
        error: error.message,
      };
    }
  }

  /**
   * Get organization leaderboard (for org admins)
   */
  @Security("bearerAuth")
  @Get("/organization-leaderboard")
  public async GetOrganizationLeaderboard(
    @Request() req: any,
    @Query() limit: number = 10
  ): Promise<any> {
    const orgId = req.org?.id;
    const userId = req.user?.id;

    if (!orgId && !userId) {
      this.setStatus(401);
      return { message: "Organization not found" };
    }

    try {
      // Get organization members
      const members = await prisma.user.findMany({
        where: {
          OR: [
            { organization: { some: { id: orgId } } },
            { Courses: { some: { organizationId: orgId } } },
          ],
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
        orderBy: { point: 'desc' },
        take: limit,
      });

      const totalXP = members.reduce((sum, m) => sum + (m.point || 0), 0);
      const totalCourses = members.reduce((sum, m) => sum + m.enrollment.length, 0);

      this.setStatus(200);
      return {
        success: true,
        data: {
          organization_id: orgId,
          stats: {
            total_members: members.length,
            total_xp: totalXP,
            total_courses_completed: totalCourses,
            average_xp: members.length > 0 ? Math.round(totalXP / members.length) : 0,
          },
          leaderboard: members.map((member, index) => ({
            rank: index + 1,
            id: member.id,
            name: `${member.first_name} ${member.last_name}`,
            avatar: member.user_pic,
            total_xp: member.point || 0,
            level: member.level || "Seeker",
            courses_completed: member.enrollment.length,
          })),
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch organization leaderboard",
        error: error.message,
      };
    }
  }

  /**
   * Get XP breakdown for a user
   */
  @Security("bearerAuth")
  @Get("/xp-breakdown")
  public async GetXPBreakdown(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      // Get point history grouped by reason
      const history = await prisma.pointHistory.findMany({
        where: { userId },
        select: { reason: true, point: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });

      // Group by action type
      const breakdown: Record<string, { total: number; count: number; actions: any[] }> = {};

      history.forEach(h => {
        const key = h.reason?.split(' ')[0] || 'Other';
        if (!breakdown[key]) {
          breakdown[key] = { total: 0, count: 0, actions: [] };
        }
        breakdown[key].total += h.point;
        breakdown[key].count += 1;
        breakdown[key].actions.push({
          reason: h.reason,
          points: h.point,
          date: h.createdAt,
        });
      });

      this.setStatus(200);
      return {
        success: true,
        data: {
          total_points: history.reduce((sum, h) => sum + h.point, 0),
          breakdown: Object.entries(breakdown).map(([key, value]) => ({
            category: key,
            total_points: value.total,
            count: value.count,
            average: value.total / value.count,
            recent_actions: value.actions.slice(0, 5),
          })),
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch XP breakdown",
        error: error.message,
      };
    }
  }

  /**
   * Get all levels and requirements
   */
  @Get("/levels")
  public async GetAllLevels(): Promise<any> {
    try {
      const levels = [
        {
          level: 1,
          name: "Seeker",
          required_xp: 0,
          xp_to_next: 500,
          description: "Starting your spiritual journey",
          icon: "🌱",
        },
        {
          level: 2,
          name: "Learner",
          required_xp: 500,
          xp_to_next: 1000,
          description: "Building foundational knowledge",
          icon: "📚",
        },
        {
          level: 3,
          name: "Disciple",
          required_xp: 1500,
          xp_to_next: 2000,
          description: "Deepening understanding and practice",
          icon: "🙏",
        },
        {
          level: 4,
          name: "Ambassador",
          required_xp: 3500,
          xp_to_next: 4000,
          description: "Sharing knowledge with others",
          icon: "🌟",
        },
        {
          level: 5,
          name: "Mentor",
          required_xp: 7500,
          xp_to_next: null,
          description: "Guiding others on their journey",
          icon: "👑",
        },
      ];

      this.setStatus(200);
      return {
        success: true,
        data: {
          total_levels: levels.length,
          max_xp: levels[levels.length - 1].required_xp,
          levels,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch levels",
        error: error.message,
      };
    }
  }
}