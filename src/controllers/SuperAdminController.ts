import {
  Controller,
  Get,
  Put,
  Path,
  Body,
  Request,
  Route,
  Security,
  Tags,
} from "tsoa";
import prisma from "../db";

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
        totalOrganizationMembers,
        usersByRole,
        recentUsers,
        suspendedOrganizations,
      ] = await Promise.all([
        prisma.organization.count(),
        prisma.course.count(),
        prisma.enrollment.count(),
        prisma.organizationMember.count({ where: { isActive: true } }),
        prisma.user.groupBy({
          by: ["role"],
          _count: { role: true },
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
          totalOrganizationMembers,
          usersByRole: usersByRole.map((r) => ({
            role: r.role,
            count: r._count.role,
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
}
