// services/notificationServices.ts - COMPLETE VERSION
import prisma from "../db";
import { SocketService } from "./socketService";

export enum Role {
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
  INSTRUCTOR = "INSTRUCTOR",
  TUTOR = "TUTOR",
  ORG_ADMIN = "ORG_ADMIN",
  ORG_MEMBER = "ORG_MEMBER",
}

export enum NotificationType {
  COURSE_JOIN = "COURSE_JOIN",
  GROUP_JOIN = "GROUP_JOIN",
  MESSAGE = "MESSAGE",
  POST_LIKE = "POST_LIKE",
  POST_COMMENT = "POST_COMMENT",
  SYSTEM_ANNOUNCEMENT = "SYSTEM_ANNOUNCEMENT",
  COURSE_COMPLETION = "COURSE_COMPLETION",
  ACHIEVEMENT_UNLOCKED = "ACHIEVEMENT_UNLOCKED",
  QUIZ_COMPLETED = "QUIZ_COMPLETED",
  EVENT_REMINDER = "EVENT_REMINDER",
  ASSIGNMENT_SUBMITTED = "ASSIGNMENT_SUBMITTED",
  ORG_INVITE = "ORG_INVITE",
  ORG_MEMBER_JOINED = "ORG_MEMBER_JOINED",
  ORG_MEMBER_LEFT = "ORG_MEMBER_LEFT",
  ORG_ROLE_CHANGED = "ORG_ROLE_CHANGED",
}

type Types = "course" | "group" | "message" | "post" | "organization";

interface NotificationData {
  message: string;
  title?: string;
  type: string;
  role: Role;
  to: Role;
  userId: string;
  courseId?: string;
  postId?: string;
  replyId?: string;
  groupId?: string;
  organizationId?: string;
  data?: any;
  image?: string;
}

export class NotificationService {
  private static socketService: SocketService | null = null;

  static initializeSocketService(socketService: SocketService) {
    this.socketService = socketService;
  }

