import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Request,
  Route,
  Security,
  Tags,
} from "tsoa";
import { CourseResponse, OrganizationDTO, User } from "../interface/interfaces";
import prisma from "../db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MediaService } from "../services/mediaServices";
import { SendEmail } from "../utils/sendmail";
import { PricingService } from "../services/pricingService";
import { TranslateText } from "../utils/ai_utils/translator";

enum OrgType {
  CHURCH,
  SCHOOL,
  CLUB,
  OTHER,
}

@Route("organizations")
@Tags("Organization Controllers")
export class OrganizationController extends Controller {
  @Post("/auth/create-organization")
  public async CreateOrganization(
    @Body() body: Omit<OrganizationDTO, "id">,
  ): Promise<any> {
    const orgTypeMap: Record<string, "CHURCH" | "SCHOOL" | "CLUB"> = {
      church: "CHURCH",
      school: "SCHOOL",
      club: "CLUB",
    };

    try {
      if (
        (body.church?.church_email &&
          body.church.church_email === body.user_email_address) ||
        (body.school?.school_email &&
          body.school.school_email === body.user_email_address)
      ) {
        return {
          errorType: "SAME_EMAIL_ISSUE",
          message:
            "Your personal information email address should not be the same as your organization email address.",
        };
      }

      const createOrganization = await prisma.organization.create({
        data: {
          organization_name: body.organization_name,
          organization_email: body.organization_email,
          lastActive: new Date(),
          organization_role: body.organization_role,
          organization_description: body.organization_description,
          organization_country: body.organization_country,
          organization_state: body.organization_state,
          organization_phone_number: body.organization_phone_number,
          organization_year: body.organization_year,
          organization_type: orgTypeMap[body.organization_type],
          language: body.language,
          languageCode: body.languageCode,

          // ✅ USER — mark as ORGANIZATION_OWNER
          user: {
            create: {
              first_name: body.user_first_name,
              last_name: body.user_last_name,
              email_address: body.user_email_address,
              country: body.user_country,
              state: body.user_state,
              phone_number: body.user_phone_number,
              role: "org_admin",
              form_type: "ORGANIZATION",
              level: "ORGANIZATION",
              userType: "ORGANIZATION_OWNER", // ✅ replaces old `invited: false`
            },
          },

          // ✅ CHURCH (only if sent)
          ...(body.church && {
            Church: {
              create: {
                church_min_name: body.church.church_ministry_name,
                church_ld_pastor: body.church.church_lead_pastor,
                church_role: body.church.church_leadership_role,
                church_email: body.church.church_email,
                church_address: body.church.church_address,
                church_logo: body.church.church_logo,
                church_website: body.church.church_website,
                church_weekly_service: body.church.church_weekly_service,
              },
            },
          }),

          // ✅ SCHOOL (only if sent)
          ...(body.school && {
            school: {
              create: {
                school_name: body.school.school_name,
                school_type: body.school.school_type,
                school_address: body.school.school_address,
                school_admin_name: body.school.school_admin_name,
                school_role: body.school.school_role,
                school_accreditation_number:
                  body.school.school_accreditation_number,
                school_document: body.school.school_document,
                school_email: body.school.school_email,
                school_website: body.school.school_website,
              },
            },
          }),

          // ✅ CLUB (only if sent)
          ...(body.club && {
            Club: {
              create: {
                club_name: body.club.club_name,
                club_type: body.club.club_type,
                club_leader_name: body.club.club_leader_name,
                club_description: body.club.club_description,
                club_document: body.club.club_document,
                club_meeting_frequency: body.club.club_meeting_frequency,
                club_parent_org: body.club.club_parent_org,
                club_role: body.club.club_role,
                club_social_link: body.club.club_social_link,
              },
            },
          }),
        },
        include: {
          user: true,
        },
      });

      // ✅ Create OrganizationMember record for the owner
      await prisma.organizationMember.create({
        data: {
          userId: createOrganization.user.id,
          organizationId: createOrganization.id,
          role: "org_admin",
          joinedVia: "CREATED",
          isActive: true,
        },
      });

      // Auto-generate settings for the organization
      await prisma.settings.create({
        data: {
          enable_push_notification: true,
          course_updates: true,
          event: true,
          achievement: true,
          daily_reminders: true,
          darkMode: false,
          email_notification: true,
          updatedAt: new Date(),
          userId: null,
          organizationId: createOrganization.id,
        },
      });

      await PricingService.GenerateNewPaymentForNewUser({
        userId: null,
        orgId: createOrganization.id,
        type: "ORGANIZATION",
      });

      this.setStatus(201);
      return {
        message: "Perfecto organization created successfully.",
        data: createOrganization,
      };
    } catch (error: any) {
      console.error(error);
      this.setStatus(500);
      return {
        message: "Organization creation failed.",
        error: error.message,
      };
    }
  }

  @Post("/auth/org/login")
  public async OrgLogin(
    @Request() req: any,
    @Body() credential: { org_email: string; org_password: string },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: {
          organization_email: credential.org_email,
        },
        include: {
          user: true,
        },
      });

      if (!organization) {
        this.setStatus(404);
        return {
          message: "Organization not found or invalid credentials",
        };
      }

      const unHashedPassword = await bcrypt.compare(
        credential.org_password,
        organization.organization_password,
      );

      if (!unHashedPassword) {
        this.setStatus(400);
        return {
          message: "Password is incorrect",
        };
      }

      const updateOrg = await prisma.organization.update({
        where: {
          id: organization.id,
        },
        data: {
          isOnline: true,
          lastActive: new Date(),
        },
      });

      const token = jwt.sign(
        {
          type: "ORGANIZATION",
          id: organization.user.id,
          userId: organization.user.id,
          organizationId: updateOrg.id,
          org_name: organization.organization_name,
          org_email: organization.organization_email,
          full_name: `${organization.user.first_name} ${organization.user.last_name}`,
          email: organization.user.email_address,
          updatedStatus: updateOrg.isOnline,
          // ✅ Include userType in token for middleware discrimination
          userType: organization.user.userType,
        },
        (process.env.BEARERAUTH_SECRET! as string) || "secret-key",
        { expiresIn: "7d" },
      );

      if (req.res) {
        req.res.cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      this.setStatus(200);
      return {
        message: "Organization login successful",
        token,
        organization: {
          id: organization.id,
          organization_name: organization.organization_name,
          organization_email: organization.organization_email,
          user: {
            id: organization.user.id,
            first_name: organization.user.first_name,
            last_name: organization.user.last_name,
            userType: organization.user.userType, // ✅ expose to client
          },
        },
      };
    } catch (error: any) {
      console.error(error);
      this.setStatus(500);
      return {
        message: "Organization login failed",
        error: error.message,
      };
    }
  }

  // Add this to your OrganizationController class

