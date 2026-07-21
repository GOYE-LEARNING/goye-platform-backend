import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Path,
  Body,
  Request,
  Route,
  Security,
  Tags,
} from "tsoa";
import prisma from "../db";
import { SendEmail } from "../utils/sendmail";
import { NotificationService, Role } from "../services/notificationServices";

@Route("super-admin")
@Tags("Super Admin Controllers")
export class SuperAdminController extends Controller {
  // Every endpoint here is platform-wide (spans every organization and
  // individual account), so access is restricted to accounts whose
  // AdminProfile.role is specifically "super_admin" — not just any
  // goye_admin account (content_admin/user_admin stay on the existing
  // single-scope /dashboard/admin experience).
  private async requireSuperAdmin(req: any): Promise<boolean> {
    if (!req.user || req.user.role !== "goye_admin") {
      this.setStatus(403);
      return false;
    }
    const adminProfile = await prisma.adminProfile.findUnique({
      where: { userId: req.user.id },
    });
    if ((adminProfile?.role || "super_admin") !== "super_admin") {
      this.setStatus(403);
      return false;
    }
    return true;
  }

  @Security("bearerAuth")
  @Get("/overview")
  public async GetOverview(@Request() req: any): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    try {
      const [
        totalOrganizations,
        totalCourses,
        totalEnrollments,
        completedEnrollments,
        totalOrganizationMembers,
        usersByRole,
        organizationsByType,
        recentUsers,
        suspendedOrganizations,
      ] = await Promise.all([
        prisma.organization.count(),
        prisma.course.count(),
        prisma.enrollment.count(),
        prisma.enrollment.count({ where: { status: "COMPLETED" } }),
        prisma.organizationMember.count({ where: { isActive: true } }),
        prisma.user.groupBy({
          by: ["role"],
          _count: { role: true },
        }),
        prisma.organization.groupBy({
          by: ["organization_type"],
          _count: { organization_type: true },
        }),
        prisma.user.findMany({
          select: { createdAt: true },
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.organization.count({ where: { isSuspended: true } }),
      ]);

      const totalUsers = usersByRole.reduce((sum, r) => sum + r._count.role, 0);

      // Bucket the last 30 days of signups into daily counts for a trend
      // chart. Done in JS rather than a raw SQL date_trunc so this stays
      // portable across the standard Prisma client.
      const signupsByDay: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        signupsByDay[day] = 0;
      }
      recentUsers.forEach((u) => {
        const day = u.createdAt.toISOString().slice(0, 10);
        if (day in signupsByDay) signupsByDay[day]++;
      });

      this.setStatus(200);
      return {
        success: true,
        data: {
          totalOrganizations,
          suspendedOrganizations,
          totalUsers,
          totalCourses,
          totalEnrollments,
          completedEnrollments,
          totalOrganizationMembers,
          usersByRole: usersByRole.map((r) => ({
            role: r.role,
            count: r._count.role,
          })),
          organizationsByType: organizationsByType.map((o) => ({
            type: o.organization_type,
            count: o._count.organization_type,
          })),
          signupsLast30Days: Object.entries(signupsByDay).map(([date, count]) => ({
            date,
            count,
          })),
        },
      };
    } catch (error: any) {
      console.error("Error fetching super admin overview:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to fetch overview", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/organizations")
  public async GetAllOrganizations(@Request() req: any): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    try {
      const organizations = await prisma.organization.findMany({
        select: {
          id: true,
          organization_name: true,
          organization_type: true,
          organization_email: true,
          organization_country: true,
          isVerified: true,
          isSuspended: true,
          isOnline: true,
          createdAt: true,
          _count: {
            select: { members: true, course: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      this.setStatus(200);
      return {
        success: true,
        data: organizations.map((org) => ({
          id: org.id,
          name: org.organization_name,
          type: org.organization_type,
          email: org.organization_email,
          country: org.organization_country,
          isVerified: org.isVerified,
          isSuspended: org.isSuspended,
          isOnline: org.isOnline,
          createdAt: org.createdAt,
          memberCount: org._count.members,
          courseCount: org._count.course,
        })),
      };
    } catch (error: any) {
      console.error("Error fetching organizations:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to fetch organizations", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Put("/organizations/{organizationId}/suspend")
  public async SuspendOrganization(
    @Path() organizationId: string,
    @Body() body: { suspend: boolean },
    @Request() req: any,
  ): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    try {
      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: { isSuspended: body.suspend },
      });

      this.setStatus(200);
      return {
        success: true,
        message: body.suspend
          ? "Organization suspended successfully"
          : "Organization reactivated successfully",
        data: organization,
      };
    } catch (error: any) {
      console.error("Error suspending organization:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to update organization status", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/activity")
  public async GetPlatformActivity(@Request() req: any): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    try {
      const [recentUsers, recentOrganizations, recentCourses] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email_address: true,
            role: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.organization.findMany({
          select: {
            id: true,
            organization_name: true,
            organization_type: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.course.findMany({
          select: {
            id: true,
            course_title: true,
            organizationName: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ]);

      const activity = [
        ...recentUsers.map((u) => ({
          type: "user_signup" as const,
          id: u.id,
          title: `${u.first_name} ${u.last_name}`.trim(),
          detail: `New ${u.role} account (${u.email_address})`,
          createdAt: u.createdAt,
        })),
        ...recentOrganizations.map((o) => ({
          type: "organization_created" as const,
          id: o.id,
          title: o.organization_name,
          detail: `New ${o.organization_type.toLowerCase()} organization`,
          createdAt: o.createdAt,
        })),
        ...recentCourses.map((c) => ({
          type: "course_created" as const,
          id: c.id,
          title: c.course_title,
          detail: c.organizationName
            ? `New course in ${c.organizationName}`
            : "New independent course",
          createdAt: c.createdAt,
        })),
      ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 30);

      this.setStatus(200);
      return { success: true, data: activity };
    } catch (error: any) {
      console.error("Error fetching platform activity:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to fetch activity", error: error.message };
    }
  }

  // ── COURSES ────────────────────────────────────────────────────────────
  @Security("bearerAuth")
  @Get("/courses")
  public async GetAllCourses(@Request() req: any): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    try {
      const courses = await prisma.course.findMany({
        select: {
          id: true,
          course_title: true,
          course_level: true,
          course_image: true,
          organizationName: true,
          createdAt: true,
          createdByDetails: {
            select: { first_name: true, last_name: true, email_address: true },
          },
          _count: { select: { enrollment: true, module: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      this.setStatus(200);
      return {
        success: true,
        data: courses.map((c) => ({
          id: c.id,
          title: c.course_title,
          level: c.course_level,
          image: c.course_image,
          organizationName: c.organizationName,
          creator: c.createdByDetails
            ? `${c.createdByDetails.first_name} ${c.createdByDetails.last_name}`.trim()
            : "Unknown",
          creatorEmail: c.createdByDetails?.email_address ?? null,
          enrollmentCount: c._count.enrollment,
          moduleCount: c._count.module,
          createdAt: c.createdAt,
        })),
      };
    } catch (error: any) {
      console.error("Error fetching all courses:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to fetch courses", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Delete("/courses/{courseId}")
  public async DeleteCourse(
    @Path() courseId: string,
    @Request() req: any,
  ): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    try {
      await prisma.course.delete({ where: { id: courseId } });
      this.setStatus(200);
      return { success: true, message: "Course deleted successfully" };
    } catch (error: any) {
      console.error("Error deleting course:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to delete course", error: error.message };
    }
  }

  // ── USERS ──────────────────────────────────────────────────────────────
  @Security("bearerAuth")
  @Get("/users")
  public async GetAllUsers(@Request() req: any): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email_address: true,
          role: true,
          userType: true,
          level: true,
          user_pic: true,
          country: true,
          isOnline: true,
          isVerified: true,
          isSuspended: true,
          lastActive: true,
          createdAt: true,
          _count: { select: { enrollment: true, Courses: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      this.setStatus(200);
      return {
        success: true,
        data: users.map((u) => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name}`.trim(),
          email: u.email_address,
          role: u.role,
          userType: u.userType,
          level: u.level,
          profilePic: u.user_pic,
          country: u.country,
          isOnline: u.isOnline,
          isVerified: u.isVerified,
          isSuspended: u.isSuspended,
          lastActive: u.lastActive,
          createdAt: u.createdAt,
          enrollmentCount: u._count.enrollment,
          courseCount: u._count.Courses,
        })),
      };
    } catch (error: any) {
      console.error("Error fetching all users:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to fetch users", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/users/{userId}")
  public async GetUserDetail(
    @Path() userId: string,
    @Request() req: any,
  ): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email_address: true,
          phone_number: true,
          role: true,
          userType: true,
          level: true,
          point: true,
          user_pic: true,
          country: true,
          state: true,
          isOnline: true,
          isVerified: true,
          isSuspended: true,
          lastActive: true,
          createdAt: true,
          enrollment: {
            select: {
              id: true,
              status: true,
              enrolledAt: true,
              completedAt: true,
              course: { select: { id: true, course_title: true, course_level: true } },
            },
            orderBy: { enrolledAt: "desc" },
          },
          organizationMemberships: {
            where: { isActive: true },
            select: {
              role: true,
              joinedAt: true,
              organization: { select: { id: true, organization_name: true } },
            },
          },
        },
      });

      if (!user) {
        this.setStatus(404);
        return { success: false, message: "User not found" };
      }

      this.setStatus(200);
      return {
        success: true,
        data: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`.trim(),
          email: user.email_address,
          phone: user.phone_number,
          role: user.role,
          userType: user.userType,
          level: user.level,
          points: user.point ?? 0,
          profilePic: user.user_pic,
          country: user.country,
          state: user.state,
          isOnline: user.isOnline,
          isVerified: user.isVerified,
          isSuspended: user.isSuspended,
          lastActive: user.lastActive,
          createdAt: user.createdAt,
          enrollments: user.enrollment.map((e) => ({
            id: e.id,
            status: e.status,
            enrolledAt: e.enrolledAt,
            completedAt: e.completedAt,
            courseId: e.course?.id,
            courseTitle: e.course?.course_title,
            courseLevel: e.course?.course_level,
          })),
          memberships: user.organizationMemberships.map((m) => ({
            role: m.role,
            joinedAt: m.joinedAt,
            organizationId: m.organization?.id,
            organizationName: m.organization?.organization_name,
          })),
        },
      };
    } catch (error: any) {
      console.error("Error fetching user detail:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to fetch user detail", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Put("/users/{userId}/suspend")
  public async SuspendUser(
    @Path() userId: string,
    @Body() body: { suspend: boolean },
    @Request() req: any,
  ): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isSuspended: body.suspend },
      });
      this.setStatus(200);
      return {
        success: true,
        message: body.suspend ? "User suspended" : "User reactivated",
      };
    } catch (error: any) {
      console.error("Error suspending user:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to update user", error: error.message };
    }
  }

  // ── EVENTS ─────────────────────────────────────────────────────────────
  @Security("bearerAuth")
  @Get("/events")
  public async GetAllEvents(@Request() req: any): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    try {
      const events = await prisma.organizationEvent.findMany({
        include: {
          organization: { select: { organization_name: true } },
          _count: { select: { attendees: true } },
        },
        orderBy: { date: "desc" },
      });

      this.setStatus(200);
      return {
        success: true,
        data: events.map((e) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          date: e.date,
          time: e.time,
          location: e.location,
          type: e.type,
          status: e.status,
          capacity: e.capacity,
          organizationName: e.organization?.organization_name ?? "Unknown",
          attendees: e._count.attendees,
          createdAt: e.createdAt,
        })),
      };
    } catch (error: any) {
      console.error("Error fetching all events:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to fetch events", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Delete("/events/{eventId}")
  public async DeleteEvent(
    @Path() eventId: string,
    @Request() req: any,
  ): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    try {
      await prisma.organizationEvent.delete({ where: { id: eventId } });
      this.setStatus(200);
      return { success: true, message: "Event deleted successfully" };
    } catch (error: any) {
      console.error("Error deleting event:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to delete event", error: error.message };
    }
  }

  // ── ANNOUNCEMENTS (in-app, platform-wide) ────────────────────────────────
  @Security("bearerAuth")
  @Post("/announcements")
  public async CreateAnnouncement(
    @Body()
    body: {
      title: string;
      message: string;
      audience?: "all" | "students" | "tutors" | "org_admins";
    },
    @Request() req: any,
  ): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    if (!body.title?.trim() || !body.message?.trim()) {
      this.setStatus(400);
      return { success: false, message: "Title and message are required" };
    }

    try {
      const audience = body.audience || "all";
      const roleFilter =
        audience === "students"
          ? { role: "student" }
          : audience === "tutors"
            ? { role: { in: ["tutor", "instructor"] } }
            : audience === "org_admins"
              ? { role: "org_admin" }
              : {};

      const users = await prisma.user.findMany({
        where: roleFilter as any,
        select: { id: true },
      });

      const notifications = users.map((u) => ({
        title: body.title,
        message: body.message,
        type: "SYSTEM_ANNOUNCEMENT",
        role: Role.ADMIN,
        to: Role.STUDENT,
        userId: u.id,
      }));

      const result = await NotificationService.createBulkNotifications(notifications);

      this.setStatus(201);
      return {
        success: true,
        message: "Announcement sent",
        data: { recipientCount: result.count },
      };
    } catch (error: any) {
      console.error("Error creating announcement:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to send announcement", error: error.message };
    }
  }

  // ── EMAIL BROADCAST ──────────────────────────────────────────────────────
  @Security("bearerAuth")
  @Post("/email")
  public async SendBroadcastEmail(
    @Body()
    body: {
      subject: string;
      message: string;
      audience?: "all" | "students" | "tutors" | "org_admins";
    },
    @Request() req: any,
  ): Promise<any> {
    if (!(await this.requireSuperAdmin(req))) {
      return { success: false, message: "Super admin access required" };
    }

    if (!body.subject?.trim() || !body.message?.trim()) {
      this.setStatus(400);
      return { success: false, message: "Subject and message are required" };
    }

    try {
      const audience = body.audience || "all";
      const roleFilter =
        audience === "students"
          ? { role: "student" }
          : audience === "tutors"
            ? { role: { in: ["tutor", "instructor"] } }
            : audience === "org_admins"
              ? { role: "org_admin" }
              : {};

      const users = await prisma.user.findMany({
        where: roleFilter as any,
        select: { email_address: true, first_name: true },
      });

      // Send sequentially and tolerate individual failures so one bad
      // address doesn't abort the whole broadcast. Brevo rate limits apply
      // at scale; fine for the platform's current size.
      let sent = 0;
      let failed = 0;
      for (const u of users) {
        if (!u.email_address) continue;
        try {
          await SendEmail(
            u.email_address,
            body.subject,
            body.message,
            "broadcast",
            { userName: u.first_name, heading: body.subject },
          );
          sent++;
        } catch (err) {
          failed++;
          console.error(`Broadcast email failed for ${u.email_address}:`, err);
        }
      }

      this.setStatus(200);
      return {
        success: true,
        message: `Email sent to ${sent} user(s)${failed ? `, ${failed} failed` : ""}`,
        data: { sent, failed },
      };
    } catch (error: any) {
      console.error("Error sending broadcast email:", error);
      this.setStatus(500);
      return { success: false, message: "Failed to send email", error: error.message };
    }
  }
}