  /**
   * Create a single notification with real-time broadcast
   */
  static async createNotification(data: NotificationData) {
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { 
          id: true, 
          first_name: true, 
          last_name: true,
          user_pic: true 
        },
      });

      if (!userExists) {
        console.error(`User with ID ${data.userId} not found`);
        throw new Error(`User not found: ${data.userId}`);
      }

      const notificationData: any = {
        title: data.title || "Notification",
        message: data.message,
        type: data.type,
        role: data.role,
        to: data.to,
        userId: data.userId,
        isRead: false,
        createdAt: new Date(),
      };

      if (data.courseId) {
        const courseExists = await prisma.course.findUnique({
          where: { id: data.courseId },
          select: { id: true },
        });
        if (courseExists) {
          notificationData.courseId = data.courseId;
        }
      }

      if (data.groupId) {
        const groupExists = await prisma.group.findUnique({
          where: { id: data.groupId },
          select: { id: true },
        });
        if (groupExists) {
          notificationData.groupId = data.groupId;
        }
      }

      if (data.postId) {
        const postExists = await prisma.post.findUnique({
          where: { id: data.postId },
          select: { id: true },
        });
        if (postExists) {
          notificationData.postId = data.postId;
        }
      }

      if (data.replyId) {
        const replyExists = await prisma.reply.findUnique({
          where: { id: data.replyId },
          select: { id: true },
        });
        if (replyExists) {
          notificationData.replyId = data.replyId;
        }
      }

      if (data.organizationId) {
        const orgExists = await prisma.organization.findUnique({
          where: { id: data.organizationId },
          select: { id: true },
        });
        if (orgExists) {
          notificationData.organizationId = data.organizationId;
        }
      }

      const notification = await prisma.notification.create({
        data: notificationData,
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
              group_image: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
          organization: {
            select: {
              id: true,
              organization_name: true,
              organization_image: true,
            },
          },
        },
      });

      if (this.socketService) {
        await this.socketService.broadcastNotification(notification);
        await this.socketService.sendUnreadCount(data.userId);
      }

      return notification;
    } catch (error) {
      console.error("Error in createNotification:", error);
      throw error;
    }
  }

  /**
   * Create multiple notifications at once (BULK)
   */
  static async createBulkNotifications(
    notifications: Array<{
      message: string;
      title?: string;
      type: string;
      role: Role;
      to: Role;
      userId: string;
      courseId?: string;
      groupId?: string;
      organizationId?: string;
      data?: any;
    }>,
  ) {
    if (notifications.length === 0) {
      return { count: 0 };
    }

    try {
      const validNotifications = notifications.filter(
        (n) => n.userId && n.userId.trim() !== "",
      );

      if (validNotifications.length === 0) {
        console.warn("No valid notifications (all missing userId)");
        return { count: 0 };
      }

      const userIds = [...new Set(validNotifications.map(n => n.userId))];
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      });
      
      const existingUserIds = new Set(existingUsers.map(u => u.id));
      const finalNotifications = validNotifications.filter(n => existingUserIds.has(n.userId));

      if (finalNotifications.length === 0) {
        console.warn("No valid users found for notifications");
        return { count: 0 };
      }

      const notificationsWithDefaults = finalNotifications.map((n) => ({
        title: n.title || "Notification",
        message: n.message,
        type: n.type,
        role: n.role,
        to: n.to,
        userId: n.userId,
        courseId: n.courseId,
        groupId: n.groupId,
        organizationId: n.organizationId,
        isRead: false,
        createdAt: new Date(),
      }));

      const result = await prisma.notification.createMany({
        data: notificationsWithDefaults,
        skipDuplicates: true,
      });

      if (this.socketService && result.count > 0) {
        const createdNotifications = await prisma.notification.findMany({
          where: {
            userId: { in: userIds },
            createdAt: {
              gte: new Date(Date.now() - 5000),
            },
          },
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
                group_image: true,
              },
            },
          },
        });

        for (const notification of createdNotifications) {
          await this.socketService.broadcastNotification(notification);
          await this.socketService.sendUnreadCount(notification.userId);
        }
      }

      return result;
    } catch (error) {
      console.error("Error in createBulkNotifications:", error);
      throw error;
    }
  }

  /**
   * GET: Get unread count (combined - for backward compatibility)
   */
  static async getUnreadCount(userId: string, userRole: string) {
    try {
      const role = userRole.toUpperCase() as Role;
      
      const [roleUnread, userUnread] = await Promise.all([
        this.getUnreadCountByRole(role),
        this.getUnreadCountForUser(userId),
      ]);

      return {
        roleUnread,
        userUnread,
        totalUnread: roleUnread + userUnread,
      };
    } catch (error) {
      console.error("Error in getUnreadCount:", error);
      throw error;
    }
  }

  /**
   * GET: Get unread count for a specific user
   */
  static async getUnreadCountForUser(userId: string) {
    try {
      return await prisma.notification.count({
        where: {
          userId: userId,
          isRead: false,
        },
      });
    } catch (error) {
      console.error("Error in getUnreadCountForUser:", error);
      throw error;
    }
  }

  /**
   * GET: Get unread count by role
   */
  static async getUnreadCountByRole(role: Role) {
    try {
      return await prisma.notification.count({
        where: {
          to: role,
          isRead: false,
        },
      });
    } catch (error) {
      console.error("Error in getUnreadCountByRole:", error);
      throw error;
    }
  }

  /**
   * GET: Get unread count for an organization
   */
  static async getUnreadCountForOrganization(organizationId: string) {
    try {
      const members = await prisma.organizationMember.findMany({
        where: { 
          organizationId: organizationId,
          isActive: true 
        },
        select: { userId: true }
      });

      const userIds = members.map(m => m.userId);
      
      return await prisma.notification.count({
        where: {
          userId: { in: userIds },
          organizationId: organizationId,
          isRead: false,
        },
      });
    } catch (error) {
      console.error("Error in getUnreadCountForOrganization:", error);
      throw error;
    }
  }

  /**
   * ARCHIVE: Archive a notification
   */
  static async archiveNotification(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId: userId,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });

      if (this.socketService) {
        await this.socketService.sendUnreadCount(userId);
      }

      return notification;
    } catch (error) {
      console.error("Error in archiveNotification:", error);
      throw error;
    }
  }

  /**
   * MARK: Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId: userId,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });

      if (this.socketService) {
        await this.socketService.sendUnreadCount(userId);
      }

      return notification;
    } catch (error) {
      console.error("Error in markAsRead:", error);
      throw error;
    }
  }

  /**
   * MARK: Mark multiple notifications as read
   */
  static async markMultipleAsRead(notificationIds: string[], userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: userId,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });

      if (this.socketService) {
        await this.socketService.sendUnreadCount(userId);
      }

      return result;
    } catch (error) {
      console.error("Error in markMultipleAsRead:", error);
      throw error;
    }
  }

  /**
   * MARK: Mark all user's notifications as read
   */
  static async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });

      if (this.socketService) {
        await this.socketService.sendUnreadCount(userId);
      }

      return result;
    } catch (error) {
      console.error("Error in markAllAsRead:", error);
      throw error;
    }
  }

  /**
   * GET: Get notifications by user with filtering
   */
  static async getUserNotifications(
    userId: string, 
    limit: number = 50,
    offset: number = 0,
    filter?: { type?: string; read?: boolean; from?: Date; to?: Date; organizationId?: string }
  ) {
    try {
      const where: any = { userId: userId };

      if (filter) {
        if (filter.type) where.type = filter.type;
        if (filter.read !== undefined) where.isRead = filter.read;
        if (filter.from) where.createdAt = { gte: filter.from };
        if (filter.to) where.createdAt = { ...where.createdAt, lte: filter.to };
        if (filter.organizationId) where.organizationId = filter.organizationId;
      }

      const notifications = await prisma.notification.findMany({
        where: where,
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
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
              group_image: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
          organization: {
            select: {
              id: true,
              organization_name: true,
              organization_image: true,
            },
          },
        },
      });

      const total = await prisma.notification.count({ where });

      return {
        data: notifications,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + notifications.length < total,
        },
      };
    } catch (error) {
      console.error("Error in getUserNotifications:", error);
      throw error;
    }
  }

  /**
   * GET: Get notifications for an organization
   */
  static async getOrganizationNotifications(
    organizationId: string,
    limit: number = 50,
    offset: number = 0,
    filter?: { type?: string; read?: boolean; from?: Date; to?: Date }
  ) {
    try {
      const members = await prisma.organizationMember.findMany({
        where: { 
          organizationId: organizationId,
          isActive: true 
        },
        select: { userId: true }
      });

      const userIds = members.map(m => m.userId);

      const where: any = {
        userId: { in: userIds },
        organizationId: organizationId,
      };

      if (filter) {
        if (filter.type) where.type = filter.type;
        if (filter.read !== undefined) where.isRead = filter.read;
        if (filter.from) where.createdAt = { gte: filter.from };
        if (filter.to) where.createdAt = { ...where.createdAt, lte: filter.to };
      }

      const notifications = await prisma.notification.findMany({
        where: where,
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
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
              group_image: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
          organization: {
            select: {
              id: true,
              organization_name: true,
              organization_image: true,
            },
          },
        },
      });

      const total = await prisma.notification.count({ where });

      return {
        data: notifications,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + notifications.length < total,
        },
      };
    } catch (error) {
      console.error("Error in getOrganizationNotifications:", error);
      throw error;
    }
  }

  /**
   * GET: Get notifications by role
   */
  static async getNotificationsByRole(role: Role, limit: number = 50) {
    try {
      return await prisma.notification.findMany({
        where: {
          to: role,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
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
              course_title: true,
            },
          },
          group: {
            select: {
              group_title: true,
            },
          },
          organization: {
            select: {
              organization_name: true,
            },
          },
        },
      });
    } catch (error) {
      console.error("Error in getNotificationsByRole:", error);
      throw error;
    }
  }

  /**
   * DELETE: Delete a notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    try {
      return await prisma.notification.delete({
        where: {
          id: notificationId,
          userId: userId,
        },
      });
    } catch (error) {
      console.error("Error in deleteNotification:", error);
      throw error;
    }
  }

  /**
   * DELETE: Delete multiple notifications
   */
  static async deleteMultipleNotifications(notificationIds: string[], userId: string) {
    try {
      return await prisma.notification.deleteMany({
        where: {
          id: { in: notificationIds },
          userId: userId,
        },
      });
    } catch (error) {
      console.error("Error in deleteMultipleNotifications:", error);
      throw error;
    }
  }

  /**
   * GET: Get notification filter based on user settings - FIXED
   */
  static async getNotificationFilter(userId: string, userRole: string) {
    const userSettings = await prisma.settings.findFirst({
      where: { userId: userId }
    });
    
    const disableCourseNotifications = userSettings?.course_updates === false;
    const disableGroupNotifications = false;
    
    const baseWhere: any = {
      OR: [{ to: userRole }, { userId: userId }]
    };
    
    const excludeConditions = [];
    
    if (disableCourseNotifications) {
      excludeConditions.push({ courseId: { not: null } });
    }
    
    if (disableGroupNotifications) {
      excludeConditions.push({ groupId: { not: null } });
    }
    
    if (excludeConditions.length > 0) {
      baseWhere.NOT = excludeConditions;
    }
    
    return {
      where: baseWhere,
      settings: { 
        disableCourseNotifications, 
        disableGroupNotifications 
      }
    };
  }

  /**
   * GET: Get notification statistics
   */
  static async getNotificationStats(userId: string) {
    try {
      const [total, unread, read, byType, byOrg] = await Promise.all([
        prisma.notification.count({ where: { userId } }),
        prisma.notification.count({ where: { userId, isRead: false } }),
        prisma.notification.count({ where: { userId, isRead: true } }),
        prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: true,
        }),
        prisma.notification.groupBy({
          by: ['organizationId'],
          where: { userId, organizationId: { not: null } },
          _count: true,
        }),
      ]);

      return {
        total,
        unread,
        read,
        byType: byType.map(item => ({
          type: item.type,
          count: item._count,
        })),
        byOrganization: byOrg.map(item => ({
          organizationId: item.organizationId,
          count: item._count,
        })),
      };
    } catch (error) {
      console.error("Error in getNotificationStats:", error);
      throw error;
    }
  }

  // ============================================================
  // SYSTEM ANNOUNCEMENT
  // ============================================================

  /**
   * SYSTEM ANNOUNCEMENT: Create announcement for all users of a specific role
   */
  static async createSystemAnnouncement(
    title: string,
    message: string,
    to: Role,
    type: Types = "message",
    organizationId?: string
  ) {
    try {
      // Get all users of the target role
      const users = await prisma.user.findMany({
        where: {
          role: {
            equals: to,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (users.length === 0) {
        console.log(`No users found with role: ${to}`);
        return { count: 0 };
      }

      // Prepare notifications for all users
      const notificationData = users.map((user) => ({
        title: title,
        message: message,
        type: type,
        role: Role.ADMIN,
        to: to,
        userId: user.id,
        organizationId: organizationId,
        data: {
          announcementType: "system",
          createdAt: new Date(),
        },
      }));

      // Create all notifications
      return await this.createBulkNotifications(notificationData);
    } catch (error) {
      console.error("Error in createSystemAnnouncement:", error);
      throw error;
    }
  }

  // ============================================================
  // ORGANIZATION-SPECIFIC NOTIFICATION METHODS
  // ============================================================

  /**
   * NOTIFICATION: Organization member joined
   */
  static async notifyOrgMemberJoined(
    newMemberId: string,
    organizationId: string,
    adminId?: string
  ) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { 
          id: true,
          organization_name: true,
          organization_image: true,
        },
      });

      if (!organization) {
        console.error("Organization not found");
        return { success: false, message: "Organization not found" };
      }

      const newMember = await prisma.user.findUnique({
        where: { id: newMemberId },
        select: { 
          first_name: true, 
          last_name: true,
          user_pic: true 
        },
      });

      const memberName = newMember
        ? `${newMember.first_name} ${newMember.last_name}`.trim()
        : "A new member";

      if (adminId) {
        await this.createNotification({
          title: "New Organization Member",
          message: `${memberName} has joined your organization "${organization.organization_name}"`,
          type: NotificationType.ORG_MEMBER_JOINED,
          role: Role.STUDENT,
          to: Role.ORG_ADMIN,
          userId: adminId,
          organizationId: organizationId,
          data: {
            memberId: newMemberId,
            memberName: memberName,
            memberPic: newMember?.user_pic,
            organizationName: organization.organization_name,
            organizationImage: organization.organization_image,
          },
        });
      }

      const admins = await prisma.organizationMember.findMany({
        where: {
          organizationId: organizationId,
          role: { in: ["org_admin", "admin"] },
          userId: { not: newMemberId },
        },
        select: { userId: true },
      });

      if (admins.length > 0) {
        const notifications = admins.map((admin) => ({
          title: "New Organization Member",
          message: `${memberName} has joined "${organization.organization_name}"`,
          type: NotificationType.ORG_MEMBER_JOINED,
          role: Role.STUDENT,
          to: Role.ORG_ADMIN,
          userId: admin.userId,
          organizationId: organizationId,
          data: {
            memberId: newMemberId,
            memberName: memberName,
            organizationName: organization.organization_name,
          },
        }));

        await this.createBulkNotifications(notifications);
      }

      return { success: true };
    } catch (error) {
      console.error("Error in notifyOrgMemberJoined:", error);
      throw error;
    }
  }

  /**
   * NOTIFICATION: Organization member left
   */
  static async notifyOrgMemberLeft(
    memberId: string,
    organizationId: string,
    adminId?: string
  ) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { 
          id: true,
          organization_name: true,
        },
      });

      if (!organization) {
        console.error("Organization not found");
        return { success: false, message: "Organization not found" };
      }

      const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: { 
          first_name: true, 
          last_name: true,
          user_pic: true 
        },
      });

      const memberName = member
        ? `${member.first_name} ${member.last_name}`.trim()
        : "A member";

      if (adminId) {
        await this.createNotification({
          title: "Member Left Organization",
          message: `${memberName} has left your organization "${organization.organization_name}"`,
          type: NotificationType.ORG_MEMBER_LEFT,
          role: Role.STUDENT,
          to: Role.ORG_ADMIN,
          userId: adminId,
          organizationId: organizationId,
          data: {
            memberId: memberId,
            memberName: memberName,
            organizationName: organization.organization_name,
          },
        });
      }

      const admins = await prisma.organizationMember.findMany({
        where: {
          organizationId: organizationId,
          role: { in: ["org_admin", "admin"] },
          userId: { not: memberId },
        },
        select: { userId: true },
      });

      if (admins.length > 0) {
        const notifications = admins.map((admin) => ({
          title: "Member Left Organization",
          message: `${memberName} has left "${organization.organization_name}"`,
          type: NotificationType.ORG_MEMBER_LEFT,
          role: Role.STUDENT,
          to: Role.ORG_ADMIN,
          userId: admin.userId,
          organizationId: organizationId,
          data: {
            memberId: memberId,
            memberName: memberName,
            organizationName: organization.organization_name,
          },
        }));

        await this.createBulkNotifications(notifications);
      }

      return { success: true };
    } catch (error) {
      console.error("Error in notifyOrgMemberLeft:", error);
      throw error;
    }
  }

  /**
   * NOTIFICATION: Organization role changed
   */
  static async notifyOrgRoleChanged(
    userId: string,
    organizationId: string,
    newRole: string,
    oldRole: string,
    changedById?: string
  ) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { 
          id: true,
          organization_name: true,
        },
      });

      if (!organization) {
        console.error("Organization not found");
        return { success: false, message: "Organization not found" };
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          first_name: true, 
          last_name: true,
          user_pic: true 
        },
      });

      const userName = user
        ? `${user.first_name} ${user.last_name}`.trim()
        : "User";

      await this.createNotification({
        title: "Organization Role Changed",
        message: `Your role in "${organization.organization_name}" has been changed from ${oldRole} to ${newRole}`,
        type: NotificationType.ORG_ROLE_CHANGED,
        role: Role.STUDENT,
        to: Role.STUDENT,
        userId: userId,
        organizationId: organizationId,
        data: {
          userId: userId,
          userName: userName,
          oldRole: oldRole,
          newRole: newRole,
          organizationName: organization.organization_name,
        },
      });

      if (changedById && changedById !== userId) {
        const changer = await prisma.user.findUnique({
          where: { id: changedById },
          select: { first_name: true, last_name: true },
        });

        const changerName = changer
          ? `${changer.first_name} ${changer.last_name}`.trim()
          : "An admin";

        const admins = await prisma.organizationMember.findMany({
          where: {
            organizationId: organizationId,
            role: { in: ["org_admin", "admin"] },
            userId: { not: userId },
          },
          select: { userId: true },
        });

        if (admins.length > 0) {
          const notifications = admins.map((admin) => ({
            title: "Member Role Changed",
            message: `${changerName} changed ${userName}'s role from ${oldRole} to ${newRole}`,
            type: NotificationType.ORG_ROLE_CHANGED,
            role: Role.STUDENT,
            to: Role.ORG_ADMIN,
            userId: admin.userId,
            organizationId: organizationId,
            data: {
              userId: userId,
              userName: userName,
              oldRole: oldRole,
              newRole: newRole,
              changedBy: changerName,
              organizationName: organization.organization_name,
            },
          }));

          await this.createBulkNotifications(notifications);
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Error in notifyOrgRoleChanged:", error);
      throw error;
    }
  }

  /**
   * NOTIFICATION: Organization invitation sent
   */
  static async notifyOrgInvitationSent(
    invitedEmail: string,
    organizationId: string,
    sentById: string,
    role: string = "member"
  ) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { 
          id: true,
          organization_name: true,
          organization_image: true,
        },
      });

      if (!organization) {
        console.error("Organization not found");
        return { success: false, message: "Organization not found" };
      }

      const sender = await prisma.user.findUnique({
        where: { id: sentById },
        select: { 
          first_name: true, 
          last_name: true,
          user_pic: true 
        },
      });

      const senderName = sender
        ? `${sender.first_name} ${sender.last_name}`.trim()
        : "An admin";

      const invitedUser = await prisma.user.findUnique({
        where: { email_address: invitedEmail },
        select: { id: true },
      });

      if (invitedUser) {
        await this.createNotification({
          title: "Organization Invitation",
          message: `${senderName} has invited you to join "${organization.organization_name}" as a ${role}`,
          type: NotificationType.ORG_INVITE,
          role: Role.STUDENT,
          to: Role.STUDENT,
          userId: invitedUser.id,
          organizationId: organizationId,
          data: {
            invitedEmail: invitedEmail,
            role: role,
            senderId: sentById,
            senderName: senderName,
            organizationName: organization.organization_name,
            organizationImage: organization.organization_image,
          },
        });
      }

      const admins = await prisma.organizationMember.findMany({
        where: {
          organizationId: organizationId,
          role: { in: ["org_admin", "admin"] },
          userId: { not: sentById },
        },
        select: { userId: true },
      });

      if (admins.length > 0) {
        const notifications = admins.map((admin) => ({
          title: "New Organization Invitation",
          message: `${senderName} invited ${invitedEmail} to join "${organization.organization_name}"`,
          type: NotificationType.ORG_INVITE,
          role: Role.STUDENT,
          to: Role.ORG_ADMIN,
          userId: admin.userId,
          organizationId: organizationId,
          data: {
            invitedEmail: invitedEmail,
            role: role,
            senderId: sentById,
            senderName: senderName,
            organizationName: organization.organization_name,
          },
        }));

        await this.createBulkNotifications(notifications);
      }

      return { success: true };
    } catch (error) {
      console.error("Error in notifyOrgInvitationSent:", error);
      throw error;
    }
  }

  /**
   * NOTIFICATION: Organization announcement
   */
  static async notifyOrganizationAnnouncement(
    organizationId: string,
    title: string,
    message: string,
    sentById: string,
    targetRole?: string
  ) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { 
          id: true,
          organization_name: true,
        },
      });

      if (!organization) {
        console.error("Organization not found");
        return { success: false, message: "Organization not found" };
      }

      const members = await prisma.organizationMember.findMany({
        where: {
          organizationId: organizationId,
          isActive: true,
          ...(targetRole && { role: targetRole }),
        },
        select: { userId: true },
      });

      if (members.length === 0) {
        console.log(`No members found for organization: ${organizationId}`);
        return { count: 0 };
      }

      const notificationData = members.map((member) => ({
        title: title,
        message: message,
        type: "SYSTEM_ANNOUNCEMENT",
        role: Role.ADMIN,
        to: Role.STUDENT,
        userId: member.userId,
        organizationId: organizationId,
        data: {
          announcementType: "organization",
          sentBy: sentById,
          organizationName: organization.organization_name,
          sentAt: new Date(),
        },
      }));

      return await this.createBulkNotifications(notificationData);
    } catch (error) {
      console.error("Error in notifyOrganizationAnnouncement:", error);
      throw error;
    }
  }

  // ============================================================
  // COURSE/GROUP/LIKE/COMMENT NOTIFICATION METHODS
  // ============================================================

  static async notifyStudentJoinedCourse(
    studentId: string, 
    courseId: string,
    organizationId?: string
  ) {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          createdByDetails: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
        },
      });

      if (!course || !course.createdByDetails) {
        console.error("Course or instructor not found");
        return { success: false };
      }

      const instructorRole = course.createdByDetails.role.toUpperCase();
      if (instructorRole !== Role.INSTRUCTOR && instructorRole !== Role.TUTOR) {
        return { success: false };
      }

      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { first_name: true, last_name: true, user_pic: true },
      });

      const studentName = student ? `${student.first_name} ${student.last_name}`.trim() : "A student";

      await this.createNotification({
        title: "New Student Enrolled",
        message: `${studentName} has enrolled in your course "${course.course_title}"`,
        type: NotificationType.COURSE_JOIN,
        role: Role.STUDENT,
        to: Role.INSTRUCTOR,
        userId: course.createdByDetails.id,
        courseId: courseId,
        organizationId: organizationId,
        data: { studentId, studentName, courseTitle: course.course_title },
      });

      return { success: true };
    } catch (error) {
      console.error("Error in notifyStudentJoinedCourse:", error);
      throw error;
    }
  }

  static async notifyStudentJoinedGroup(
    studentId: string, 
    groupId: string,
    organizationId?: string
  ) {
    try {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          createdBy: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
        },
      });

      if (!group || !group.createdBy) {
        console.error("Group or instructor not found");
        return { success: false };
      }

      const creatorRole = group.createdBy.role.toUpperCase();
      if (creatorRole !== Role.INSTRUCTOR && creatorRole !== Role.TUTOR) {
        return { success: false };
      }

      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { first_name: true, last_name: true, user_pic: true },
      });

      const studentName = student ? `${student.first_name} ${student.last_name}`.trim() : "A student";

      await this.createNotification({
        title: "New Group Member",
        message: `${studentName} has joined your group "${group.group_title}"`,
        type: NotificationType.GROUP_JOIN,
        role: Role.STUDENT,
        to: Role.INSTRUCTOR,
        userId: group.createdBy.id,
        groupId: groupId,
        organizationId: organizationId,
        data: { studentId, studentName, groupTitle: group.group_title },
      });

      return { success: true };
    } catch (error) {
      console.error("Error in notifyStudentJoinedGroup:", error);
      throw error;
    }
  }

  static async notifyPostLiked(
    postId: string,
    likerId: string,
    postAuthorId: string,
    postTitle?: string,
    organizationId?: string
  ) {
    try {
      if (postAuthorId === likerId) return { success: false };

      const liker = await prisma.user.findUnique({
        where: { id: likerId },
        select: { first_name: true, last_name: true, user_pic: true },
      });

      const likerName = liker ? `${liker.first_name} ${liker.last_name}`.trim() : "Someone";

      await this.createNotification({
        title: "Post Liked",
        message: `${likerName} liked your post${postTitle ? `: "${postTitle}"` : ''}`,
        type: NotificationType.POST_LIKE,
        role: Role.STUDENT,
        to: Role.STUDENT,
        userId: postAuthorId,
        postId: postId,
        organizationId: organizationId,
        data: { likerId, likerName, postTitle: postTitle || "Post" },
      });

      return { success: true };
    } catch (error) {
      console.error("Error in notifyPostLiked:", error);
      throw error;
    }
  }

  static async notifyPostCommented(
    postId: string,
    commenterId: string,
    postAuthorId: string,
    commentText: string,
    postTitle?: string,
    organizationId?: string,
    replyId?: string
  ) {
    try {
      if (postAuthorId === commenterId) return { success: false };

      const commenter = await prisma.user.findUnique({
        where: { id: commenterId },
        select: { first_name: true, last_name: true, user_pic: true },
      });

      const commenterName = commenter ? `${commenter.first_name} ${commenter.last_name}`.trim() : "Someone";

      await this.createNotification({
        title: "New Comment",
        message: `${commenterName} commented on your post${postTitle ? `: "${postTitle}"` : ''}`,
        type: NotificationType.POST_COMMENT,
        role: Role.STUDENT,
        to: Role.STUDENT,
        userId: postAuthorId,
        postId: postId,
        replyId: replyId,
        organizationId: organizationId,
        data: { 
          commenterId, 
          commenterName, 
          commentText: commentText.substring(0, 100), 
          postTitle: postTitle || "Post" 
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Error in notifyPostCommented:", error);
      throw error;
    }
  }

  static async notifyNewMessage(
    receiverId: string,
    senderId: string,
    message: string,
    messageId: string,
    organizationId?: string
  ) {
    try {
      if (receiverId === senderId) return { success: false };

      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { first_name: true, last_name: true, user_pic: true },
      });

      const senderName = sender ? `${sender.first_name} ${sender.last_name}`.trim() : "Someone";

      await this.createNotification({
        title: "New Message",
        message: `${senderName} sent you a message`,
        type: NotificationType.MESSAGE,
        role: Role.STUDENT,
        to: Role.STUDENT,
        userId: receiverId,
        organizationId: organizationId,
        data: { 
          senderId, 
          senderName, 
          messageId, 
          messagePreview: message.substring(0, 100) 
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Error in notifyNewMessage:", error);
      throw error;
    }
  }

  /**
   * NOTIFICATION: Course completed
   */
  static async notifyCourseCompleted(
    userId: string,
    courseId: string,
    courseTitle: string,
    organizationId?: string
  ) {
    try {
      await this.createNotification({
        title: "Course Completed! 🎉",
        message: `Congratulations! You have completed "${courseTitle}"`,
        type: NotificationType.COURSE_COMPLETION,
        role: Role.STUDENT,
        to: Role.STUDENT,
        userId: userId,
        courseId: courseId,
        organizationId: organizationId,
        data: {
          courseId,
          courseTitle,
          completedAt: new Date(),
        },
      });

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { createdByDetails: { select: { id: true } } },
      });

      if (course?.createdByDetails?.id) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { first_name: true, last_name: true },
        });

        const userName = user
          ? `${user.first_name} ${user.last_name}`.trim()
          : "A student";

        await this.createNotification({
          title: "Student Completed Course",
          message: `${userName} has completed "${courseTitle}"`,
          type: NotificationType.COURSE_COMPLETION,
          role: Role.STUDENT,
          to: Role.INSTRUCTOR,
          userId: course.createdByDetails.id,
          courseId: courseId,
          organizationId: organizationId,
          data: {
            studentId: userId,
            studentName: userName,
            courseId,
            courseTitle,
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error in notifyCourseCompleted:", error);
      throw error;
    }
  }

  /**
   * NOTIFICATION: Achievement unlocked
   */
  static async notifyAchievementUnlocked(
    userId: string,
    achievementTitle: string,
    achievementId: string,
    organizationId?: string
  ) {
    try {
      await this.createNotification({
        title: "Achievement Unlocked! 🏆",
        message: `You have unlocked "${achievementTitle}"!`,
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        role: Role.STUDENT,
        to: Role.STUDENT,
        userId: userId,
        organizationId: organizationId,
        data: {
          achievementId,
          achievementTitle,
          unlockedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Error in notifyAchievementUnlocked:", error);
      throw error;
    }
  }

  /**
   * NOTIFICATION: Quiz completed
   */
  static async notifyQuizCompleted(
    userId: string,
    quizId: string,
    quizTitle: string,
    score: number,
    courseId?: string,
    organizationId?: string
  ) {
    try {
      await this.createNotification({
        title: "Quiz Completed! 📝",
        message: `You scored ${score}% on "${quizTitle}"`,
        type: NotificationType.QUIZ_COMPLETED,
        role: Role.STUDENT,
        to: Role.STUDENT,
        userId: userId,
        courseId: courseId,
        organizationId: organizationId,
        data: {
          quizId,
          quizTitle,
          score,
          completedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Error in notifyQuizCompleted:", error);
      throw error;
    }
  }

  /**
   * NOTIFICATION: Event reminder
   */
  static async notifyEventReminder(
    userId: string,
    eventName: string,
    eventId: string,
    eventTime: string,
    organizationId?: string
  ) {
    try {
      await this.createNotification({
        title: "Event Reminder 📅",
        message: `Reminder: "${eventName}" starts at ${eventTime}`,
        type: NotificationType.EVENT_REMINDER,
        role: Role.STUDENT,
        to: Role.STUDENT,
        userId: userId,
        organizationId: organizationId,
        data: {
          eventId,
          eventName,
          eventTime,
          reminderAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Error in notifyEventReminder:", error);
      throw error;
    }
  }
}