@Security("bearerAuth")
@Get("/user-details/{userId}")
public async GetUserDetails(
  @Path() userId: string,
  @Request() req: any,
): Promise<any> {
  try {
    // Get the requesting user's organization
    const requestingOrgId = req.org?.id;
    
    if (!requestingOrgId) {
      this.setStatus(401);
      return {
        success: false,
        message: "Unauthorized - Organization not found",
      };
    }

    // Check if the user belongs to this organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: userId,
        organizationId: requestingOrgId,
        isActive: true,
      },
    });

    if (!membership) {
      this.setStatus(403);
      return {
        success: false,
        message: "User does not belong to this organization",
      };
    }

    // Get user details with comprehensive information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        // Basic user info is included by default
        organizationMemberships: {
          where: {
            organizationId: requestingOrgId,
          },
          select: {
            role: true,
            joinedAt: true,
            joinedVia: true,
            isActive: true,
          },
        },
        // Get courses the user is enrolled in (as student)
        enrollment: {
          include: {
            course: {
              select: {
                id: true,
                course_title: true,
                course_description: true,
                course_image: true,
                course_level: true,
                createdBy: true,
                organizationName: true,
                module: {
                  select: {
                    id: true,
                    module_title: true,
                    lesson: {
                      select: {
                        id: true,
                        lesson_title: true,
                        duration: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        // Get courses the user has created (as tutor/instructor)
        Courses: {
          select: {
            id: true,
            course_title: true,
            course_description: true,
            course_image: true,
            course_level: true,
            organizationName: true,
            _count: {
              select: {
                enrollment: true,
              },
            },
          },
        },
        // Get achievements
        achievement: {
          select: {
            id: true,
            title: true,
            content: true,
            point: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
        // Get badges
        badges: {
          select: {
            id: true,
            badges: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        // Get quiz attempts
        quizAttempt: {
          select: {
            id: true,
            quiz: {
              select: {
                id: true,
                title: true,
              },
            },
            score: true,
            completed: true,
            startedAt: true,
            completedAt: true,
            timeFinished: true,
          },
          orderBy: {
            startedAt: "desc",
          },
          take: 10,
        },
        // Get user progress
        progress: {
          select: {
            id: true,
            progressBar: true,
            startedJourney: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        // Get settings
        settings: {
          select: {
            darkMode: true,
            email_notification: true,
            enable_push_notification: true,
          },
        },
        // Get invitation details if invited
        inviteUser: {
          where: {
            organizationId: requestingOrgId,
          },
          select: {
            id: true,
            email: true,
            role: true,
            expiresIn: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      this.setStatus(404);
      return {
        success: false,
        message: "User not found",
      };
    }

    // Calculate course statistics
    const totalEnrolledCourses = user.enrollment.length;
    const completedCourses = user.enrollment.filter(
      (e) => e.status === "COMPLETED"
    ).length;
    const inProgressCourses = user.enrollment.filter(
      (e) => e.status === "IN_PROGRESS" || e.status === "ENROLLED"
    ).length;

    // Calculate total lessons and progress
    let totalLessons = 0;
    let completedLessons = 0;
    let totalQuizScore = 0;
    let quizCount = 0;

    user.enrollment.forEach((enrollment) => {
      const courseLessons = enrollment.course.module.flatMap(
        (m) => m.lesson
      ).length;
      totalLessons += courseLessons;
    });

    // Get completed lessons from progress
    const userProgress = await prisma.progress.findMany({
      where: {
        userId: userId,
        progressBar: { gte: 100 },
      },
      select: {
        id: true,
      },
    });
    completedLessons = userProgress.length;

    // Calculate average quiz score
    user.quizAttempt.forEach((attempt) => {
      if (attempt.completed && attempt.score !== null) {
        totalQuizScore += attempt.score || 0;
        quizCount++;
      }
    });
    const averageQuizScore = quizCount > 0 
      ? Math.round(totalQuizScore / quizCount) 
      : 0;

    // Calculate overall progress percentage
    const overallProgress = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

    // Get user's role from membership
    const userRole = membership.role || user.role || "member";

    // Format the response
    const response = {
      success: true,
      message: "User details fetched successfully",
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: `${user.first_name} ${user.last_name}`,
          email_address: user.email_address,
          phone_number: user.phone_number,
          country: user.country,
          state: user.state,
          user_pic: user.user_pic || null,
          role: userRole,
          userType: user.userType,
          level: user.level || "Beginner",
          isOnline: user.isOnline,
          lastActive: user.lastActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          isProfileComplete: user.isProfileComplete,
          isVerified: user.isVerified,
          verifiedAt: user.verifiedAt,
        },
        organization: {
          role: userRole,
          joinedAt: membership.joinedAt,
          joinedVia: membership.joinedVia,
          isActive: membership.isActive,
        },
        stats: {
          totalEnrolledCourses,
          completedCourses,
          inProgressCourses,
          totalLessons,
          completedLessons,
          overallProgress,
          averageQuizScore,
          totalQuizAttempts: quizCount,
          totalAchievements: user.achievement.length,
          totalBadges: user.badges.length,
          coursesCreated: user.Courses.length,
        },
        courses: {
          enrolled: user.enrollment.map((e) => ({
            id: e.course.id,
            title: e.course.course_title,
            description: e.course.course_description,
            image: e.course.course_image,
            level: e.course.course_level,
            createdBy: e.course.createdBy,
            status: e.status,
            enrolledAt: e.enrolledAt,
            completedAt: e.completedAt,
            progress: overallProgress,
            moduleCount: e.course.module.length,
            lessonCount: e.course.module.reduce(
              (acc, m) => acc + m.lesson.length,
              0
            ),
          })),
          created: user.Courses.map((c) => ({
            id: c.id,
            title: c.course_title,
            description: c.course_description,
            image: c.course_image,
            level: c.course_level,
            totalStudents: c._count.enrollment,
          })),
        },
        achievements: user.achievement,
        badges: user.badges,
        settings: user.settings,
        quizHistory: user.quizAttempt,
        invitation: user.inviteUser[0] || null,
      },
    };

    this.setStatus(200);
    return response;

  } catch (error: any) {
    console.error("Error fetching user details:", error);
    this.setStatus(500);
    return {
      success: false,
      message: "Failed to fetch user details",
      error: error.message,
    };
  }
}

  // ─────────────────────────────────────────────────────────────────────────
  // ORG OVERVIEW STATS — supports date range filtering + live online count
  // ─────────────────────────────────────────────────────────────────────────
  @Security("bearerAuth")
  @Get("/overview-stats/{organizationId}")
  public async GetOrganizationOverviewStats(
    @Path() organizationId: string,
    @Request() req: any,
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      // ── Parse range/date from query string ────────────────────────────────
      // req.query works because tsoa forwards the raw express req
      const range = (req.query?.range as string) || "today";
      const customDate = req.query?.date as string | undefined;

      const { rangeStart, rangeEnd, prevRangeStart, prevRangeEnd } =
        this.resolveDateRange(range, customDate);

      // ── Active members: all users in the org ────────────────────────────
      const members = await prisma.organizationMember.findMany({
        where: { organizationId, isActive: true },
        select: { userId: true },
      });
      const memberIds = members.map((m) => m.userId);
      const totalMembers = memberIds.length;

      // ── Online count: prefer live socket service if available ──────────
      let onlineCount = 0;
      const socketService = req.app?.get?.("socketService") as
        | { getOrganizationOnlineUsers: (id: string) => any[] }
        | undefined;

      if (socketService) {
        onlineCount =
          socketService.getOrganizationOnlineUsers(organizationId).length;
      } else {
        // Fallback: DB flag, "online" = active in the last 5 minutes
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        onlineCount = await prisma.user.count({
          where: {
            id: { in: memberIds },
            isOnline: true,
            lastActive: { gte: fiveMinAgo },
          },
        });
      }

      // ── New members within the selected range ───────────────────────────
      const newMembersInRange = await prisma.organizationMember.count({
        where: {
          organizationId,
          isActive: true,
          joinedAt: { gte: rangeStart, lte: rangeEnd },
        },
      });

      const newMembersPrevRange = prevRangeStart
        ? await prisma.organizationMember.count({
            where: {
              organizationId,
              isActive: true,
              joinedAt: { gte: prevRangeStart, lte: prevRangeEnd! },
            },
          })
        : 0;

      // ── Courses completed within range (org-scoped) ──────────────────────
      const completedInRange = await prisma.enrollment.count({
        where: {
          userId: { in: memberIds },
          status: "COMPLETED",
          completedAt: { gte: rangeStart, lte: rangeEnd },
        },
      });

      const totalCompletedAllTime = await prisma.enrollment.count({
        where: {
          userId: { in: memberIds },
          status: "COMPLETED",
        },
      });

      const totalEnrollments = await prisma.enrollment.count({
        where: { userId: { in: memberIds } },
      });

      const avgCompletion =
        totalEnrollments > 0
          ? Math.round((totalCompletedAllTime / totalEnrollments) * 100)
          : 0;

      // ── % change vs previous equivalent period (for UI trend arrows) ─────
      const newMembersTrend =
        newMembersPrevRange > 0
          ? Math.round(
              ((newMembersInRange - newMembersPrevRange) /
                newMembersPrevRange) *
                100,
            )
          : newMembersInRange > 0
            ? 100
            : 0;

      this.setStatus(200);
      return {
        success: true,
        message: "Organization overview stats fetched successfully",
        data: {
          total_members: totalMembers,
          online_members: onlineCount,
          new_members_in_range: newMembersInRange,
          new_members_trend_pct: newMembersTrend,
          courses_completed_in_range: completedInRange,
          total_courses_completed: totalCompletedAllTime,
          avg_completion: avgCompletion,
          range: {
            type: range,
            start: rangeStart,
            end: rangeEnd,
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching organization overview stats:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch organization overview stats",
        error: error.message,
      };
    }
  }

  // Add this to your OrganizationController class

  /**
   * GET: Fetch organization activities (course joins, completions, event joins)
   * Returns recent activities for the organization dashboard
   */
  @Security("bearerAuth")
  @Get("/activities/{organizationId}")
  public async GetOrganizationActivities(
    @Path() organizationId: string,
    @Request() req: any,
  ): Promise<any> {
    try {
      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return {
          success: false,
          message: "Organization not found",
        };
      }

      // Get all active members of the organization
      const members = await prisma.organizationMember.findMany({
        where: {
          organizationId: organizationId,
          isActive: true,
        },
        select: { userId: true },
      });
      const memberIds = members.map((m) => m.userId);

      // ── 1. COURSE JOIN ACTIVITIES ──────────────────────────────────────────
      // Get recent enrollments (course joins)
      const courseJoins = await prisma.enrollment.findMany({
        where: {
          userId: { in: memberIds },
          enrolledAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: {
          enrolledAt: "desc",
        },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
          course: {
            select: {
              id: true,
              course_title: true,
              course_image: true,
            },
          },
        },
      });

      // ── 2. COURSE COMPLETION ACTIVITIES ────────────────────────────────────
      // Get recent course completions
      const courseCompletions = await prisma.enrollment.findMany({
        where: {
          userId: { in: memberIds },
          status: "COMPLETED",
          completedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: {
          completedAt: "desc",
        },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
          course: {
            select: {
              id: true,
              course_title: true,
              course_image: true,
            },
          },
        },
      });

      // ── 3. EVENT JOIN ACTIVITIES ───────────────────────────────────────────
      // Get recent event joins
      const eventJoins = await prisma.joinedEvent.findMany({
        where: {
          group: {
            createdBy: { id: { in: memberIds } },
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        include: {
          event: {
            select: {
              id: true,
              event_name: true,
              event_description: true,
              event_time: true,
              event_date: true,
            },
          },
          group: {
            select: {
              id: true,
              group_title: true,
            },
          },
        },
      });

      // ── 4. GROUP JOIN ACTIVITIES ───────────────────────────────────────────
      // Get recent group joins
      const groupJoins = await prisma.joinedGroup.findMany({
        where: {
          studentId: { in: memberIds },
          joinedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: {
          joinedAt: "desc",
        },
        take: 20,
        include: {
          student: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
          group: {
            select: {
              id: true,
              group_title: true,
              group_image: true,
            },
          },
        },
      });

      // ── 5. POST ACTIVITIES ─────────────────────────────────────────────────
      // Get recent posts from the organization
      const posts = await prisma.post.findMany({
        where: {
          organizationId: organizationId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
          replies: {
            select: {
              id: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
          likes: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      // ── 6. QUIZ COMPLETION ACTIVITIES ──────────────────────────────────────
      // Get recent quiz completions
      const quizCompletions = await prisma.quizAttempt.findMany({
        where: {
          userId: { in: memberIds },
          completed: true,
          completedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: {
          completedAt: "desc",
        },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
          course: {
            select: {
              id: true,
              course_title: true,
            },
          },
        },
      });

      // ── 7. ACHIEVEMENT UNLOCKED ACTIVITIES ─────────────────────────────────
      // Get recent achievements
      const achievements = await prisma.achievement.findMany({
        where: {
          userId: { in: memberIds },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
          course: {
            select: {
              id: true,
              course_title: true,
            },
          },
          group: {
            select: {
              id: true,
              group_title: true,
            },
          },
        },
      });

      // ── Combine and format all activities ──────────────────────────────────
      const activities: any[] = [];

      // Add course joins
      courseJoins.forEach((enrollment) => {
        const userName = enrollment.user
          ? `${enrollment.user.first_name} ${enrollment.user.last_name}`.trim()
          : "Someone";
        activities.push({
          id: `course_join_${enrollment.id}`,
          type: "COURSE_JOIN",
          user: enrollment.user
            ? {
                id: enrollment.user.id,
                name: userName,
                first_name: enrollment.user.first_name,
                last_name: enrollment.user.last_name,
                user_pic: enrollment.user.user_pic,
              }
            : null,
          course: enrollment.course
            ? {
                id: enrollment.course.id,
                title: enrollment.course.course_title,
                image: enrollment.course.course_image,
              }
            : null,
          message: `${userName} joined course "${enrollment.course?.course_title || "a course"}"`,
          timestamp: enrollment.enrolledAt,
          icon: "📚",
        });
      });

      // Add course completions
      courseCompletions.forEach((enrollment) => {
        const userName = enrollment.user
          ? `${enrollment.user.first_name} ${enrollment.user.last_name}`.trim()
          : "Someone";
        activities.push({
          id: `course_complete_${enrollment.id}`,
          type: "COURSE_COMPLETE",
          user: enrollment.user
            ? {
                id: enrollment.user.id,
                name: userName,
                first_name: enrollment.user.first_name,
                last_name: enrollment.user.last_name,
                user_pic: enrollment.user.user_pic,
              }
            : null,
          course: enrollment.course
            ? {
                id: enrollment.course.id,
                title: enrollment.course.course_title,
                image: enrollment.course.course_image,
              }
            : null,
          message: `${userName} completed course "${enrollment.course?.course_title || "a course"}" 🎉`,
          timestamp: enrollment.completedAt || enrollment.enrolledAt,
          icon: "🏆",
        });
      });

      // Add event joins
      eventJoins.forEach((eventJoin) => {
        const eventName = eventJoin.event?.event_name || "an event";
        activities.push({
          id: `event_join_${eventJoin.id}`,
          type: "EVENT_JOIN",
          event: eventJoin.event
            ? {
                id: eventJoin.event.id,
                name: eventJoin.event.event_name,
                description: eventJoin.event.event_description,
                time: eventJoin.event.event_time,
                date: eventJoin.event.event_date,
              }
            : null,
          group: eventJoin.group
            ? {
                id: eventJoin.group.id,
                title: eventJoin.group.group_title,
              }
            : null,
          message: `Someone joined event "${eventName}"`,
          timestamp: eventJoin.createdAt,
          icon: "📅",
        });
      });

      // Add group joins
      groupJoins.forEach((groupJoin) => {
        const userName = groupJoin.student
          ? `${groupJoin.student.first_name} ${groupJoin.student.last_name}`.trim()
          : "Someone";
        activities.push({
          id: `group_join_${groupJoin.id}`,
          type: "GROUP_JOIN",
          user: groupJoin.student
            ? {
                id: groupJoin.student.id,
                name: userName,
                first_name: groupJoin.student.first_name,
                last_name: groupJoin.student.last_name,
                user_pic: groupJoin.student.user_pic,
              }
            : null,
          group: groupJoin.group
            ? {
                id: groupJoin.group.id,
                title: groupJoin.group.group_title,
                image: groupJoin.group.group_image,
              }
            : null,
          message: `${userName} joined group "${groupJoin.group?.group_title || "a group"}"`,
          timestamp: groupJoin.joinedAt,
          icon: "👥",
        });
      });

      // Add posts
      posts.forEach((post) => {
        const userName = post.user
          ? `${post.user.first_name} ${post.user.last_name}`.trim()
          : "Someone";
        const replyCount = post.replies?.length || 0;
        const likeCount = post.likes?.length || 0;

        let message = `${userName} posted: "${post.title}"`;
        if (replyCount > 0) {
          message += ` (${replyCount} ${replyCount === 1 ? "reply" : "replies"})`;
        }
        if (likeCount > 0) {
          message += ` (${likeCount} ${likeCount === 1 ? "like" : "likes"})`;
        }

        activities.push({
          id: `post_${post.id}`,
          type: "POST",
          user: post.user
            ? {
                id: post.user.id,
                name: userName,
                first_name: post.user.first_name,
                last_name: post.user.last_name,
                user_pic: post.user.user_pic,
              }
            : null,
          post: {
            id: post.id,
            title: post.title,
            content: post.content,
            replyCount,
            likeCount,
          },
          message: message,
          timestamp: post.createdAt,
          icon: "💬",
        });
      });

      // Add quiz completions
      quizCompletions.forEach((quizAttempt) => {
        const userName = quizAttempt.user
          ? `${quizAttempt.user.first_name} ${quizAttempt.user.last_name}`.trim()
          : "Someone";
        const quizTitle = quizAttempt.quiz?.title || "a quiz";
        const score = quizAttempt.score || 0;

        activities.push({
          id: `quiz_complete_${quizAttempt.id}`,
          type: "QUIZ_COMPLETE",
          user: quizAttempt.user
            ? {
                id: quizAttempt.user.id,
                name: userName,
                first_name: quizAttempt.user.first_name,
                last_name: quizAttempt.user.last_name,
                user_pic: quizAttempt.user.user_pic,
              }
            : null,
          quiz: {
            id: quizAttempt.quiz?.id,
            title: quizAttempt.quiz?.title,
            score: score,
          },
          course: quizAttempt.course
            ? {
                id: quizAttempt.course.id,
                title: quizAttempt.course.course_title,
              }
            : null,
          message: `${userName} scored ${score}% on quiz "${quizTitle}"`,
          timestamp: quizAttempt.completedAt || quizAttempt.startedAt,
          icon: "📝",
        });
      });

      // Add achievements
      achievements.forEach((achievement) => {
        const userName = achievement.user
          ? `${achievement.user.first_name} ${achievement.user.last_name}`.trim()
          : "Someone";
        const achievementTitle = achievement.title || "an achievement";

        activities.push({
          id: `achievement_${achievement.id}`,
          type: "ACHIEVEMENT",
          user: achievement.user
            ? {
                id: achievement.user.id,
                name: userName,
                first_name: achievement.user.first_name,
                last_name: achievement.user.last_name,
                user_pic: achievement.user.user_pic,
              }
            : null,
          achievement: {
            id: achievement.id,
            title: achievement.title,
            content: achievement.content,
            point: achievement.point,
          },
          course: achievement.course
            ? {
                id: achievement.course.id,
                title: achievement.course.course_title,
              }
            : null,
          group: achievement.group
            ? {
                id: achievement.group.id,
                title: achievement.group.group_title,
              }
            : null,
          message: `${userName} unlocked achievement "${achievementTitle}"! 🏅`,
          timestamp: achievement.createdAt,
          icon: "⭐",
        });
      });

      // Sort all activities by timestamp (newest first)
      activities.sort((a, b) => {
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });

      // Limit to the most recent 50 activities
      const recentActivities = activities.slice(0, 50);

      this.setStatus(200);
      return {
        success: true,
        message: "Organization activities fetched successfully",
        data: {
          activities: recentActivities,
          total: recentActivities.length,
          summary: {
            course_joins: courseJoins.length,
            course_completions: courseCompletions.length,
            event_joins: eventJoins.length,
            group_joins: groupJoins.length,
            posts: posts.length,
            quiz_completions: quizCompletions.length,
            achievements: achievements.length,
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching organization activities:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch organization activities",
        error: error.message,
      };
    }
  }
  /**
   * GET: Fetch user breakdown for organization dashboard
   * Returns counts for: total members, students, instructors, admins, online users, etc.
   */
  @Security("bearerAuth")
  @Get("/user-breakdown/{organizationId}")
  public async GetUserBreakdown(
    @Path() organizationId: string,
    @Request() req: any,
  ): Promise<any> {
    try {
      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return {
          success: false,
          message: "Organization not found",
        };
      }

      // Get all active members of the organization
      const members = await prisma.organizationMember.findMany({
        where: {
          organizationId: organizationId,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              role: true,
              email_address: true,
              userType: true,
              isOnline: true,
              lastActive: true,
            },
          },
        },
      });

      // Get all invited users (pending invitations)
      const pendingInvitations = await prisma.inviteUser.count({
        where: {
          organizationId: organizationId,
          expiresIn: { gt: new Date() },
          // Exclude those who already accepted
          NOT: {
            email: {
              in: members
                .map((m) => m.user?.email_address)
                .filter(Boolean) as string[],
            },
          },
        },
      });

      // Count by role
      let studentCount = 0;
      let instructorCount = 0;
      let adminCount = 0;
      let orgAdminCount = 0;
      let invitedMemberCount = 0;
      let individualCount = 0;
      let onlineCount = 0;

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      for (const member of members) {
        const user = member.user;
        if (!user) continue;

        // Count online users
        if (
          user.isOnline &&
          user.lastActive &&
          new Date(user.lastActive) > fiveMinutesAgo
        ) {
          onlineCount++;
        }

        // Count by role and userType
        const role = user.role?.toLowerCase() || "";
        const userType = user.userType || "";

        if (role === "student") {
          studentCount++;
        } else if (role === "tutor" || role === "instructor") {
          instructorCount++;
        } else if (role === "admin") {
          adminCount++;
        } else if (role === "org_admin") {
          orgAdminCount++;
        }

        // Count by userType
        if (userType === "INVITED_MEMBER") {
          invitedMemberCount++;
        } else if (userType === "INDIVIDUAL") {
          individualCount++;
        }
      }

      // Total members (active)
      const totalMembers = members.length;

      // Get course enrollment stats
      const totalEnrollments = await prisma.enrollment.count({
        where: {
          userId: { in: members.map((m) => m.userId) },
        },
      });

      const completedCourses = await prisma.enrollment.count({
        where: {
          userId: { in: members.map((m) => m.userId) },
          status: "COMPLETED",
        },
      });

      const inProgressCourses = await prisma.enrollment.count({
        where: {
          userId: { in: members.map((m) => m.userId) },
          status: "IN_PROGRESS",
        },
      });

      // Get socket service for real-time online count (if available)
      let socketOnlineCount = 0;
      try {
        const socketService = req.app?.get?.("socketService") as
          | { getOrganizationOnlineUsers: (id: string) => any[] }
          | undefined;

        if (socketService) {
          socketOnlineCount =
            socketService.getOrganizationOnlineUsers(organizationId).length;
        }
      } catch (error) {
        // Fallback to database count
        socketOnlineCount = onlineCount;
      }

      this.setStatus(200);
      return {
        success: true,
        message: "User breakdown fetched successfully",
        data: {
          // Main stats for the UI cards
          total_members: totalMembers,
          students: studentCount,
          instructors: instructorCount,
          admins: adminCount + orgAdminCount,
          online_members: socketOnlineCount || onlineCount,
          pending_invitations: pendingInvitations,

          // Detailed breakdown
          breakdown: {
            by_role: {
              student: studentCount,
              instructor: instructorCount,
              admin: adminCount,
              org_admin: orgAdminCount,
            },
            by_user_type: {
              invited_member: invitedMemberCount,
              individual: individualCount,
              organization_owner:
                totalMembers - invitedMemberCount - individualCount,
            },
          },

          // Activity stats
          activity: {
            total_enrollments: totalEnrollments,
            completed_courses: completedCourses,
            in_progress_courses: inProgressCourses,
            completion_rate:
              totalEnrollments > 0
                ? Math.round((completedCourses / totalEnrollments) * 100)
                : 0,
          },

          // Timestamp
          fetched_at: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error("Error fetching user breakdown:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch user breakdown",
        error: error.message,
      };
    }
  }

  // ── Helper: resolves a named range or custom date into start/end bounds ──
  private resolveDateRange(
    range: string,
    customDate?: string,
  ): {
    rangeStart: Date;
    rangeEnd: Date;
    prevRangeStart: Date | null;
    prevRangeEnd: Date | null;
  } {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const dayMs = 24 * 60 * 60 * 1000;

    switch (range) {
      case "This week": {
        const dayOfWeek = startOfToday.getDay(); // 0=Sun
        const start = new Date(startOfToday.getTime() - dayOfWeek * dayMs);
        const end = endOfToday;
        const prevStart = new Date(start.getTime() - 7 * dayMs);
        const prevEnd = new Date(start.getTime() - 1);
        return {
          rangeStart: start,
          rangeEnd: end,
          prevRangeStart: prevStart,
          prevRangeEnd: prevEnd,
        };
      }

      case "Last week": {
        const dayOfWeek = startOfToday.getDay();
        const startOfThisWeek = new Date(
          startOfToday.getTime() - dayOfWeek * dayMs,
        );
        const start = new Date(startOfThisWeek.getTime() - 7 * dayMs);
        const end = new Date(startOfThisWeek.getTime() - 1);
        const prevStart = new Date(start.getTime() - 7 * dayMs);
        const prevEnd = new Date(start.getTime() - 1);
        return {
          rangeStart: start,
          rangeEnd: end,
          prevRangeStart: prevStart,
          prevRangeEnd: prevEnd,
        };
      }

      case "Last month": {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999,
        );
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const prevEnd = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          0,
          23,
          59,
          59,
          999,
        );
        return {
          rangeStart: start,
          rangeEnd: end,
          prevRangeStart: prevStart,
          prevRangeEnd: prevEnd,
        };
      }

      case "Select a date":
      case "custom": {
        if (customDate) {
          const start = new Date(customDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customDate);
          end.setHours(23, 59, 59, 999);
          const prevStart = new Date(start.getTime() - dayMs);
          const prevEnd = new Date(start.getTime() - 1);
          return {
            rangeStart: start,
            rangeEnd: end,
            prevRangeStart: prevStart,
            prevRangeEnd: prevEnd,
          };
        }
        // fall through to today if no date supplied
      }

      case "Today":
      default: {
        const prevStart = new Date(startOfToday.getTime() - dayMs);
        const prevEnd = new Date(startOfToday.getTime() - 1);
        return {
          rangeStart: startOfToday,
          rangeEnd: endOfToday,
          prevRangeStart: prevStart,
          prevRangeEnd: prevEnd,
        };
      }
    }
  }

  @Post("/auth/send-verification-otp/{organizationId}")
  public async SendVerificationOTP(
    @Path() organizationId: string,
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { user: true },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      if (organization.isVerified) {
        this.setStatus(400);
        return { success: false, message: "Organization is already verified" };
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = await bcrypt.hash(otp, 10);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          verificationOTP: hashedOTP,
          verificationOTPExpires: new Date(Date.now() + 10 * 60 * 1000),
          verificationOTPAttempts: 0,
        },
      });

      const { sendOrganizationVerificationOTP } =
        await import("../utils/sendmail.js");

      await sendOrganizationVerificationOTP(
        organization.organization_email,
        otp,
        organization.organization_name,
      );

      this.setStatus(200);
      return {
        success: true,
        message: "Verification OTP sent successfully",
        data: {
          organizationId: organization.id,
          email: organization.organization_email,
          expiresIn: "10 minutes",
        },
      };
    } catch (error: any) {
      console.error("Error sending verification OTP:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to send verification OTP",
        error: error.message,
      };
    }
  }

  @Post("/auth/verify-organization-otp")
  public async VerifyOrganizationOTP(
    @Body() body: { organizationId: string; otp: string },
  ): Promise<any> {
    try {
      const { organizationId, otp } = body;

      if (!organizationId || !otp) {
        this.setStatus(400);
        return {
          success: false,
          message: "Organization ID and OTP are required",
        };
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      if (organization.isVerified) {
        this.setStatus(400);
        return { success: false, message: "Organization is already verified" };
      }

      if (
        !organization.verificationOTP ||
        !organization.verificationOTPExpires
      ) {
        this.setStatus(400);
        return {
          success: false,
          message: "No verification OTP found. Please request a new one.",
        };
      }

      if (new Date() > organization.verificationOTPExpires) {
        this.setStatus(400);
        return {
          success: false,
          message: "Verification OTP has expired. Please request a new one.",
        };
      }

      const attempts = organization.verificationOTPAttempts || 0;
      if (attempts >= 5) {
        this.setStatus(400);
        return {
          success: false,
          message: "Too many failed attempts. Please request a new OTP.",
        };
      }

      const isValid = await bcrypt.compare(otp, organization.verificationOTP);

      if (!isValid) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: { verificationOTPAttempts: attempts + 1 },
        });

        const remainingAttempts = 4 - attempts;
        this.setStatus(400);
        return {
          success: false,
          message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
          data: { remainingAttempts },
        };
      }

      const updatedOrganization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verificationOTP: null,
          verificationOTPExpires: null,
          verificationOTPAttempts: 0,
        },
        include: {
          user: true,
          Church: true,
          school: true,
          Club: true,
        },
      });

      this.setStatus(200);
      return {
        success: true,
        message: "Organization verified successfully",
        data: {
          organizationId: updatedOrganization.id,
          organizationName: updatedOrganization.organization_name,
          isVerified: updatedOrganization.isVerified,
          verifiedAt: updatedOrganization.verifiedAt,
        },
      };
    } catch (error: any) {
      console.error("Error verifying organization:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to verify organization",
        error: error.message,
      };
    }
  }

  @Post("/auth/resend-verification-otp/{organizationId}")
  public async ResendVerificationOTP(
    @Path() organizationId: string,
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      if (organization.isVerified) {
        this.setStatus(400);
        return { success: false, message: "Organization is already verified" };
      }

      const lastResend = organization.verificationOTPResendAt;
      if (lastResend) {
        const timeSinceLastResend = Date.now() - new Date(lastResend).getTime();
        const minutesSinceLastResend = timeSinceLastResend / (1000 * 60);

        if (minutesSinceLastResend < 2) {
          this.setStatus(429);
          return {
            success: false,
            message: `Please wait ${Math.ceil(2 - minutesSinceLastResend)} minutes before requesting another OTP`,
          };
        }
      }

      const resendCount = organization.verificationOTPResendCount || 0;
      if (resendCount >= 3) {
        this.setStatus(429);
        return {
          success: false,
          message: "Maximum resend limit reached. Please try again in 1 hour.",
        };
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = await bcrypt.hash(otp, 10);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          verificationOTP: hashedOTP,
          verificationOTPExpires: new Date(Date.now() + 10 * 60 * 1000),
          verificationOTPAttempts: 0,
          verificationOTPResendCount: resendCount + 1,
          verificationOTPResendAt: new Date(),
        },
      });

      const { sendOrganizationVerificationOTP } =
        await import("../utils/sendmail.js");

      await sendOrganizationVerificationOTP(
        organization.organization_email,
        otp,
        organization.organization_name,
      );

      this.setStatus(200);
      return {
        success: true,
        message: "New verification OTP sent successfully",
        data: {
          organizationId: organization.id,
          email: organization.organization_email,
          expiresIn: "10 minutes",
          remainingResends: 2 - resendCount,
        },
      };
    } catch (error: any) {
      console.error("Error resending verification OTP:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to resend verification OTP",
        error: error.message,
      };
    }
  }

  @Get("/auth/check-verification-status/{organizationId}")
  public async CheckVerificationStatus(
    @Path() organizationId: string,
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          organization_name: true,
          isVerified: true,
          verifiedAt: true,
          verificationOTPExpires: true,
          verificationOTPAttempts: true,
        },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      let status = "NOT_VERIFIED";
      let message = "Organization is not verified yet";

      if (organization.isVerified) {
        status = "VERIFIED";
        message = "Organization is verified";
      } else if (
        organization.verificationOTPExpires &&
        new Date() > organization.verificationOTPExpires
      ) {
        status = "OTP_EXPIRED";
        message = "Verification OTP has expired. Please request a new one.";
      } else if (organization.verificationOTPExpires) {
        status = "OTP_SENT";
        message = "Verification OTP has been sent and is still valid";
      } else {
        status = "NO_OTP";
        message = "No verification OTP found. Please request one.";
      }

      this.setStatus(200);
      return {
        success: true,
        message,
        data: {
          organizationId: organization.id,
          organizationName: organization.organization_name,
          isVerified: organization.isVerified,
          verifiedAt: organization.verifiedAt,
          status,
          otpExpiresAt: organization.verificationOTPExpires,
          attemptsUsed: organization.verificationOTPAttempts || 0,
        },
      };
    } catch (error: any) {
      console.error("Error checking verification status:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to check verification status",
        error: error.message,
      };
    }
  }

  @Get("/fetch-organizations")
  public async FetchOrganization(): Promise<any> {
    try {
      const fetchOrganizationsType = await prisma.organization.findMany({
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email_address: true,
              userType: true, // ✅ include userType
            },
          },
          Church: true,
          school: true,
          Club: true,
          members: {
            // ✅ include membership info
            select: {
              id: true,
              userId: true,
              role: true,
              joinedVia: true,
              joinedAt: true,
              isActive: true,
            },
          },
        },
      });

      return {
        message: "Organization Fetched successfully",
        data: fetchOrganizationsType,
      };
    } catch (error: any) {
      console.error(error);
    }
  }

  @Get("/fetch-specific-organization/{id}")
  public async FetchSpecificOrganization(@Path() id: string) {
    try {
      const fetchSpecificOrganization = await prisma.organization.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email_address: true,
              userType: true, // ✅
            },
          },
          members: {
            select: {
              id: true,
              userId: true,
              role: true,
              joinedVia: true,
              joinedAt: true,
              isActive: true,
            },
          },
        },
      });

      if (!fetchSpecificOrganization) {
        return {
          message: "Sorry this Organization does not exist",
          status: 404,
        };
      }

      return {
        message: "Organization fetched successfully",
        data: fetchSpecificOrganization,
      };
    } catch (error) {
      console.error(error);
    }
  }

  @Post("/upload-organization-profile_picture/{organizationId}")
  public async UploadOrganizationImage(
    @Path() organizationId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "Organization not found" };
      }

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.UploadOrganizationImage(
        organizationId,
        fileBuffer,
        body.fileName,
        body.mimeType,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const updateOrganization = await prisma.organization.update({
        where: { id: organizationId },
        data: { organization_image: url },
      });

      this.setStatus(201);
      return {
        message: "Success uploading image",
        url: updateOrganization.organization_image,
      };
    } catch (error) {
      this.setStatus(500);
      return { message: "Error uploading organization image" };
    }
  }

  @Post("/upload-church-logo/{organizationId}")
  public async UploadChurchLogo(
    @Path() organizationId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "Organization not found" };
      }

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.UploadOrganizationChurchLogo(
        organizationId,
        fileBuffer,
        body.fileName,
        body.mimeType,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const updateOrganizationChurch = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          Church: {
            update: { church_logo: url },
          },
        },
        select: {
          Church: {
            select: { id: true, church_logo: true },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Church image uploaded successfully",
        data: { organizationId: updateOrganizationChurch.Church.id },
        url: updateOrganizationChurch.Church.church_logo,
      };
    } catch (error) {
      console.error(error);
    }
  }

  @Post("/upload-school-logo/{organizationId}")
  public async UploadSchoolLogo(
    @Path() organizationId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "Organization not found" };
      }

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.UploadOrganizationSchoolLogo(
        organizationId,
        fileBuffer,
        body.fileName,
        body.mimeType,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const updateOrganizationSchool = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          school: {
            update: { school_logo: url },
          },
        },
        select: {
          school: {
            select: { id: true, school_logo: true },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "School image uploaded successfully",
        data: { organizationId: updateOrganizationSchool.school.id },
        url: updateOrganizationSchool.school.school_logo,
      };
    } catch (error) {
      console.error(error);
    }
  }

  @Post("/upload-school-document/{organizationId}")
  public async UploadSchoolOrganizationMaterial(
    @Path() organizationId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "organization not found" };
      }

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.uploadSchoolMaterial(
        organizationId,
        fileBuffer,
        body.fileName,
        body.mimeType,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const updateOrganization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          school: {
            update: { school_document: url },
          },
        },
        include: {
          school: {
            select: { id: true, school_document: true },
          },
        },
      });

      this.setStatus(201);
      return {
        message: "organization material uploaded successfully",
        data: updateOrganization,
        url: updateOrganization.school.school_document,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to upload organization material",
        error: error.message,
      };
    }
  }

  @Post("/upload-club-document/{organizationId}")
  public async UploadClubOrganizationMaterial(
    @Path() organizationId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "organization not found" };
      }

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.uploadClubMaterial(
        organizationId,
        fileBuffer,
        body.fileName,
        body.mimeType,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const updateOrganization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          Club: {
            update: { club_document: url },
          },
        },
        include: {
          Club: {
            select: { id: true, club_document: true },
          },
        },
      });

      this.setStatus(201);
      return {
        message: "organization material uploaded successfully",
        data: updateOrganization,
        url: updateOrganization.Club.club_document,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to upload organization material",
        error: error.message,
      };
    }
  }

  @Put("/update-organization/{id}")
  public async UpdateOrganization(
    @Path() id: string,
    @Body() body: Omit<OrganizationDTO, "id">,
  ) {
    try {
      const findOrganization = await prisma.organization.findUnique({
        where: { id },
        include: {
          Church: true,
          school: true,
          Club: true,
          user: true,
        },
      });

      if (!findOrganization) {
        this.setStatus(404);
        return { message: "This organization does not exist." };
      }

      const updateOrganization = await prisma.organization.update({
        where: { id },
        data: {
          organization_name: body.organization_name,
          organization_description: body.organization_description,
          organization_country: body.organization_country,
          organization_state: body.organization_state,
          organization_phone_number: body.organization_phone_number,
          organization_year: body.organization_year,
          organization_type: body.organization_type as any,
          language: body.language,
          languageCode: body.languageCode,

          Church: body.church
            ? {
                update: {
                  church_min_name: body.church.church_ministry_name,
                  church_ld_pastor: body.church.church_lead_pastor,
                  church_address: body.church.church_address,
                  church_weekly_service: body.church.church_weekly_service,
                  church_website: body.church.church_website,
                  church_logo: body.church.church_logo,
                },
              }
            : undefined,

          school: body.school
            ? {
                update: {
                  school_name: body.school.school_name,
                  school_type: body.school.school_type,
                  school_address: body.school.school_address,
                  school_admin_name: body.school.school_admin_name,
                  school_role: body.school.school_role,
                  school_website: body.school.school_website,
                  school_accreditation_number:
                    body.school.school_accreditation_number,
                  school_document: body.school.school_document,
                },
              }
            : undefined,

          Club: body.club
            ? {
                update: {
                  club_name: body.club.club_name,
                  club_type: body.club.club_type,
                  club_leader_name: body.club.club_leader_name,
                  club_meeting_frequency: body.club.club_meeting_frequency,
                  club_social_link: body.club.club_social_link,
                  club_parent_org: body.club.club_parent_org,
                  club_description: body.club.club_description,
                  club_document: body.club.club_document,
                  club_role: body.club.club_role,
                },
              }
            : undefined,

          user: {
            update: {
              first_name: body.user_first_name,
              last_name: body.user_last_name,
              email_address: body.user_email_address,
              country: body.user_country,
              state: body.user_state,
              phone_number: body.user_phone_number,
              role: body.user_role,
              form_type: body.user_form_type as any,
              // ✅ preserve userType — never overwrite it during a plain update
            },
          },
        },
        include: {
          Church: true,
          school: true,
          Club: true,
          user: true,
        },
      });

      return {
        message: "Organization updated successfully",
        data: updateOrganization,
      };
    } catch (error: any) {
      console.error("Error updating organization:", error.message);
      this.setStatus(500);
      return {
        message: "Failed to update organization",
        error: error.message,
      };
    }
  }

  @Post("/organization-password-generated/{organizationId}")
  public async OrganizationPasswordGenerator(@Path() organizationId: string) {
    const generatedPassword = crypto
      .randomBytes(9)
      .toString("base64")
      .slice(0, 12);

    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "Organization not found" };
      }

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          user: {
            update: { password: hashedPassword as any },
          },
          organization_password: hashedPassword,
        },
      });

      this.setStatus(200);
      return {
        message: "password done successfully",
        generatedPassword: generatedPassword,
      };
    } catch (error) {
      console.error(error);
    }
  }

  @Security("bearerAuth")
  @Get("/profile")
  public async GetProfile(@Request() req: any) {
    try {
      const organizationId = req.org?.id;

      if (!organizationId) {
        this.setStatus(401);
        return { message: "Unauthorized", status: 401 };
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email_address: true,
              userType: true, // ✅
            },
          },
          Church: true,
          school: true,
          Club: true,
          members: {
            // ✅ return membership list
            select: {
              id: true,
              userId: true,
              role: true,
              joinedVia: true,
              joinedAt: true,
              isActive: true,
            },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Profile fetched successfully",
        organization,
      };
    } catch (error: any) {
      console.error("Error fetching organization profile:", error);

      // Return 401 for authentication errors instead of 500
      if (error.status === 401 || error.message?.includes("No access token") || error.message?.includes("Unauthorized")) {
        this.setStatus(401);
        return { message: "Unauthorized", status: 401 };
      }

      this.setStatus(500);
      return { message: "Internal server error", status: 500, error: error.message };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INVITE USER SIGNUP
  // When an invited user clicks the link and creates their account.
  // ─────────────────────────────────────────────────────────────────────────
  @Post("/invite-user/signup/{organizationId}")
  public async CreateUser(
    @Path() organizationId: string,
    @Body()
    body: {
      first_name: string;
      last_name: string;
      email_address: string;
      password: string;
      country: string;
      state: string;
      phone_number: string;
      role: string;
      level: string;
    },
    @Request() req: any,
  ): Promise<any> {
    try {
      const hashedPassword = await bcrypt.hash(body.password, 10);

      // ✅ Find the invitation by email
      const invitation = await prisma.inviteUser.findFirst({
        where: { email: body.email_address },
      });

      if (!invitation) {
        this.setStatus(403);
        return {
          message: "No invitation found for this email address.",
        };
      }

      if (body.password === "") {
        this.setStatus(400);
        return { message: "Password must be filled" };
      }

      // ✅ Create user — mark as INVITED_MEMBER (replaces `invited: true`)
      const user = await prisma.user.create({
        data: {
          ...body,
          password: hashedPassword,
          userType: "INVITED_MEMBER", // ✅ new field
          form_type: "INVITED",
          level: body.level || "Beginner",
          // ✅ Do NOT connect org here via the one-to-one relation;
          //    the OrganizationMember table now owns that relationship.
        },
      });

      // ✅ Create OrganizationMember record — this is the authoritative link
      await prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organizationId,
          role: body.role || invitation.role || "member",
          joinedVia: "INVITE",
          inviteId: invitation.id,
          isActive: true,
        },
      });

      // Auto-create settings for the user
      const createSettings = await prisma.settings.create({
        data: {
          enable_push_notification: true,
          course_updates: true,
          event: true,
          achievement: true,
          daily_reminders: true,
          darkMode: false,
          email_notification: true,
          updatedAt: new Date(),
          userId: user.id,
          organizationId: null,
        },
      });

      const updateUser = await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastActive: new Date() },
      });

      const token = jwt.sign(
        {
          id: updateUser.id,
          settingsId: createSettings.id,
          full_name: `${updateUser.first_name} ${updateUser.last_name}`,
          email: updateUser.email_address,
          role: updateUser.role,
          userType: updateUser.userType, // ✅ in token
          organizationId: organizationId, // ✅ in token so middleware knows their org
          updateStatus: updateUser.isOnline,
        },
        (process.env.BEARERAUTH_SECRET as string) || "secret-key",
        { expiresIn: "7d" },
      );

      if (req.res) {
        req.res.cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      this.setStatus(201);
      return {
        message: "Signup successful",
        token,
        user: {
          id: updateUser.id,
          first_name: updateUser.first_name,
          last_name: updateUser.last_name,
          email_address: updateUser.email_address,
          userType: updateUser.userType, // ✅
          organizationId,
        },
      };
    } catch (error) {
      this.setStatus(500);
      console.error(error);
    }
  }

