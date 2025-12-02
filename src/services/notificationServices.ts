// services/NotificationService.ts
import prisma from "../db";

export enum Role {
  admin = "admin",
  student = "student", 
  tutor = "tutor"
}
export class NotificationService {
  /**
   * Create a single notification
   */
  static async createNotification(data: {
    message: string;
    title?: string;
    type: string;
    role: Role;
    to: Role;
    userId?: string;
    courseId?: string;
    groupId?: string;
  }) {
    return await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        role: data.role as any,
        to: data.to as any,
        userId: data.userId,
        courseId: data.courseId,
        groupId: data.groupId,
      },
    });
  }

  /**
   * Create multiple notifications at once (BULK)
   */
  static async createBulkNotifications(
    notifications: Array<{
      message: string;
      title: string;
      type: string;
      role: Role;
      to: Role;
      userId: string;
      courseId: string;
      groupId: string;
    }>
  ) {
    if (notifications.length === 0) return { count: 0 };

    return await prisma.notification.createMany({
      data: notifications as any,
      skipDuplicates: true,
    });
  }

  /**
   * When a student joins a course - notify all instructors
   */
  static async notifyStudentJoinedCourse(
  studentId: string,
  courseId: string
) {
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
        }
      }
    }
  });

  if (!course || !course.createdByDetails) {
    throw new Error("Course or instructor not found");
  }

  // Check if the creator is actually an instructor
  if (course.createdByDetails.role !== "INSTRUCTOR") {
    console.log("Course creator is not an instructor, skipping notification");
    return;
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { first_name: true, last_name: true }
  });

  // Create array with single notification for the course creator
  const notificationData = [{
    title: "New Student Joined",
    message: `${student?.last_name, student.first_name || 'A student'} has joined your course "${course.course_title}"`,
    type: "COURSE_JOIN",
    role: Role.student,
    to: Role.tutor,
    userId: studentId,
    courseId: courseId,
  }];

  // Use createMany even for single notification (it still works)
  return await this.createBulkNotifications(notificationData as any);
}
  /**
   * When a student joins a group - notify the group instructor
   */
  static async notifyStudentJoinedGroup(studentId: string, groupId: string) {
    // Get group details
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        createdBy: true,
      },
    });

    if (!group) {
      throw new Error("Group not found");
    }

    // Get student details
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { first_name: true, last_name: true },
    });

    // Create notification for the group instructor
    return await this.createNotification({
      title: "New Group Member",
      message: `${
        student?.last_name + student.first_name || "A student"
      } has joined your group "${group.group_title}"`,
      type: "GROUP_JOIN",
      role: Role.student,
      to: Role.tutor,
      userId: studentId,
      groupId: groupId,
    });
  }

  /**
   * System announcement to all users of a specific role
   */
  static async createSystemAnnouncement(
    message: string,
    title: string,
    to: Role
  ) {
    // Get all users of the target role
    const users = await prisma.user.findMany({
      where: { role: to },
      select: { id: true },
    });

    // Prepare notifications for all users
    const notificationData = users.map((user) => ({
      title: title,
      message: message,
      type: "SYSTEM_ANNOUNCEMENT",
      role: Role.admin, // System announcements come from admin
      to: to,
      userId: user.id,
    }));

    // Create all notifications
    return await this.createBulkNotifications(notificationData as any);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.update({
      where: {
        id: notificationId,
        userId: userId, // Ensure user can only mark their own notifications as read
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * Mark multiple notifications as read
   */
  static async markMultipleAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        userId: userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * Get unread count for a user based on their role
   */
  static async getUnreadCount(userRole: Role) {
    return await prisma.notification.count({
      where: {
        to: userRole as any,
        isRead: false,
      },
    });
  }
}
