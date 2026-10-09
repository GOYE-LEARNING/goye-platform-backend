// controllers/NotificationController.ts - COMPLETE WITH FILTER APPLIED
import {
  Controller,
  Get,
  Put,
  Delete,
  Request,
  Security,
  Route,
  Tags,
  Path,
  Post,
  Body,
} from "tsoa";
import prisma from "../db";
import { useCacheAside, CacheKeys, TTL, invalidateNotificationCaches } from "../utils/redis";
import { NotificationService, Role } from "../services/notificationServices";

@Route("notifications")
@Tags("Notification Controller")
export class NotificationController extends Controller {
  @Security("bearerAuth")
  @Get("/fetch-all-notification")
  public async getMyNotifications(@Request() req: any) {
    const userId = req.user?.id;
    let userRole = req.user?.role;

    if (!userId || !userRole) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      userRole = userRole.toUpperCase();

      // ✅ USE THE FILTER
      const { where, settings } =
        await NotificationService.getNotificationFilter(userId, userRole);

      const notifications = await prisma.notification.findMany({
        where: where, // ✅ FILTERED WHERE CLAUSE
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
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
          group: {
            select: {
              id: true,
              group_title: true,
            },
          },
        },
      });

      return {
        success: true,
        message: "Notifications fetched successfully",
        data: notifications,
        count: notifications.length,
        settings: {
          courseNotificationsDisabled: settings.disableCourseNotifications,
          groupNotificationsDisabled: settings.disableGroupNotifications,
        },
      };
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch notifications",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/unread")
  public async getUnreadNotifications(@Request() req: any) {
    const userId = req.user?.id;
    let userRole = req.user?.role;

    if (!userId || !userRole) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      userRole = userRole.toUpperCase();

      // ✅ USE THE FILTER
      const { where, settings } =
        await NotificationService.getNotificationFilter(userId, userRole);

      const notifications = await prisma.notification.findMany({
        where: {
          ...where, // ✅ FILTERED WHERE CLAUSE
          isRead: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
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

      return {
        success: true,
        message: "Unread notifications fetched successfully",
        data: notifications,
        unreadCount: notifications.length,
        settings: {
          courseNotificationsDisabled: settings.disableCourseNotifications,
          groupNotificationsDisabled: settings.disableGroupNotifications,
        },
      };
    } catch (error: any) {
      console.error("Error fetching unread notifications:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch unread notifications",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/counts")
  public async getNotificationCounts(@Request() req: any) {
    const userId = req.user?.id;
    let userRole = req.user?.role;

    if (!userId || !userRole) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      userRole = userRole.toUpperCase();

      // ✅ USE THE FILTER
      const { where, settings } =
        await NotificationService.getNotificationFilter(userId, userRole);

      // The bell badge polls this constantly, so it is one of the highest
      // frequency reads in the app. Only 60s — a notification count that lags
      // longer than that feels broken — and it is explicitly invalidated
      // whenever a notification is created or marked read.
      const { total, unread } = await useCacheAside(
        CacheKeys.notificationCounts(userId),
        TTL.short,
        async () => {
          const [t, u] = await Promise.all([
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { ...where, isRead: false } }),
          ]);
          return { total: t, unread: u };
        },
      );

      return {
        success: true,
        message: "Notification counts fetched successfully",
        data: {
          total,
          unread,
          settings: {
            courseNotificationsDisabled: settings.disableCourseNotifications,
            groupNotificationsDisabled: settings.disableGroupNotifications,
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching notification counts:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch notification counts",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Put("/{notificationId}/read")
  public async markNotificationAsRead(
    @Request() req: any,
    @Path() notificationId: string,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      const notification = await NotificationService.markAsRead(
        notificationId,
        userId,
      );

      return {
        success: true,
        message: "Notification marked as read",
        data: notification,
      };
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      this.setStatus(404);
      return {
        success: false,
        message: "Notification not found or unauthorized",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Put("/read-all")
  public async markAllAsRead(@Request() req: any) {
    const userId = req.user?.id;
    let userRole = req.user?.role;

    if (!userId || !userRole) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      userRole = userRole.toUpperCase();

      // ✅ USE THE FILTER
      const { where } = await NotificationService.getNotificationFilter(
        userId,
        userRole,
      );

      const result = await prisma.notification.updateMany({
        where: {
          ...where, // ✅ FILTERED WHERE CLAUSE
          isRead: false,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });

      // The cached count must clear here or the bell keeps showing unread
      // badges for notifications the user has just read.
      await invalidateNotificationCaches(userId);

      return {
        success: true,
        message: `${result.count} notifications marked as read`,
        data: { count: result.count },
      };
    } catch (error: any) {
      console.error("Error marking all as read:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to mark notifications as read",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Delete("/clear-all")
  public async clearAllNotifications(@Request() req: any) {
    const userId = req.user?.id;
    let userRole = req.user?.role;

    if (!userId || !userRole) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      userRole = userRole.toUpperCase();

      // ✅ USE THE FILTER
      const { where } = await NotificationService.getNotificationFilter(
        userId,
        userRole,
      );

      // Get all notification IDs for this user based on settings
      const notifications = await prisma.notification.findMany({
        where: where, // ✅ FILTERED WHERE CLAUSE
        select: { id: true },
      });

      const notificationIds = notifications.map((n) => n.id);

      if (notificationIds.length === 0) {
        return {
          success: true,
          message: "No notifications to clear",
          data: { count: 0 },
        };
      }

      const result = await NotificationService.deleteMultipleNotifications(
        notificationIds,
        userId,
      );

      return {
        success: true,
        message: `${result.count} notifications cleared successfully`,
        data: { count: result.count },
      };
    } catch (error: any) {
      console.error("Error clearing all notifications:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to clear notifications",
        error: error.message,
      };
    }
  }

  // This must stay registered AFTER the literal "/clear-all" route above —
  // tsoa/Express match routes in declaration order, and this parameterized
  // path would otherwise swallow "clear-all" as a literal notificationId,
  // producing a Prisma "record not found" error on every clear-all request.
  @Security("bearerAuth")
  @Delete("/{notificationId}")
  public async deleteNotification(
    @Request() req: any,
    @Path() notificationId: string,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      const notification = await NotificationService.deleteNotification(
        notificationId,
        userId,
      );

      return {
        success: true,
        message: "Notification deleted successfully",
        data: notification,
      };
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      this.setStatus(404);
      return {
        success: false,
        message: "Notification not found or unauthorized",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/user")
  public async getUserNotifications(@Request() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      const notifications = await NotificationService.getUserNotifications(
        userId,
        50,
      );

      return {
        success: true,
        message: "User notifications fetched successfully",
        data: notifications,
        count: notifications.data.length,
      };
    } catch (error: any) {
      console.error("Error fetching user notifications:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch user notifications",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/unread-count")
  public async getUnreadCount(@Request() req: any) {
    const userId = req.user?.id;
    let userRole = req.user?.role;

    if (!userId || !userRole) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      userRole = userRole.toUpperCase();

      const [roleUnread, userUnread] = await Promise.all([
        NotificationService.getUnreadCount(userId, userRole as Role),
        NotificationService.getUnreadCountForUser(userId),
      ]);

      return {
        success: true,
        message: "Unread counts fetched successfully",
        data: {
          roleUnread,
          userUnread,
          totalUnread: roleUnread.roleUnread + userUnread,
        },
      };
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch unread count",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Put("/{notificationId}/archive")
  public async archiveNotification(
    @Request() req: any,
    @Path() notificationId: string,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      const notification = await NotificationService.archiveNotification(
        notificationId,
        userId,
      );

      return {
        success: true,
        message: "Notification archived successfully",
        data: notification,
      };
    } catch (error: any) {
      console.error("Error archiving notification:", error);
      this.setStatus(404);
      return {
        success: false,
        message: "Notification not found or unauthorized",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Put("/change-notification-settings/{settingsId}")
  public async ChangeNotificationsSettings(
    @Body()
    body: {
      userId?: string | null;
      organizationId?: string | null;
      enable_push_notification: boolean;
      course_updates: boolean;
      event: boolean;
      achievement: boolean;
      daily_reminders: boolean;
      group_activity: boolean;
      email_notification: boolean;
      darkMode: boolean;
    },
    @Request() req: any,
    @Path() settingsId: string,
  ) {
    const userId: string | undefined = req.user?.id;
    const orgId: string | undefined = req.org?.id;

    try {
      if (!userId && !orgId) {
        this.setStatus(401);
        return { success: false, message: "Unauthorized" };
      }

      // The row is addressed by the URL, but a caller may only change a row
      // that belongs to them. The old code trusted a settingsId copied into
      // the JWT, which is missing for accounts without a settings row and made
      // Prisma throw on `where: { id: undefined }` (and org accounts crashed
      // on the user lookup before ever reaching their own branch).
      const existing = await prisma.settings.findUnique({
        where: { id: settingsId },
      });

      const owned =
        !!existing &&
        ((!!userId && existing.userId === userId) ||
          (!!orgId && existing.organizationId === orgId));

      if (!existing || !owned) {
        this.setStatus(404);
        return {
          success: false,
          message: "Notification settings were not found for this account.",
        };
      }

      const changeSettings = await prisma.settings.update({
        where: { id: existing.id },
        data: {
          enable_push_notification: body.enable_push_notification,
          course_updates: body.course_updates,
          event: body.event,
          achievement: body.achievement,
          daily_reminders: body.daily_reminders,
          darkMode: body.darkMode,
          email_notification: body.email_notification,
          group_activity: body.group_activity,
          updatedAt: new Date(),
        },
      });

      this.setStatus(200);
      return {
        message: "Updated Successfully",
        status: 200,
        data: changeSettings,
      };
    } catch (error: any) {
      console.log(`An error occured ${error.message}`);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to update settings",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-annocucment-by-admin")
  public async FetchAnnouncementByAdmin(@Request() req: any) {
    const role = req.user?.role;
    try {
      if (role == "student") {
        const annocumentForStudent = await prisma.notification.findMany({
          where: {
            role: "ADMIN",
            to: "STUDENT",
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        return {
          message: "Annoucement Fetched successfully",
          data: annocumentForStudent,
        };
      } else if (role == "tutor" || role == "instructor") {
        const annocumentForTutors = await prisma.notification.findMany({
          where: {
            role: "ADMIN",
            to: "TUTOR",
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        return {
          message: "Annoucement Fetched successfully",
          data: annocumentForTutors,
        };
      }
      // Any other role (org admin, invited member, etc.) has no announcement
      // feed defined yet — an empty list rather than an unhandled fallthrough
      // (which returned no body at all, breaking the frontend's `data.data`
      // read for anyone besides student/tutor/instructor).
      return { message: "No announcements for this role", data: [] };
    } catch (error) {
      console.error(error);
      return { message: "Failed to fetch announcements", data: [] };
    }
  }
}