@Security("bearerAuth")
@Post("/invite-users-to-organization/{organizationId}")
public async InviteUsersToOrganization(
  @Path() organizationId: string,
  @Request() req: any,
  @Body() body: { users: { email: string; role: string }[] },
): Promise<any> {
  const userIdFromOrganization = req.org?.userId;
  try {
    const { users } = body;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      this.setStatus(404);
      return { success: false, message: "Organization not found" };
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      alreadyInvited: [] as any[],
      alreadyMember: [] as any[],
    };

    const invitePromises = users.map(async (user) => {
      try {
        // ✅ First check if user exists in the system
        const existingUser = await prisma.user.findUnique({
          where: { email_address: user.email },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email_address: true,
          },
        });

        // ✅ If user exists, check if they are already a member
        let existingMember = null;
        if (existingUser) {
          existingMember = await prisma.organizationMember.findFirst({
            where: {
              organizationId: organizationId,
              userId: existingUser.id,
              isActive: true,
            },
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email_address: true,
                },
              },
            },
          });
        }

        // ✅ If user exists in the system but not in the organization, they can be invited
        // But we should still check if they are already a member
        if (existingMember) {
          results.alreadyMember.push({
            email: user.email,
            role: user.role,
            message: "User is already a member of this organization",
            user: existingMember.user ? {
              id: existingMember.user.id,
              name: `${existingMember.user.first_name} ${existingMember.user.last_name}`,
              email: existingMember.user.email_address,
            } : null,
          });
          return;
        }

        // ✅ If user exists in the system but is not a member, they can be invited
        // No need to return here - continue with invitation flow

        // Check if there's already an active invitation
        const existingInvite = await prisma.inviteUser.findFirst({
          where: {
            email: user.email,
            organizationId: organizationId,
            expiresIn: { gt: new Date() },
          },
        });

        if (existingInvite) {
          results.alreadyInvited.push({
            email: user.email,
            role: user.role,
            message: "User already has an active invitation",
            inviteId: existingInvite.id,
            expiresIn: existingInvite.expiresIn,
          });
          return;
        }

        // Check if there's an expired invitation that can be renewed
        const expiredInvite = await prisma.inviteUser.findFirst({
          where: {
            email: user.email,
            organizationId: organizationId,
            expiresIn: { lte: new Date() },
          },
        });

        // Generate new token
        const tokencode = jwt.sign(
          { organizationId, email: user.email },
          process.env.BEARERAUTH_SECRET || "secret-key",
          { expiresIn: "24h" },
        );

        let inviteEntry;

        // If there's an expired invitation, update it instead of creating new
        if (expiredInvite) {
          inviteEntry = await prisma.inviteUser.update({
            where: { id: expiredInvite.id },
            data: {
              code: tokencode,
              role: user.role,
              sentById: userIdFromOrganization,
              expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new invitation
          inviteEntry = await prisma.inviteUser.create({
            data: {
              email: user.email,
              role: user.role,
              code: tokencode,
              organizationId: organizationId,
              sentById: userIdFromOrganization,
              expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
        }

        // Send invitation email
        const emailSubject = `Invitation to join ${organization.organization_name} on GOYE Platform`;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const inviteLink = `${baseUrl}/auth/${tokencode}/accept_invite`;
        const emailText = `You have been invited to join "${organization.organization_name}". Accept here: ${inviteLink}`;

        await SendEmail(user.email, emailSubject, emailText);

        results.successful.push({
          email: user.email,
          role: user.role,
          inviteId: inviteEntry.id,
          isRenewal: !!expiredInvite,
        });

      } catch (error: any) {
        console.error(`Error processing invitation for ${user.email}:`, error);
        results.failed.push({
          email: user.email,
          role: user.role,
          message: error.message || "Failed to send invitation",
        });
      }
    });

    await Promise.all(invitePromises);

    // Determine response status and message
    const totalProcessed = users.length;
    const successful = results.successful.length;
    const alreadyMembers = results.alreadyMember.length;
    const alreadyInvited = results.alreadyInvited.length;
    const failed = results.failed.length;

    let statusCode = 200;
    let message = "";

    if (successful === totalProcessed) {
      message = `Successfully invited ${successful} user(s)`;
      statusCode = 200;
    } else if (successful > 0) {
      message = `Invited ${successful} user(s). `;
      if (alreadyMembers > 0) {
        message += `${alreadyMembers} user(s) are already members, `;
      }
      if (alreadyInvited > 0) {
        message += `${alreadyInvited} user(s) already have active invitations, `;
      }
      if (failed > 0) {
        message += `${failed} user(s) failed.`;
      }
      statusCode = 207;
    } else if (alreadyMembers === totalProcessed) {
      message = `All ${alreadyMembers} user(s) are already members of this organization`;
      statusCode = 409;
    } else if (alreadyInvited === totalProcessed) {
      message = `All ${alreadyInvited} user(s) already have active invitations`;
      statusCode = 409;
    } else if (failed === totalProcessed) {
      message = "Failed to send all invitations";
      statusCode = 500;
    } else {
      message = "No invitations were sent";
      statusCode = 400;
    }

    this.setStatus(statusCode);
    return {
      success: successful > 0,
      message: message,
      data: {
        totalProcessed: totalProcessed,
        successful: results.successful,
        alreadyMembers: results.alreadyMember,
        alreadyInvited: results.alreadyInvited,
        failed: results.failed,
      },
    };
  } catch (error: any) {
    console.error("Error in InviteUsersToOrganization:", error);
    this.setStatus(500);
    return {
      success: false,
      message: "Error processing bulk invitations",
      error: error.message,
    };
  }
}

  @Get("/fetch-specific-invited-user-by-token/{token}")
  public async FetchInvitedUserByToken(@Path() token: string): Promise<any> {
    try {
      if (!token || token.trim() === "") {
        this.setStatus(400);
        return { success: false, message: "Token is required" };
      }

      let decodedToken: any;
      try {
        decodedToken = jwt.verify(
          token,
          process.env.BEARERAUTH_SECRET || "secret-key",
        );
      } catch (jwtError: any) {
        if (jwtError.name === "TokenExpiredError") {
          this.setStatus(410);
          return {
            success: false,
            message: "Invitation token has expired",
            error: "TokenExpiredError",
            expiredAt: jwtError.expiredAt,
          };
        }
        this.setStatus(401);
        return {
          success: false,
          message: "Invalid invitation token",
          error: jwtError.message,
        };
      }

      const invitation = await prisma.inviteUser.findFirst({
        where: { code: token },
        include: {
          organization: {
            select: {
              id: true,
              organization_name: true,
              organization_email: true,
              organization_image: true,
              organization_type: true,
              organization_description: true,
            },
          },
        },
      });

      if (!invitation) {
        this.setStatus(404);
        return {
          success: false,
          message:
            "Invitation not found. The invitation may have been revoked or never existed.",
        };
      }

      if (invitation.email !== decodedToken.email) {
        this.setStatus(403);
        return {
          success: false,
          message: "Token data does not match invitation record",
        };
      }

      if (invitation.organizationId !== decodedToken.organizationId) {
        this.setStatus(403);
        return { success: false, message: "Organization mismatch" };
      }

      const now = new Date();
      const isExpired = invitation.expiresIn < now;

      if (isExpired) {
        this.setStatus(410);
        return {
          success: false,
          message:
            "This invitation has expired. Please request a new one from the organization administrator.",
          data: {
            expiredAt: invitation.expiresIn,
            email: invitation.email,
            organizationName: invitation.organization?.organization_name,
            canResend: true,
          },
        };
      }

      // ✅ Check if user already accepted — use userType instead of `invited`
      const existingUser = await prisma.user.findFirst({
        where: {
          email_address: invitation.email,
          userType: "INVITED_MEMBER", // ✅ replaces `invited: true`
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email_address: true,
          role: true,
          userType: true,
          user_pic: true,
          createdAt: true,
        },
      });

      if (existingUser) {
        this.setStatus(409);
        return {
          success: false,
          message:
            "This invitation has already been accepted. Please login to continue.",
          data: {
            user: existingUser,
            redirectTo: "/login",
          },
        };
      }

      const remainingTime = invitation.expiresIn.getTime() - now.getTime();
      const remainingHours = Math.floor(remainingTime / (1000 * 60 * 60));
      const remainingMinutes = Math.floor(
        (remainingTime % (1000 * 60 * 60)) / (1000 * 60),
      );

      this.setStatus(200);
      return {
        success: true,
        message: "Invitation found successfully",
        data: {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            createdAt: invitation.createdAt,
            expiresIn: invitation.expiresIn,
            remainingTime: {
              hours: remainingHours,
              minutes: remainingMinutes,
              totalMs: remainingTime,
            },
          },
          organization: {
            id: invitation.organization?.id,
            name: invitation.organization?.organization_name,
            email: invitation.organization?.organization_email,
            image: invitation.organization?.organization_image,
            type: invitation.organization?.organization_type,
            description: invitation.organization?.organization_description,
          },
          token: { isValid: true, isExpired: false },
        },
      };
    } catch (error: any) {
      console.error("Error fetching invited user by token:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "An internal error occurred while fetching the invitation",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      };
    }
  }

  @Security("bearerAuth")
  @Post("/generate-new-token/{organizationId}/{invitedUserId}")
  public async GenerateNewTokenForInvitedUser(
    @Path() organizationId: string,
    @Path() invitedUserId: string,
    @Request() req: any,
  ): Promise<any> {
    try {
      const userIdFromOrganization = req.org?.userId;

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      const invitedUser = await prisma.inviteUser.findUnique({
        where: { id: invitedUserId },
        select: { id: true, email: true, role: true, invited: true },
      });

      if (!invitedUser) {
        this.setStatus(404);
        return { success: false, message: "Invited user not found" };
      }

      const tokencode = jwt.sign(
        {
          organizationId: organizationId,
          email: invitedUser.email,
          userId: invitedUser.id,
        },
        process.env.BEARERAUTH_SECRET || "secret-key",
        { expiresIn: "24h" },
      );

      const existingInvite = await prisma.inviteUser.findFirst({
        where: {
          email: invitedUser.email,
          organizationId: organizationId,
        },
      });

      let inviteEntry: any;

      if (existingInvite) {
        inviteEntry = await prisma.inviteUser.update({
          where: { id: existingInvite.id },
          data: {
            code: tokencode,
            role: invitedUser.role || "member",
            sentById: userIdFromOrganization,
            expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
          },
        });
      } else {
        inviteEntry = await prisma.inviteUser.create({
          data: {
            email: invitedUser.email,
            role: invitedUser.role || "member",
            code: tokencode,
            organizationId: organizationId,
            sentById: userIdFromOrganization,
            expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteLink = `${baseUrl}/auth/${tokencode}/accept_invite`;

      const emailSubject = `Invitation to join ${organization.organization_name} on GOYE Platform`;
      const userName = invitedUser.email;

      await SendEmail(
        invitedUser.email,
        emailSubject,
        inviteLink,
        "invitation",
        {
          organizationName: organization.organization_name,
          userName: userName || undefined,
        },
      );

      this.setStatus(200);
      return {
        success: true,
        message: existingInvite
          ? "Invitation has been renewed and sent successfully"
          : "New invitation generated and sent successfully",
        data: {
          inviteId: inviteEntry.id,
          email: invitedUser.email,
          role: invitedUser.role,
          expiresIn: inviteEntry.expiresIn,
          inviteLink: inviteLink,
          isRenewal: !!existingInvite,
        },
      };
    } catch (error: any) {
      console.error("Error generating new token:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Error generating new invitation token",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/invited-users/{organizationId}")
  public async GetInvitedUsers(
    @Path() organizationId: string,
    @Request() req: any,
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      const invitations = await prisma.inviteUser.findMany({
        where: { organizationId: organizationId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          expiresIn: true,
          createdAt: true,
          sentById: true,
        },
      });

      // ✅ Use userType instead of `invited: true`
      const acceptedUsers = await prisma.user.findMany({
        where: {
          userType: "INVITED_MEMBER",
          email_address: {
            in: invitations.map((i) => i.email),
          },
        },
        select: {
          id: true,
          email_address: true,
          first_name: true,
          last_name: true,
          role: true,
          userType: true, // ✅
          createdAt: true,
          // ✅ Also return their membership record
          organizationMemberships: {
            where: { organizationId },
            select: {
              joinedVia: true,
              joinedAt: true,
              isActive: true,
            },
          },
        },
      });

      this.setStatus(200);
      return {
        success: true,
        message: "Invited users fetched successfully",
        data: {
          pending: invitations.filter((i) => i.expiresIn > new Date()),
          expired: invitations.filter((i) => i.expiresIn <= new Date()),
          accepted: acceptedUsers,
        },
      };
    } catch (error: any) {
      console.error("Error fetching invited users:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Error fetching invited users",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Post("/resend-invitation/{invitationId}")
  public async ResendInvitation(
    @Path() invitationId: string,
    @Request() req: any,
  ): Promise<any> {
    try {
      const existingInvitation = await prisma.inviteUser.findUnique({
        where: { id: invitationId },
        include: { organization: true },
      });

      if (!existingInvitation) {
        this.setStatus(404);
        return { success: false, message: "Invitation not found" };
      }

      // ✅ Use userType to check if already accepted
      const existingUser = await prisma.user.findFirst({
        where: {
          email_address: existingInvitation.email,
          userType: "INVITED_MEMBER", // ✅ replaces `invited: true`
        },
      });

      if (existingUser) {
        this.setStatus(400);
        return {
          success: false,
          message: "User has already accepted the invitation",
        };
      }

      const newTokencode = jwt.sign(
        {
          organizationId: existingInvitation.organizationId,
          email: existingInvitation.email,
        },
        process.env.BEARERAUTH_SECRET || "secret-key",
        { expiresIn: "24h" },
      );

      const updatedInvitation = await prisma.inviteUser.update({
        where: { id: invitationId },
        data: {
          code: newTokencode,
          expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
          sentById: req.org?.userId || req.user?.id,
        },
      });

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteLink = `${baseUrl}/auth/${newTokencode}/accept_invite`;

      const emailSubject = `Resent: Invitation to join ${existingInvitation.organization?.organization_name} on GOYE Platform`;
      const emailText = `Your invitation to join "${existingInvitation.organization?.organization_name}" has been resent. Accept here: ${inviteLink}\n\nThis invitation will expire in 24 hours.`;

      await SendEmail(existingInvitation.email, emailSubject, emailText);

      this.setStatus(200);
      return {
        success: true,
        message: "Invitation resent successfully",
        data: {
          inviteLink: inviteLink,
          expiresIn: updatedInvitation.expiresIn,
        },
      };
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Error resending invitation",
        error: error.message,
      };
    }
  }

  @Post("/invitations/check")
  public async CheckInvitation(@Body() body: { token?: string }): Promise<any> {
    try {
      const invitation = await prisma.inviteUser.findFirst({
        where: {
          code: body.token,
          expiresIn: { gt: new Date() },
        },
      });

      if (!invitation) {
        this.setStatus(404);
        return { exists: false, message: "Invitation not found or expired" };
      }

      return {
        exists: true,
        invitation: {
          role: invitation.role,
          expiresIn: invitation.expiresIn,
        },
      };
    } catch (error) {
      console.error(error);
      this.setStatus(500);
      return { exists: false, error: "Failed to check invitation" };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-invited-users/{organizationId}")
  public async FetchInviteUsers(@Path() organizationId: string) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "Organization not found" };
      }

      const fetchInviteusers = await prisma.inviteUser.findMany({
        where: { organizationId },
        select: {
          id: true,
          email: true,
          role: true,
          // ✅ Also surface whether the user has accepted and their userType
          members: {
            select: {
              userId: true,
              joinedVia: true,
              isActive: true,
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  userType: true,
                },
              },
            },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Invited users fetched successfully",
        data: fetchInviteusers,
      };
    } catch (error) {
      this.setStatus(500);
      return { message: "An error occurred" };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-invited-users-with-access/{organizationId}")
  public async FetchInvitedUsersWithAccess(
    @Path() organizationId: string,
    @Request() req: any,
  ): Promise<any> {
    try {
      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return {
          success: false,
          message: "Organization not found",
        };
      }

      // Get all active members who accepted invitations
      const membersWithAccess = await prisma.organizationMember.findMany({
        where: {
          organizationId: organizationId,
          isActive: true,
          joinedVia: {
            in: ["INVITE", "CREATED"], // Include both invited users and creators
          },
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email_address: true,
              role: true,
              user_pic: true,
              userType: true,
              isOnline: true,
              lastActive: true,
              createdAt: true,
              isSuspended: true,
            },
          },
        },
        orderBy: {
          joinedAt: "desc",
        },
      });

      // Also get the organization owner (creator)
      const ownerMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: organizationId,
          role: "org_admin",
          joinedVia: "CREATED",
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email_address: true,
              role: true,
              user_pic: true,
              userType: true,
              isOnline: true,
              lastActive: true,
              createdAt: true,
              isSuspended: true,
            },
          },
        },
      });

      // Combine and deduplicate users
      const usersMap = new Map();

      // Add owner if exists
      if (ownerMember && ownerMember.user) {
        usersMap.set(ownerMember.user.id, {
          ...ownerMember.user,
          membershipRole: ownerMember.role,
          joinedAt: ownerMember.joinedAt,
          joinedVia: ownerMember.joinedVia,
          isActive: ownerMember.isActive,
          organizationMemberId: ownerMember.id,
        });
      }

      // Add members
      membersWithAccess.forEach((member) => {
        if (member.user && !usersMap.has(member.user.id)) {
          usersMap.set(member.user.id, {
            ...member.user,
            membershipRole: member.role,
            joinedAt: member.joinedAt,
            joinedVia: member.joinedVia,
            isActive: member.isActive,
            organizationMemberId: member.id,
          });
        }
      });

      // Convert to array
      const usersWithAccess = Array.from(usersMap.values());

      // Get pending invitations count
      const pendingInvitations = await prisma.inviteUser.count({
        where: {
          organizationId: organizationId,
          expiresIn: { gt: new Date() },
          // Exclude those who already accepted
          NOT: {
            email: {
              in: usersWithAccess.map((u) => u.email_address),
            },
          },
        },
      });

      // Get total members count
      const totalMembers = await prisma.organizationMember.count({
        where: {
          organizationId: organizationId,
          isActive: true,
        },
      });

      this.setStatus(200);
      return {
        success: true,
        message: "Users with access fetched successfully",
        data: {
          users: usersWithAccess.map((user) => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email_address: user.email_address,
            role: user.role,
            user_pic: user.user_pic,
            userType: user.userType,
            isOnline: user.isOnline,
            lastActive: user.lastActive,
            joinedAt: user.joinedAt,
            joinedVia: user.joinedVia,
            membershipRole: user.membershipRole,
            isActive: user.isActive,
            createdAt: user.createdAt,
            isSuspended: user.isSuspended,
          })),
          stats: {
            totalMembers: totalMembers,
            activeMembers: usersWithAccess.filter((u) => u.isActive).length,
            pendingInvitations: pendingInvitations,
            organizationId: organizationId,
            organizationName: organization.organization_name,
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching users with access:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Error fetching users with access",
        error: error.message,
      };
    }
  }

  // Enhanced version of fetch-invited-users endpoint
  @Security("bearerAuth")
  @Get("/fetch-invited-users-enhanced/{organizationId}")
  public async FetchInvitedUsersEnhanced(
    @Path() organizationId: string,
    @Request() req: any,
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      // Get all invitations
      const invitations = await prisma.inviteUser.findMany({
        where: {
          organizationId: organizationId,
          // Only include active invites that haven't been accepted
          expiresIn: { gt: new Date() },
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          expiresIn: true,
          // Check if this user has already accepted
          members: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              userId: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Filter out invitations that have been accepted
      const pendingInvitations = invitations.filter(
        (invite) => invite.members.length === 0,
      );

      const formattedInvitations = pendingInvitations.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        createdAt: invite.createdAt,
        expiresIn: invite.expiresIn,
        // Check if invitation is expiring soon (within 24 hours)
        isExpiringSoon: invite.expiresIn
          ? new Date(invite.expiresIn).getTime() - Date.now() <
            24 * 60 * 60 * 1000
          : false,
        // Time remaining in hours
        hoursRemaining: invite.expiresIn
          ? Math.floor(
              (new Date(invite.expiresIn).getTime() - Date.now()) /
                (1000 * 60 * 60),
            )
          : 0,
      }));

      this.setStatus(200);
      return {
        success: true,
        message: "Pending invitations fetched successfully",
        data: formattedInvitations,
      };
    } catch (error: any) {
      console.error("Error fetching invited users:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Error fetching invited users",
        error: error.message,
      };
    }
  }

  @Delete("/delete-organization/{id}")
  public async DeleteOrganization(@Path() id: string) {
    try {
      const deleteOrganization = await prisma.organization.delete({
        where: { id },
      });

      return {
        message: "Organization Deleted successfully",
        data: deleteOrganization,
      };
    } catch (error) {
      console.error(error);
    }
  }

  @Security("bearerAuth")
  @Get("/get-courses-by-organization")
  public async GetCoursesByOrganization(
    @Request() req: any,
  ): Promise<CourseResponse> {
    const userId = req.user?.id;
    const userLevel = req.user?.level;
    const language = req.user?.language;
    const languageCode = req.user?.languageCode;

    try {
      if (!userId) {
        this.setStatus(400);
        return { message: "User ID not found", data: null };
      }

      // ── Resolve organizationId ─────────────────────────────────────────────
      let organizationId = req.user?.organizationId ?? req.org?.id ?? null;

      if (!organizationId) {
        const membership = await prisma.organizationMember.findFirst({
          where: { userId, isActive: true },
          select: { organizationId: true },
          orderBy: { joinedAt: "desc" },
        });
        organizationId = membership?.organizationId ?? null;
      }

      if (!organizationId) {
        this.setStatus(404);
        return {
          message: "User is not associated with any organization",
          data: null,
        };
      }

      if (!userLevel) {
        this.setStatus(400);
        return { message: "User level not found", data: null };
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, organization_name: true },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "Organization not found", data: null };
      }

      const normalizedLevel = userLevel.toLowerCase();
      let levelCondition = {};

      if (normalizedLevel === "beginners" || normalizedLevel === "beginner") {
        levelCondition = { course_level: "Beginner" };
      } else if (normalizedLevel === "intermediate") {
        levelCondition = { course_level: "Intermediate" };
      } else if (normalizedLevel === "advanced") {
        levelCondition = { course_level: "Advanced" };
      }

      const organizationCourses = await prisma.course.findMany({
        where: {
          organizationId: organizationId,
          ...levelCondition,
        },
        orderBy: { createdAt: "desc" },
        include: {
          createdByDetails: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email_address: true,
              user_pic: true,
            },
          },
          module: {
            select: {
              id: true,
              module_title: true,
              _count: { select: { lesson: true } },
              lesson: {
                select: {
                  id: true,
                  duration: true,
                },
              },
            },
          },
          organization: {
            select: {
              organization_name: true,
              organization_type: true,
            },
          },
          enrollment: {
            where: { userId },
            select: {
              status: true,
              enrolledAt: true,
              completedAt: true,
            },
          },
          _count: { select: { enrollment: true } },
        },
      });

      const courseIds = organizationCourses.map((c) => c.id);
      let userEnrollments: any[] = [];

      if (courseIds.length > 0) {
        userEnrollments = await prisma.enrollment.findMany({
          where: { userId, courseId: { in: courseIds } },
          select: { courseId: true, status: true, enrolledAt: true },
        });
      }

      const enrollmentMap = new Map(
        userEnrollments.map((e) => [e.courseId, e]),
      );

      // ── Get completed lessons for progress calculation ────────────────────
      const completedLessons = await prisma.progress.findMany({
        where: {
          userId,
          progressBar: { gte: 100 },
          lesson: {
            module: {
              courseId: { in: courseIds },
            },
          },
        },
        select: {
          lessonId: true,
          lesson: {
            select: {
              module: {
                select: {
                  courseId: true,
                },
              },
            },
          },
        },
      });

      // Group completed lessons by courseId
      const completedLessonsByCourse = new Map<string, Set<string>>();
      completedLessons.forEach((progress) => {
        const courseId = progress.lesson?.module?.courseId;
        if (courseId) {
          if (!completedLessonsByCourse.has(courseId)) {
            completedLessonsByCourse.set(courseId, new Set());
          }
          completedLessonsByCourse.get(courseId)?.add(progress.lessonId);
        }
      });

      // ── Get video tracking progress for each lesson ───────────────────────
      const videoTrackers = await prisma.videoTracker.findMany({
        where: {
          lesson: {
            module: {
              courseId: { in: courseIds },
            },
          },
          progress: {
            userId: userId,
          },
        },
        select: {
          lessonId: true,
          videoTrackTime: true,
          videoFinished: true,
          lesson: {
            select: {
              duration: true,
              module: {
                select: {
                  courseId: true,
                },
              },
            },
          },
        },
      });

      // Group video progress by courseId
      const videoProgressByCourse = new Map<
        string,
        {
          totalWatched: number;
          totalDuration: number;
          lessonsWithProgress: number;
        }
      >();

      videoTrackers.forEach((tracker) => {
        const courseId = tracker.lesson?.module?.courseId;
        if (courseId) {
          if (!videoProgressByCourse.has(courseId)) {
            videoProgressByCourse.set(courseId, {
              totalWatched: 0,
              totalDuration: 0,
              lessonsWithProgress: 0,
            });
          }
          const courseData = videoProgressByCourse.get(courseId)!;
          courseData.totalWatched += tracker.videoTrackTime || 0;
          courseData.totalDuration += tracker.lesson?.duration || 0;
          if (tracker.videoTrackTime > 0) {
            courseData.lessonsWithProgress += 1;
          }
        }
      });

      const formattedCourses = organizationCourses.map((course) => {
        const userEnrollment = enrollmentMap.get(course.id);
        const allLessons = course.module.flatMap((m) => m.lesson);
        const totalLessons = allLessons.length;

        // Calculate lesson completion progress
        const completedLessonIds =
          completedLessonsByCourse.get(course.id) || new Set();
        const completedLessonsCount = completedLessonIds.size;

        // Calculate video progress
        const videoData = videoProgressByCourse.get(course.id) || {
          totalWatched: 0,
          totalDuration: 0,
          lessonsWithProgress: 0,
        };

        // Calculate overall progress percentage
        let progressPercentage = 0;
        if (totalLessons > 0) {
          // Weight: 70% lesson completion, 30% video progress
          const lessonProgress = (completedLessonsCount / totalLessons) * 70;
          const videoProgress =
            videoData.totalDuration > 0
              ? Math.min(
                  (videoData.totalWatched / videoData.totalDuration) * 30,
                  30,
                )
              : 0;
          progressPercentage = Math.round(lessonProgress + videoProgress);
        }

        // Get total duration in minutes
        const totalDurationMinutes = Math.round(
          course.module.reduce((acc, m) => {
            const durationSum = m.lesson.reduce(
              (sum, l) => sum + (l.duration || 0),
              0,
            );
            return acc + durationSum;
          }, 0) / 60,
        );

        // Calculate average video progress per lesson
        const averageVideoProgress =
          videoData.lessonsWithProgress > 0
            ? Math.round(
                videoData.totalWatched / videoData.lessonsWithProgress / 60,
              )
            : 0;

        // Determine enrollment status with progress
        let enrollmentStatus = userEnrollment?.status || "NOT_ENROLLED";

        // Auto-update to IN_PROGRESS if they've started watching
        if (
          enrollmentStatus === "ENROLLED" &&
          progressPercentage > 0 &&
          progressPercentage < 100
        ) {
          enrollmentStatus = "IN_PROGRESS";
        }

        // Auto-complete if all lessons are done
        if (
          enrollmentStatus !== "COMPLETED" &&
          completedLessonsCount === totalLessons &&
          totalLessons > 0
        ) {
          enrollmentStatus = "COMPLETED";
        }

        return {
          id: course.id,
          course_title: course.course_title,
          course_short_description: course.course_short_description,
          course_description: course.course_description,
          course_level: course.course_level,
          course_image: course.course_image,
          createdBy:
            course.createdByDetails.first_name +
            " " +
            course.createdByDetails.last_name,
          user_pic: course.createdByDetails.user_pic,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
          moduleCount: course.module.length,
          lessonCount: totalLessons,
          totalDuration: totalDurationMinutes,
          enrollmentStatus: enrollmentStatus,
          isEnrolled: !!userEnrollment,
          totalEnrollments: course._count.enrollment,
          organizationName: course.organization?.organization_name,
          // ── New progress fields ──
          progress: {
            percentage: progressPercentage,
            completedLessons: completedLessonsCount,
            totalLessons: totalLessons,
            totalDurationMinutes: totalDurationMinutes,
            watchedDurationMinutes: Math.round(videoData.totalWatched / 60),
            averageVideoProgressPerLesson: averageVideoProgress,
            isCompleted:
              completedLessonsCount === totalLessons && totalLessons > 0,
          },
          lastAccessed: userEnrollment?.enrolledAt || null,
          completedAt: userEnrollment?.completedAt || null,
        };
      });

      // ── Calculate overall organization progress ────────────────────────────
      const totalCourses = formattedCourses.length;
      const enrolledCourses = formattedCourses.filter((c) => c.isEnrolled);
      const completedCourses = formattedCourses.filter(
        (c) => c.progress.isCompleted,
      );

      let overallProgress = 0;
      if (totalCourses > 0) {
        const totalProgress = formattedCourses.reduce(
          (sum, c) => sum + c.progress.percentage,
          0,
        );
        overallProgress = Math.round(totalProgress / totalCourses);
      }

      let translatedText = null;
      if (formattedCourses.length > 0 && language && languageCode) {
        try {
          translatedText = await TranslateText(
            formattedCourses[0].course_description,
            language,
            languageCode,
          );
        } catch (translationError) {
          console.error("Translation error:", translationError);
        }
      }

      this.setStatus(200);
      return {
        message: "Organization courses fetched successfully",
        data: {
          courses: formattedCourses,
          organizationId,
          organizationName: organization.organization_name,
          level: userLevel,
          totalCourses: totalCourses,
          language: language ?? null,
          languageCode: languageCode ?? null,
          translatedText: translatedText ?? null,
          // ── Overall progress stats ──
          overallProgress: {
            percentage: overallProgress,
            enrolledCourses: enrolledCourses.length,
            completedCourses: completedCourses.length,
            totalCourses: totalCourses,
          },
        },
      };
    } catch (error: any) {
      console.error("Error in GetCoursesByOrganization:", error);
      this.setStatus(500);
      return {
        message: "Error fetching organization courses: " + error.message,
        data: null,
      };
    }
  }

  // Add this to your OrganizationController class

