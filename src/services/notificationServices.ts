// services/notificationServices.ts - COMPLETE FIXED VERSION
import prisma from "../db";

// IMPORTANT: Match your Prisma schema enum exactly
export enum Role {
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
  INSTRUCTOR = "INSTRUCTOR",
}

export class NotificationService {
  /**
   * Create a single notification
   * userId is REQUIRED (matches Prisma schema)
   */
  static async createNotification(data: {
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
  }) {
    try {
      // First verify the user exists
      const userExists = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true },
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
        userId: data.userId, // Direct assignment instead of connect
      };

      // Add optional relations if they exist
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

      return await prisma.notification.create({
        data: notificationData,
      });
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
    }>,
  ) {
    if (notifications.length === 0) {
      return { count: 0 };
    }

    try {
      // Filter out any notifications without userId
      const validNotifications = notifications.filter(
        (n) => n.userId && n.userId.trim() !== "",
      );

      if (validNotifications.length === 0) {
        console.warn("No valid notifications (all missing userId)");
        return { count: 0 };
      }

      // Verify all users exist before creating
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

      // Add default title if missing
      const notificationsWithDefaults = finalNotifications.map((n) => ({
        title: n.title || "Notification",
        message: n.message,
        type: n.type,
        role: n.role,
        to: n.to,
        userId: n.userId,
        courseId: n.courseId,
        groupId: n.groupId,
      }));

      return await prisma.notification.createMany({
        data: notificationsWithDefaults,
        skipDuplicates: true,
      });
    } catch (error) {
      console.error("Error in createBulkNotifications:", error);
      throw error;
    }
  }

  /**
   * Get unread count for a user based on their role (for all users with that role)
   */
  static async getUnreadCount(role: Role) {
    try {
      return await prisma.notification.count({
        where: {
          to: role,
          isRead: false,
        },
      });
    } catch (error) {
      console.error("Error in getUnreadCount:", error);
      throw error;
    }
  }

  /**
   * Get unread count for a specific user
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
   * When a student joins a course - notify all instructors
   */
  static async notifyStudentJoinedCourse(studentId: string, courseId: string) {
    try {
      // 1. Get course with instructor details
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
        return { count: 0 };
      }

      // 2. Check if the creator is actually an instructor
      if (course.createdByDetails.role.toUpperCase() !== Role.INSTRUCTOR) {
        console.log("Course creator is not an instructor, skipping notification");
        return { count: 0 };
      }

      // 3. Get student details
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { first_name: true, last_name: true },
      });

      const studentName = student
        ? `${student.first_name} ${student.last_name}`.trim()
        : "A student";

      // 4. Prepare notification for the course instructor
      return await this.createNotification({
        title: "New Student Joined",
        message: `${studentName} has joined your course "${course.course_title}"`,
        type: "COURSE_JOIN",
        role: Role.STUDENT,
        to: Role.INSTRUCTOR,
        userId: course.createdByDetails.id,
        courseId: courseId,
      });
    } catch (error) {
      console.error("Error in notifyStudentJoinedCourse:", error);
      throw error;
    }
  }

  /**
   * When a student joins a group - notify the group instructor
   */
  static async notifyStudentJoinedGroup(studentId: string, groupId: string) {
    try {
      // 1. Get group with instructor details
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          createdBy: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              role: true,
            },
          },
        },
      });

      if (!group || !group.createdBy) {
        console.error("Group or instructor not found");
        throw new Error("Group or instructor not found");
      }

      // 2. Check if creator is instructor
      if (group.createdBy.role.toUpperCase() !== Role.INSTRUCTOR) {
        console.log("Group creator is not an instructor");
        return { count: 0 };
      }

      // 3. Get student details
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { first_name: true, last_name: true },
      });

      const studentName = student
        ? `${student.first_name} ${student.last_name}`.trim()
        : "A student";

      // 4. Create notification for the group instructor
      return await this.createNotification({
        title: "New Group Member",
        message: `${studentName} has joined your group "${group.group_title}"`,
        type: "GROUP_JOIN",
        role: Role.STUDENT,
        to: Role.INSTRUCTOR,
        userId: group.createdBy.id,
        groupId: groupId,
      });
    } catch (error) {
      console.error("Error in notifyStudentJoinedGroup:", error);
      throw error;
    }
  }

  /**
   * System announcement to all users of a specific role
   */
  static async createSystemAnnouncement(message: string, title: string, to: Role) {
    try {
      // 1. Get all users of the target role
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

      // 2. Prepare notifications for all users
      const notificationData = users.map((user) => ({
        title: title,
        message: message,
        type: "SYSTEM_ANNOUNCEMENT",
        role: Role.ADMIN,
        to: to,
        userId: user.id,
      }));

      // 3. Create all notifications
      return await this.createBulkNotifications(notificationData);
    } catch (error) {
      console.error("Error in createSystemAnnouncement:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      return await prisma.notification.update({
        where: {
          id: notificationId,
          userId: userId,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error in markAsRead:", error);
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  static async markMultipleAsRead(notificationIds: string[], userId: string) {
    try {
      return await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: userId,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error in markMultipleAsRead:", error);
      throw error;
    }
  }

  /**
   * Mark all user's notifications as read
   */
  static async markAllAsRead(userId: string) {
    try {
      return await prisma.notification.updateMany({
        where: {
          userId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error in markAllAsRead:", error);
      throw error;
    }
  }

  /**
   * Get notifications by user
   */
  static async getUserNotifications(userId: string, limit: number = 50) {
    try {
      return await prisma.notification.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        include: {
          user: {
            select: {
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
        },
      });
    } catch (error) {
      console.error("Error in getUserNotifications:", error);
      throw error;
    }
  }

  /**
   * Get notifications by role
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
              first_name: true,
              last_name: true,
              user_pic: true,
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
   * Delete a notification
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
   * Delete multiple notifications
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
   * Archive a notification (soft delete - mark as read)
   */
  static async archiveNotification(notificationId: string, userId: string) {
    try {
      return await prisma.notification.update({
        where: {
          id: notificationId,
          userId: userId,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error in archiveNotification:", error);
      throw error;
    }
  }
}