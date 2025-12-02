// controllers/NotificationController.ts - COMPLETE FIXED VERSION
import { Controller, Get, Put, Delete, Request, Security, Route, Tags, Path } from "tsoa";
import prisma from "../db";
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
      // Convert role to uppercase to match Prisma enum
      userRole = userRole.toUpperCase();
      
      // Validate role
      const validRoles = [Role.ADMIN, Role.STUDENT, Role.INSTRUCTOR];
      if (!validRoles.includes(userRole as Role)) {
        this.setStatus(400);
        return {
          success: false,
          message: "Invalid user role",
        };
      }

      const notifications = await prisma.notification.findMany({
        where: {
          OR: [
            { to: userRole },
            { userId: userId },
          ],
        },
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
      // Convert role to uppercase
      userRole = userRole.toUpperCase();
      
      // Validate role
      const validRoles = [Role.ADMIN, Role.STUDENT, Role.INSTRUCTOR];
      if (!validRoles.includes(userRole as Role)) {
        this.setStatus(400);
        return {
          success: false,
          message: "Invalid user role",
        };
      }

      const notifications = await prisma.notification.findMany({
        where: {
          OR: [
            { to: userRole },
            { userId: userId },
          ],
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
        },
      });

      return {
        success: true,
        message: "Unread notifications fetched successfully",
        data: notifications,
        unreadCount: notifications.length,
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
      // Convert role to uppercase
      userRole = userRole.toUpperCase();
      
      // Validate role
      const validRoles = [Role.ADMIN, Role.STUDENT, Role.INSTRUCTOR];
      if (!validRoles.includes(userRole as Role)) {
        this.setStatus(400);
        return {
          success: false,
          message: "Invalid user role",
        };
      }

      const [total, unread] = await Promise.all([
        prisma.notification.count({
          where: {
            OR: [
              { to: userRole },
              { userId: userId },
            ],
          },
        }),
        prisma.notification.count({
          where: {
            OR: [
              { to: userRole },
              { userId: userId },
            ],
            isRead: false,
          },
        }),
      ]);

      return {
        success: true,
        message: "Notification counts fetched successfully",
        data: {
          total,
          unread,
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
    @Path() notificationId: string
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
        userId
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
      // Convert role to uppercase
      userRole = userRole.toUpperCase();
      
      // Validate role
      const validRoles = [Role.ADMIN, Role.STUDENT, Role.INSTRUCTOR];
      if (!validRoles.includes(userRole as Role)) {
        this.setStatus(400);
        return {
          success: false,
          message: "Invalid user role",
        };
      }

      const result = await prisma.notification.updateMany({
        where: {
          OR: [
            { to: userRole },
            { userId: userId },
          ],
          isRead: false,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });

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
  @Delete("/{notificationId}")
  public async deleteNotification(
    @Request() req: any,
    @Path() notificationId: string
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
        userId
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
      const notifications = await NotificationService.getUserNotifications(userId, 50);

      return {
        success: true,
        message: "User notifications fetched successfully",
        data: notifications,
        count: notifications.length,
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
      // Convert role to uppercase
      userRole = userRole.toUpperCase();
      
      // Validate role
      const validRoles = [Role.ADMIN, Role.STUDENT, Role.INSTRUCTOR];
      if (!validRoles.includes(userRole as Role)) {
        this.setStatus(400);
        return {
          success: false,
          message: "Invalid user role",
        };
      }

      const [roleUnread, userUnread] = await Promise.all([
        NotificationService.getUnreadCount(userRole as Role),
        NotificationService.getUnreadCountForUser(userId),
      ]);

      return {
        success: true,
        message: "Unread counts fetched successfully",
        data: {
          roleUnread,
          userUnread,
          totalUnread: roleUnread + userUnread,
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
    @Path() notificationId: string
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
        userId
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
      // Convert role to uppercase
      userRole = userRole.toUpperCase();
      
      // Validate role
      const validRoles = [Role.ADMIN, Role.STUDENT, Role.INSTRUCTOR];
      if (!validRoles.includes(userRole as Role)) {
        this.setStatus(400);
        return {
          success: false,
          message: "Invalid user role",
        };
      }

      // Get all notification IDs for this user/role
      const notifications = await prisma.notification.findMany({
        where: {
          OR: [
            { to: userRole },
            { userId: userId },
          ],
        },
        select: { id: true },
      });

      const notificationIds = notifications.map(n => n.id);

      if (notificationIds.length === 0) {
        return {
          success: true,
          message: "No notifications to clear",
          data: { count: 0 },
        };
      }

      const result = await NotificationService.deleteMultipleNotifications(
        notificationIds,
        userId
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
}