@Security("bearerAuth")
@Get("/courses-with-stats/{organizationId}")
public async GetOrganizationCoursesWithStats(
  @Path() organizationId: string,
  @Request() req: any,
): Promise<any> {
  try {
    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        organization_name: true,
        organization_type: true,
        organization_image: true,
      },
    });

    if (!organization) {
      this.setStatus(404);
      return {
        success: false,
        message: "Organization not found",
      };
    }

    // Get all courses for this organization with their modules
    const courses = await prisma.course.findMany({
      where: {
        organizationId: organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        module: {
          include: {
            lesson: true,
          },
        },
        createdByDetails: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            user_pic: true,
          },
        },
        enrollment: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email_address: true,
                user_pic: true,
              },
            },
          },
        },
        progress: true,
        _count: {
          select: {
            enrollment: true,
          },
        },
      },
    });

    // Get all organization members for progress calculation
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: organizationId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });
    const memberIds = members.map((m) => m.userId);

    // Get total active members count
    const totalMembers = memberIds.length;

    // Calculate stats for each course
    const courseStats = await Promise.all(
      courses.map(async (course) => {
        // Get all enrollments for this course
        const enrollments = course.enrollment;
        const totalEnrolled = enrollments.length;

        // Count completed enrollments
        const completedEnrollments = enrollments.filter(
          (e) => e.status === "COMPLETED"
        ).length;

        // Count in-progress enrollments
        const inProgressEnrollments = enrollments.filter(
          (e) => e.status === "IN_PROGRESS" || e.status === "ENROLLED"
        ).length;

        // Calculate completion rate
        const completionRate = totalEnrolled > 0
          ? Math.round((completedEnrollments / totalEnrolled) * 100)
          : 0;

        // Get all lessons in the course
        const allLessons = course.module.flatMap((m) => m.lesson);
        const totalLessons = allLessons.length;

        // Calculate progress for each enrolled student
        const studentProgress = await Promise.all(
          enrollments.map(async (enrollment) => {
            // Get completed lessons for this student in this course
            const completedLessons = await prisma.progress.findMany({
              where: {
                userId: enrollment.userId,
                lesson: {
                  module: {
                    courseId: course.id,
                  },
                },
                progressBar: { gte: 100 },
              },
              select: {
                lessonId: true,
              },
            });

            // Get video tracking progress
            const videoProgress = await prisma.videoTracker.findMany({
              where: {
                progress: {
                  userId: enrollment.userId,
                },
                lesson: {
                  module: {
                    courseId: course.id,
                  },
                },
              },
              select: {
                videoTrackTime: true,
                videoFinished: true,
                lesson: {
                  select: {
                    duration: true,
                  },
                },
              },
            });

            const completedLessonIds = new Set(
              completedLessons.map((p) => p.lessonId)
            );
            const completedCount = completedLessonIds.size;

            // Calculate video progress
            let totalVideoProgress = 0;
            let totalVideoDuration = 0;
            videoProgress.forEach((vp) => {
              totalVideoProgress += vp.videoTrackTime || 0;
              totalVideoDuration += vp.lesson?.duration || 0;
            });

            const videoPercentage = totalVideoDuration > 0
              ? Math.min(Math.round((totalVideoProgress / totalVideoDuration) * 100), 100)
              : 0;

            // Overall progress: 70% lesson completion + 30% video progress
            const lessonPercentage = totalLessons > 0
              ? Math.round((completedCount / totalLessons) * 100)
              : 0;

            const overallProgress = Math.round(
              (lessonPercentage * 0.7) + (videoPercentage * 0.3)
            );

            return {
              userId: enrollment.userId,
              userName: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
              userPic: enrollment.user.user_pic,
              status: enrollment.status,
              completedLessons: completedCount,
              totalLessons: totalLessons,
              lessonProgress: lessonPercentage,
              videoProgress: videoPercentage,
              overallProgress: Math.min(overallProgress, 100),
              startedAt: enrollment.startedAt,
              completedAt: enrollment.completedAt,
            };
          })
        );

        // Calculate average progress across all students
        const totalProgress = studentProgress.reduce(
          (sum, s) => sum + s.overallProgress,
          0
        );
        const averageProgress = studentProgress.length > 0
          ? Math.round(totalProgress / studentProgress.length)
          : 0;

        // Count students with progress > 0 (active students)
        const activeStudents = studentProgress.filter(
          (s) => s.overallProgress > 0
        ).length;

        // Count students with 100% progress (completed)
        const completedStudents = studentProgress.filter(
          (s) => s.overallProgress === 100
        ).length;

        // Get module and lesson counts
        const moduleCount = course.module.length;
        const lessonCount = allLessons.length;

        return {
          id: course.id,
          course_title: course.course_title,
          course_short_description: course.course_short_description,
          course_description: course.course_description,
          course_level: course.course_level,
          course_image: course.course_image,
          createdBy: course.createdByDetails
            ? `${course.createdByDetails.first_name} ${course.createdByDetails.last_name}`
            : "Unknown",
          createdByPic: course.createdByDetails?.user_pic || null,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
          stats: {
            // Enrollment stats
            totalEnrollments: totalEnrolled,
            completedEnrollments: completedEnrollments,
            inProgressEnrollments: inProgressEnrollments,
            completionRate: completionRate,
            dropOutRate: totalEnrolled > 0
              ? Math.round(((totalEnrolled - completedEnrollments - inProgressEnrollments) / totalEnrolled) * 100)
              : 0,

            // Course structure
            moduleCount: moduleCount,
            lessonCount: lessonCount,
            totalDuration: course.module.reduce((acc, m) => {
              const durationSum = m.lesson.reduce(
                (sum, l) => sum + (l.duration || 0),
                0
              );
              return acc + durationSum;
            }, 0),

            // Student progress stats
            totalStudents: totalEnrolled,
            activeStudents: activeStudents,
            completedStudents: completedStudents,
            averageProgress: averageProgress,

            // Student progress details
            studentProgress: studentProgress,

            // Percentage of students who started
            engagementRate: totalMembers > 0
              ? Math.round((totalEnrolled / totalMembers) * 100)
              : 0,
          },
        };
      })
    );

    // Calculate overall organization stats
    const totalCourses = courseStats.length;
    const totalEnrollmentsAcrossAllCourses = courseStats.reduce(
      (sum, c) => sum + c.stats.totalEnrollments,
      0
    );
    const totalCompletedAcrossAllCourses = courseStats.reduce(
      (sum, c) => sum + c.stats.completedEnrollments,
      0
    );
    const totalLessonsAcrossAllCourses = courseStats.reduce(
      (sum, c) => sum + c.stats.lessonCount,
      0
    );
    const totalModulesAcrossAllCourses = courseStats.reduce(
      (sum, c) => sum + c.stats.moduleCount,
      0
    );

    // Calculate overall average progress
    const overallAvgProgress = courseStats.length > 0
      ? Math.round(
          courseStats.reduce((sum, c) => sum + c.stats.averageProgress, 0) /
            courseStats.length
        )
      : 0;

    this.setStatus(200);
    return {
      success: true,
      message: "Organization courses with stats fetched successfully",
      data: {
        organization: {
          id: organization.id,
          name: organization.organization_name,
          type: organization.organization_type,
          image: organization.organization_image,
        },
        summary: {
          totalCourses: totalCourses,
          totalEnrollments: totalEnrollmentsAcrossAllCourses,
          totalCompletions: totalCompletedAcrossAllCourses,
          totalModules: totalModulesAcrossAllCourses,
          totalLessons: totalLessonsAcrossAllCourses,
          overallAverageProgress: overallAvgProgress,
          overallCompletionRate: totalEnrollmentsAcrossAllCourses > 0
            ? Math.round(
                (totalCompletedAcrossAllCourses / totalEnrollmentsAcrossAllCourses) *
                  100
              )
            : 0,
        },
        courses: courseStats,
      },
    };
  } catch (error: any) {
    console.error("Error fetching courses with stats:", error);
    this.setStatus(500);
    return {
      success: false,
      message: "Failed to fetch courses with stats",
      error: error.message,
    };
  }
}

  @Security("bearerAuth")
  @Post("/logout")
  public async Logout(@Request() req: any): Promise<any> {
    const orgId = req.org?.id;

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        isOnline: false,
        lastActive: new Date(),
      },
    });

    if (req.res) {
      req.res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });
    }

    this.setStatus(200);
    return { message: "Logout successful" };
  }

  @Security("bearerAuth")
  @Delete("/members/{organizationId}/{userId}")
  public async RemoveMember(
    @Path() organizationId: string,
    @Path() userId: string,
    @Request() req: any
  ): Promise<any> {
    try {
      const requesterRole = req.user?.role;
      if (requesterRole !== "org_admin") {
        this.setStatus(403);
        return { success: false, message: "Only organization admins can remove members" };
      }

      // Delete the organization member relationship
      await prisma.organizationMember.deleteMany({
        where: {
          organizationId: organizationId,
          userId: userId,
        },
      });

      this.setStatus(200);
      return { success: true, message: "Member removed successfully" };
    } catch (error: any) {
      console.error("Error removing member:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to remove member", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Put("/members/{organizationId}/{userId}/suspend")
  public async SuspendMember(
    @Path() organizationId: string,
    @Path() userId: string,
    @Body() body: { suspend: boolean },
    @Request() req: any
  ): Promise<any> {
    try {
      const requesterRole = req.user?.role;
      if (requesterRole !== "org_admin") {
        this.setStatus(403);
        return { success: false, message: "Only organization admins can suspend members" };
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isSuspended: body.suspend },
      });

      this.setStatus(200);
      return {
        success: true,
        message: body.suspend ? "Member suspended successfully" : "Member restored successfully",
      };
    } catch (error: any) {
      console.error("Error suspending member:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to update member status", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Post("/announcements/{organizationId}")
  public async CreateAnnouncement(
    @Path() organizationId: string,
    @Body()
    body: {
      title: string;
      message: string;
      audience: "all" | "students" | "instructors" | "specific";
      targetUserIds?: string[];
    },
    @Request() req: any
  ): Promise<any> {
    try {
      const requesterRole = req.user?.role;
      if (requesterRole !== "org_admin") {
        this.setStatus(403);
        return { success: false, message: "Only organization admins can create announcements" };
      }

      if (!body.title || !body.message) {
        this.setStatus(400);
        return { success: false, message: "Title and message are required" };
      }

      // Get organization members
      const members = await prisma.organizationMember.findMany({
        where: { organizationId },
        include: { user: true },
      });

      // Filter members based on audience
      let targetMembers = members;
      if (body.audience === "students") {
        targetMembers = members.filter((m) => m.user.role === "student");
      } else if (body.audience === "instructors") {
        targetMembers = members.filter((m) => m.user.role === "instructor");
      } else if (body.audience === "specific" && body.targetUserIds) {
        targetMembers = members.filter((m) => body.targetUserIds?.includes(m.userId));
      }

      // Create announcement notifications for each target member
      const notifications = targetMembers.map((member) => ({
        title: body.title,
        message: body.message,
        type: "ANNOUNCEMENT",
        userId: member.userId,
        organizationId: organizationId,
        createdAt: new Date(),
      }));

      if (notifications.length > 0) {
        await prisma.notification.createMany({ data: notifications as any });
      }

      this.setStatus(201);
      return {
        success: true,
        message: "Announcement created and sent successfully",
        data: { recipientCount: targetMembers.length },
      };
    } catch (error: any) {
      console.error("Error creating announcement:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to create announcement", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/announcements/{organizationId}")
  public async GetAnnouncements(
    @Path() organizationId: string,
    @Request() req: any
  ): Promise<any> {
    try {
      const announcements = await prisma.notification.findMany({
        where: {
          organizationId: organizationId,
          type: "ANNOUNCEMENT",
          userId: req.user?.id,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      this.setStatus(200);
      return { success: true, data: announcements };
    } catch (error: any) {
      console.error("Error fetching announcements:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to fetch announcements", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Post("/events/{organizationId}")
  public async CreateEvent(
    @Path() organizationId: string,
    @Body()
    body: {
      name: string;
      description: string;
      date: string;
      time: string;
      location?: string;
      capacity?: number;
      type: string;
    },
    @Request() req: any
  ): Promise<any> {
    try {
      const requesterRole = req.user?.role;
      if (requesterRole !== "org_admin") {
        this.setStatus(403);
        return { success: false, message: "Only organization admins can create events" };
      }

      if (!body.name || !body.date || !body.time) {
        this.setStatus(400);
        return { success: false, message: "Name, date, and time are required" };
      }

      const event = await prisma.organizationEvent.create({
        data: {
          name: body.name,
          description: body.description || "",
          date: new Date(body.date),
          time: body.time,
          location: body.location || "",
          capacity: body.capacity || 100,
          type: body.type || "general",
          organizationId: organizationId,
          createdBy: req.user?.id,
          status: "upcoming",
        },
      });

      this.setStatus(201);
      return { success: true, message: "Event created successfully", data: event };
    } catch (error: any) {
      console.error("Error creating event:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to create event", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/events/{organizationId}")
  public async GetEvents(
    @Path() organizationId: string,
    @Request() req: any
  ): Promise<any> {
    try {
      const events = await prisma.organizationEvent.findMany({
        where: { organizationId },
        orderBy: { date: "asc" },
        include: {
          _count: { select: { attendees: true } },
        },
      });

      const eventsWithAttendeeCount = events.map(({ _count, ...event }) => ({
        ...event,
        attendees: _count.attendees,
      }));

      this.setStatus(200);
      return { success: true, data: eventsWithAttendeeCount };
    } catch (error: any) {
      console.error("Error fetching events:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to fetch events", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Put("/events/{organizationId}/{eventId}")
  public async UpdateEvent(
    @Path() organizationId: string,
    @Path() eventId: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      date?: string;
      time?: string;
      location?: string;
      capacity?: number;
      status?: string;
    },
    @Request() req: any
  ): Promise<any> {
    try {
      const requesterRole = req.user?.role;
      if (requesterRole !== "org_admin") {
        this.setStatus(403);
        return { success: false, message: "Only organization admins can update events" };
      }

      const event = await prisma.organizationEvent.update({
        where: { id: eventId },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.description && { description: body.description }),
          ...(body.date && { date: new Date(body.date) }),
          ...(body.time && { time: body.time }),
          ...(body.location !== undefined && { location: body.location }),
          ...(body.capacity && { capacity: body.capacity }),
          ...(body.status && { status: body.status }),
        },
      });

      this.setStatus(200);
      return { success: true, message: "Event updated successfully", data: event };
    } catch (error: any) {
      console.error("Error updating event:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to update event", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Delete("/events/{organizationId}/{eventId}")
  public async DeleteEvent(
    @Path() organizationId: string,
    @Path() eventId: string,
    @Request() req: any
  ): Promise<any> {
    try {
      const requesterRole = req.user?.role;
      if (requesterRole !== "org_admin") {
        this.setStatus(403);
        return { success: false, message: "Only organization admins can delete events" };
      }

      await prisma.organizationEvent.delete({
        where: { id: eventId },
      });

      this.setStatus(200);
      return { success: true, message: "Event deleted successfully" };
    } catch (error: any) {
      console.error("Error deleting event:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to delete event", error: error.message };
    }
  }
}
