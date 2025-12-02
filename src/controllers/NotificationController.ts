// controllers/NotificationController.ts
import { Controller, Get, Post, Put, Delete, Request, Security, Route, Tags, Body, Path } from "tsoa";
import prisma from "../db";
import { NotificationService } from "../services/notificationServices";


@Route("notifications")
@Tags("Notifications")
export class NotificationController extends Controller {
  
  /**
   * Get all notifications for the current user's role
   * GET /notifications
   */
  @Security("bearerAuth")
  @Get("/fetch-all-notification")
  public async getMyNotifications(@Request() req: any) {
    const userId = req.user?.id;
    const userRole = req.user?.role 
    
    if (!userId || !userRole) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      const notifications = await prisma.notification.findMany({
        where: {
          OR: [
            // Notifications sent to user's role
            { to: userRole },
            // AND user's personal notifications (if userId is set)
            ...(userId ? [{ userId }] : [])
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            }
          },
          course: {
            select: {
              id: true,
              course_title: true,
              course_image: true,
            }
          },
          group: {
            select: {
              id: true,
              group_title: true,
            }
          }
        }
      });

      return {
        success: true,
        message: "Notifications fetched successfully",
        data: notifications,
        count: notifications.length,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch notifications",
        error: error.message,
      };
    }
  }

  /**
   * Get unread notifications only
   * GET /notifications/unread
   */
  @Security("bearerAuth")
  @Get("/unread")
  public async getUnreadNotifications(@Request() req: any) {
    const userId = req.user?.id;
    const userRole = req.user?.role
    
    if (!userId || !userRole) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      const notifications = await prisma.notification.findMany({
        where: {
          OR: [
            { to: userRole },
            ...(userId ? [{ userId }] : [])
          ],
          isRead: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            }
          }
        }
      });

      return {
        success: true,
        message: "Unread notifications fetched successfully",
        data: notifications,
        unreadCount: notifications.length,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch unread notifications",
        error: error.message,
      };
    }
  }

  /**
   * Get notification counts
   * GET /notifications/counts
   */
  @Security("bearerAuth")
  @Get("/counts")
  public async getNotificationCounts(@Request() req: any) {
    const userId = req.user?.id;
    const userRole = req.user?.role 
    
    if (!userId || !userRole) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      const [total, unread] = await Promise.all([
        prisma.notification.count({
          where: { 
            OR: [
              { to: userRole },
              ...(userId ? [{ userId }] : [])
            ],
          },
        }),
        prisma.notification.count({
          where: { 
            OR: [
              { to: userRole },
              ...(userId ? [{ userId }] : [])
            ],
            isRead: false,
          },
        }),
        prisma.notification.count({
          where: { 
            OR: [
              { to: userRole },
              ...(userId ? [{ userId }] : [])
            ],
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
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to fetch notification counts",
        error: error.message,
      };
    }
  }

  /**
   * Mark a notification as read
   * PUT /notifications/{notificationId}/read
   */
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
      this.setStatus(404);
      return {
        success: false,
        message: "Notification not found or unauthorized",
        error: error.message,
      };
    }
  }

  /**
   * Mark all notifications as read
   * PUT /notifications/read-all
   */
  @Security("bearerAuth")
  @Put("/read-all")
  public async markAllAsRead(@Request() req: any) {
    const userId = req.user?.id;
    const userRole = req.user?.role
    
    if (!userId || !userRole) {
      this.setStatus(401);
      return {
        success: false,
        message: "User is unauthorized",
      };
    }

    try {
      const result = await prisma.notification.updateMany({
        where: {
          OR: [
            { to: userRole },
            { userId: userId }
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
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to mark notifications as read",
        error: error.message,
      };
    }
  }


  /**
   * Delete a notification
   * DELETE /notifications/{notificationId}
   */
  @Security("bearerAuth")
  @Delete("/{notificationId}")
  public async deleteNotification(
    @Request() req: any,
    notificationId: string
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
      // Only allow users to delete their own notifications
      const notification = await prisma.notification.delete({
        where: {
          id: notificationId,
          userId: userId,
        },
      });

      return {
        success: true,
        message: "Notification deleted successfully",
        data: notification,
      };
    } catch (error: any) {
      this.setStatus(404);
      return {
        success: false,
        message: "Notification not found or unauthorized",
        error: error.message,
      };
    }
  }
}