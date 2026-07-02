// socket.service.ts - COMPLETE VERSION
import { Server, Socket } from "socket.io";
import prisma from "../db";
import { EncryptionUtil } from "../utils/encryption";
import { SOCKET_EVENTS, ALLOWED_ORIGINS } from "../utils/constant";
import jwt from "jsonwebtoken";

interface SocketUser {
  userId: string;
  socketId: string;
  online: boolean;
  lastSeen: Date;
  userType?: string;
  organizationId?: string;
  firstName?: string;
  lastName?: string;
  userPic?: string;
}

interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: string;
  userId: string;
  courseId?: string;
  groupId?: string;
  postId?: string;
  replyId?: string;
  organizationId?: string;
  createdAt: Date;
  read?: boolean;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    user_pic: string | null;
  };
  course?: {
    id: string;
    course_title: string;
    course_image: string | null;
  };
  group?: {
    id: string;
    group_title: string;
    group_image: string | null;
  };
  organization?: {
    id: string;
    organization_name: string;
    organization_image: string | null;
  };
}

export class SocketService {
  private io: Server;
  private onlineUsers: Map<string, SocketUser> = new Map();
  private pendingAuthSockets: Map<string, NodeJS.Timeout> = new Map();
  private userRooms: Map<string, Set<string>> = new Map();
  private lastChecked: Date = new Date();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true,
      },
      allowEIO3: true,
      transports: ["websocket", "polling"],
    });
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupNotificationListener();
    this.setupPingInterval();
  }

  private setupMiddleware() {
    this.io.use((socket, next) => {
      console.log(
        "🔌 New socket connection attempt from:",
        socket.handshake.address,
      );
      socket.data.authenticated = false;
      next();
    });
  }

  private setupPingInterval() {
    // Send ping to all connected clients every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      this.io.emit("ping", { timestamp: new Date() });
    }, 30000);
  }

  private setupEventHandlers() {
    this.io.on(SOCKET_EVENTS.CONNECTION, (socket: Socket) => {
      console.log(`📡 Socket connected: ${socket.id}`);

      const authTimeout = setTimeout(() => {
        if (!socket.data.authenticated) {
          console.log(
            `⏰ Socket ${socket.id} timed out without authentication, disconnecting`,
          );
          socket.emit("auth_timeout", { message: "Authentication timeout" });
          socket.disconnect();
        }
      }, 10000);

      this.pendingAuthSockets.set(socket.id, authTimeout);

      this.setupAuthentication(socket);
      this.setupSocketEvents(socket);
      this.setupRoomManagement(socket);
      this.setupOnlineStatusHandlers(socket);
    });
  }

  private setupAuthentication(socket: Socket) {
    socket.on("authenticate", async (data: { token: string }) => {
      try {
        console.log(`🔐 Authentication attempt for socket ${socket.id}`);

        if (!data || !data.token) {
          socket.emit("authenticated", {
            success: false,
            error: "No token provided",
          });
          return;
        }

        const decoded = jwt.verify(
          data.token,
          process.env.ACCESS_SECRET as string,
        ) as { 
          id: string;
          userType?: string;
          organizationId?: string;
          email?: string;
          full_name?: string;
        };

        // ✅ DEBUG LOG — remove once confirmed
        console.log("🔍 Decoded socket token payload:", JSON.stringify(decoded, null, 2));

        if (!decoded || !decoded.id) {
          socket.emit("authenticated", {
            success: false,
            error: "Invalid token payload",
          });
          return;
        }

        const timeout = this.pendingAuthSockets.get(socket.id);
        if (timeout) {
          clearTimeout(timeout);
          this.pendingAuthSockets.delete(socket.id);
        }

        // Get user details from database
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            user_pic: true,
            userType: true,
            isOnline: true,
          },
        });

        if (!user) {
          socket.emit("authenticated", {
            success: false,
            error: "User not found",
          });
          return;
        }

        socket.data.userId = decoded.id;
        socket.data.userType = decoded.userType || user.userType || "USER";
        socket.data.organizationId = decoded.organizationId;
        socket.data.authenticated = true;
        socket.data.user = user;

        // ✅ DEBUG LOG — confirms what actually got attached to the socket
        console.log("🔍 socket.data after assignment:", {
          userId: socket.data.userId,
          userType: socket.data.userType,
          organizationId: socket.data.organizationId,
        });

        // Join user's personal room
        socket.join(`user:${decoded.id}`);

        // Initialize user rooms
        if (!this.userRooms.has(decoded.id)) {
          this.userRooms.set(decoded.id, new Set());
        }
        this.userRooms.get(decoded.id)?.add(`user:${decoded.id}`);

        // Join organization room if exists
        if (decoded.organizationId) {
          socket.join(`org:${decoded.organizationId}`);
          this.userRooms.get(decoded.id)?.add(`org:${decoded.organizationId}`);
          console.log(`✅ Socket joined org room: org:${decoded.organizationId}`); // ✅ DEBUG LOG
        } else {
          console.log(`⚠️ No organizationId in token — socket did NOT join any org room`); // ✅ DEBUG LOG
        }

        // Update online users
        const existingUser = this.onlineUsers.get(decoded.id);
        if (existingUser) {
          existingUser.socketId = socket.id;
          existingUser.online = true;
          existingUser.lastSeen = new Date();
          existingUser.userType = decoded.userType || user.userType;
          existingUser.organizationId = decoded.organizationId;
          existingUser.firstName = user.first_name;
          existingUser.lastName = user.last_name;
          existingUser.userPic = user.user_pic || undefined;
          this.onlineUsers.set(decoded.id, existingUser);
        } else {
          this.onlineUsers.set(decoded.id, {
            userId: decoded.id,
            socketId: socket.id,
            online: true,
            lastSeen: new Date(),
            userType: decoded.userType || user.userType,
            organizationId: decoded.organizationId,
            firstName: user.first_name,
            lastName: user.last_name,
            userPic: user.user_pic || undefined,
          });
        }

        // ✅ DEBUG LOG — confirms what's actually stored in the in-memory map
        console.log(
          "🔍 onlineUsers map entry for this user:",
          this.onlineUsers.get(decoded.id),
        );

        // Update user in database
        await prisma.user.update({
          where: { id: decoded.id },
          data: { 
            isOnline: true, 
            lastActive: new Date() 
          },
        });

        socket.emit("authenticated", {
          success: true,
          userId: decoded.id,
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            user_pic: user.user_pic,
            userType: user.userType,
          },
        });

        // Broadcast user online status
        const statusPayload = {
          userId: decoded.id,
          online: true,
          lastSeen: new Date(),
          userType: decoded.userType || user.userType,
          firstName: user.first_name,
          lastName: user.last_name,
          userPic: user.user_pic,
        };

        // Send to organization if exists
        if (decoded.organizationId) {
          this.io.to(`org:${decoded.organizationId}`).emit(SOCKET_EVENTS.USER_ONLINE, statusPayload);
        } else {
          // Send to all users if no organization (for individual users)
          this.io.emit(SOCKET_EVENTS.USER_ONLINE, statusPayload);
        }

        console.log(
          `✅ User ${decoded.id} (${user.first_name} ${user.last_name}) authenticated successfully on socket ${socket.id}`,
        );

        // Send online users list to the connected user
        const onlineUsersList = Array.from(this.onlineUsers.values())
          .filter((u) => u.online && u.userId !== decoded.id)
          .map((u) => ({
            userId: u.userId,
            userType: u.userType,
            firstName: u.firstName,
            lastName: u.lastName,
            userPic: u.userPic,
            lastSeen: u.lastSeen,
          }));

        socket.emit(SOCKET_EVENTS.USERS_ONLINE_LIST, onlineUsersList);

        // Send unread notification count
        await this.sendUnreadCount(decoded.id);

      } catch (err) {
        console.error("❌ Authentication error:", err);
        socket.emit("authenticated", {
          success: false,
          error: "Authentication failed",
        });
      }
    });
  }

  private setupOnlineStatusHandlers(socket: Socket) {
    // Handle ping/pong for connection health
    socket.on("ping", async () => {
      if (socket.data.authenticated && socket.data.userId) {
        const userId = socket.data.userId;
        
        // Update last active
        const user = this.onlineUsers.get(userId);
        if (user) {
          user.lastSeen = new Date();
          this.onlineUsers.set(userId, user);
        }
        
        socket.emit("pong", { timestamp: new Date() });
      }
    });

    // Get online status of a specific user
    socket.on("get_user_status", async (data: { userId: string }) => {
      if (!socket.data.authenticated) return;
      
      const userStatus = this.getUserStatus(data.userId);
      socket.emit("user_status_response", userStatus);
    });

    // Get all online users in the organization
    socket.on("get_organization_online", async (data: { organizationId: string }) => {
      if (!socket.data.authenticated) return;
      
      const onlineUsers = Array.from(this.onlineUsers.values())
        .filter((u) => u.online && u.organizationId === data.organizationId)
        .map((u) => ({
          userId: u.userId,
          userType: u.userType,
          firstName: u.firstName,
          lastName: u.lastName,
          userPic: u.userPic,
          lastSeen: u.lastSeen,
        }));
      
      socket.emit("organization_online_response", {
        organizationId: data.organizationId,
        onlineCount: onlineUsers.length,
        users: onlineUsers,
      });
    });

    // Broadcast user offline status
    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      const organizationId = socket.data.organizationId;

      if (userId) {
        console.log(`🔌 User ${userId} disconnected from socket ${socket.id}`);
        
        const user = this.onlineUsers.get(userId);
        if (user && user.socketId === socket.id) {
          user.online = false;
          user.lastSeen = new Date();
          this.onlineUsers.set(userId, user);

          // Update database
          prisma.user.update({
            where: { id: userId },
            data: { 
              isOnline: false, 
              lastActive: new Date() 
            },
          }).catch(err => console.error("Error updating user offline status:", err));

          // Broadcast offline status
          const statusPayload = {
            userId: userId,
            online: false,
            lastSeen: new Date(),
          };

          if (organizationId) {
            this.io.to(`org:${organizationId}`).emit(SOCKET_EVENTS.USER_OFFLINE, statusPayload);
          } else {
            this.io.emit(SOCKET_EVENTS.USER_OFFLINE, statusPayload);
          }
        }

        // Clean up user rooms
        this.userRooms.delete(userId);
      }

      // Clear pending auth timeout if any
      const timeout = this.pendingAuthSockets.get(socket.id);
      if (timeout) {
        clearTimeout(timeout);
        this.pendingAuthSockets.delete(socket.id);
      }
    });
  }

  private setupRoomManagement(socket: Socket) {
    socket.on("join_room", (data: { room: string }) => {
      if (!socket.data.authenticated) return;
      
      const userId = socket.data.userId;
      socket.join(data.room);
      
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId)?.add(data.room);
      
      console.log(`User ${userId} joined room: ${data.room}`);
    });

    socket.on("leave_room", (data: { room: string }) => {
      if (!socket.data.authenticated) return;
      
      const userId = socket.data.userId;
      socket.leave(data.room);
      
      this.userRooms.get(userId)?.delete(data.room);
      console.log(`User ${userId} left room: ${data.room}`);
    });

    // Join organization room
    socket.on("join_organization", async (data: { organizationId: string }) => {
      if (!socket.data.authenticated) return;
      
      const userId = socket.data.userId;
      const room = `org:${data.organizationId}`;
      
      socket.join(room);
      
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId)?.add(room);
      
      console.log(`User ${userId} joined organization room: ${room}`);
    });

    // Join course room
    socket.on("join_course", async (data: { courseId: string }) => {
      if (!socket.data.authenticated) return;
      
      const userId = socket.data.userId;
      const room = `course:${data.courseId}`;
      
      socket.join(room);
      
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId)?.add(room);
      
      console.log(`User ${userId} joined course room: ${room}`);
    });

    // Join group room
    socket.on("join_group", async (data: { groupId: string }) => {
      if (!socket.data.authenticated) return;
      
      const userId = socket.data.userId;
      const room = `group:${data.groupId}`;
      
      socket.join(room);
      
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId)?.add(room);
      
      console.log(`User ${userId} joined group room: ${room}`);
    });
  }

  private setupNotificationListener() {
    // Poll for new notifications
    this.pollForNotifications();
  }

  private async pollForNotifications() {
    setInterval(async () => {
      try {
        const newNotifications = await prisma.notification.findMany({
          where: {
            createdAt: {
              gt: this.lastChecked
            }
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
            organization: {
              select: {
                id: true,
                organization_name: true,
                organization_image: true,
              },
            },
            post: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });

        if (newNotifications.length > 0) {
          for (const notification of newNotifications) {
            await this.broadcastNotification(notification);
          }
          this.lastChecked = new Date();
        }
      } catch (error) {
        console.error("Error polling for notifications:", error);
      }
    }, 2000); // Poll every 2 seconds
  }

  /**
   * PUBLIC METHOD: Broadcast notification to all relevant rooms
   */
  public async broadcastNotification(notification: any) {
    try {
      const payload: NotificationPayload = {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        userId: notification.userId,
        courseId: notification.courseId,
        groupId: notification.groupId,
        postId: notification.postId,
        replyId: notification.replyId,
        organizationId: notification.organizationId,
        createdAt: notification.createdAt,
        read: notification.isRead,
        user: notification.user,
        course: notification.course,
        group: notification.group,
        organization: notification.organization,
      };

      // Send to the specific user
      if (notification.userId) {
        this.io.to(`user:${notification.userId}`).emit('notification', payload);
      }

      // Send to organization room if exists
      if (notification.organizationId) {
        this.io.to(`org:${notification.organizationId}`).emit('notification', payload);
      }

      // Send to course room
      if (notification.courseId) {
        this.io.to(`course:${notification.courseId}`).emit('notification', payload);
      }

      // Send to group room
      if (notification.groupId) {
        this.io.to(`group:${notification.groupId}`).emit('notification', payload);
      }

      // Also emit to all online users if it's a system announcement
      if (notification.type === 'SYSTEM_ANNOUNCEMENT') {
        this.io.emit('system_announcement', payload);
      }

      console.log(`📨 Notification broadcasted: ${notification.id} - ${notification.type}`);
    } catch (error) {
      console.error("Error broadcasting notification:", error);
    }
  }

  /**
   * PUBLIC METHOD: Send unread count to a specific user
   */
  public async sendUnreadCount(userId: string) {
    try {
      const count = await prisma.notification.count({
        where: {
          userId: userId,
          isRead: false,
        },
      });

      this.io.to(`user:${userId}`).emit('notification_count', {
        unread: count,
        userId: userId,
      });
      
      return count;
    } catch (error) {
      console.error("Error sending unread count:", error);
      return 0;
    }
  }

  /**
   * PUBLIC METHOD: Send unread count to all users in an organization
   */
  public async sendUnreadCountToOrganization(organizationId: string) {
    try {
      // Get all members of the organization
      const members = await prisma.organizationMember.findMany({
        where: { 
          organizationId: organizationId,
          isActive: true 
        },
        select: { userId: true }
      });

      for (const member of members) {
        await this.sendUnreadCount(member.userId);
      }
    } catch (error) {
      console.error("Error sending unread count to organization:", error);
    }
  }

  private setupSocketEvents(socket: Socket) {
    const isAuthenticated = () => {
      if (!socket.data.authenticated || !socket.data.userId) {
        socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
          message: "Not authenticated. Please authenticate first.",
        });
        return false;
      }
      return true;
    };

    // Handle private message with reply
    socket.on(SOCKET_EVENTS.PRIVATE_MESSAGE, async (data) => {
      if (!isAuthenticated()) return;

      const userId = socket.data.userId;

      try {
        const { receiverId, content, replyToId } = data;
        const senderId = userId;

        if (!receiverId || !content) {
          socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
            message: "Invalid message data",
          });
          return;
        }

        const encryptedContent = EncryptionUtil.encrypt(content);

        let replyData = null;
        if (replyToId) {
          const originalMessage = await prisma.privateMessage.findUnique({
            where: { id: replyToId },
            include: {
              sender: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          });

          if (originalMessage) {
            replyData = {
              id: originalMessage.id,
              text: EncryptionUtil.decrypt(originalMessage.content),
              senderName: originalMessage.sender.first_name,
              senderId: originalMessage.sender.id,
            };
          }
        }

        const message = await prisma.privateMessage.create({
          data: {
            content: encryptedContent,
            senderId,
            receiverId,
            replyToId: replyToId || undefined,
          },
          include: {
            sender: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                user_pic: true,
                role: true,
              },
            },
            receiver: {
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

        const decryptedMessage = {
          ...message,
          content,
          replyTo: replyData,
        };

        const receiverSocket = this.onlineUsers.get(receiverId);
        if (receiverSocket?.online) {
          this.io.to(`user:${receiverId}`).emit(SOCKET_EVENTS.PRIVATE_MESSAGE, {
            ...decryptedMessage,
            delivered: true,
          });
        }

        socket.emit(SOCKET_EVENTS.PRIVATE_MESSAGE_SENT, {
          ...decryptedMessage,
          delivered: !!receiverSocket?.online,
        });

        // Create notification for the message
        await this.createAndBroadcastNotification({
          userId: receiverId,
          title: "New Message",
          message: `${decryptedMessage.sender.first_name} ${decryptedMessage.sender.last_name} sent you a message`,
          type: "MESSAGE",
          data: {
            messageId: message.id,
            senderId: userId,
            content: content.substring(0, 100),
          },
        });

      } catch (error) {
        console.error("Error sending private message:", error);
        socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
          message: "Failed to send message",
        });
      }
    });

    // Handle private message update
    socket.on("private:message:updated", async (data) => {
      if (!isAuthenticated()) return;

      const userId = socket.data.userId;
      const { messageId, content } = data;

      try {
        const message = await prisma.privateMessage.findFirst({
          where: {
            id: messageId,
            senderId: userId,
          },
          include: {
            sender: true,
            receiver: true,
          },
        });

        if (!message) {
          socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
            message: "Message not found or not authorized to edit",
          });
          return;
        }

        const encryptedContent = EncryptionUtil.encrypt(content);

        await prisma.privateMessage.update({
          where: { id: messageId },
          data: {
            content: encryptedContent,
            isEdited: true,
          },
        });

        const updateEventData = {
          id: message.id,
          content,
          isEdited: true,
          senderId: message.senderId,
          receiverId: message.receiverId,
          time: message.createdAt,
        };

        this.io
          .to(`user:${message.senderId}`)
          .emit("private:message:updated", updateEventData);
        this.io
          .to(`user:${message.receiverId}`)
          .emit("private:message:updated", updateEventData);

      } catch (error) {
        console.error("Error updating message:", error);
        socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
          message: "Failed to update message",
        });
      }
    });

    // Handle message delete
    socket.on("private:message:delete", async (data) => {
      if (!isAuthenticated()) return;

      const userId = socket.data.userId;
      const { messageId } = data;

      try {
        const message = await prisma.privateMessage.findFirst({
          where: { id: messageId, senderId: userId },
          select: {
            id: true,
            senderId: true,
            receiverId: true,
            createdAt: true,
            isDeleted: true,
          },
        });

        if (!message) {
          socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
            message: "Message not found",
          });
          return;
        }

        if (message.senderId !== userId) {
          socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
            message: "Only the sender can delete for everyone",
          });
          return;
        }

        if (!message.isDeleted) {
          await prisma.privateMessage.update({
            where: { id: messageId },
            data: { isDeleted: true, content: "This message was deleted" },
          });
        }

        await prisma.privateMessage.update({
          where: { id: messageId },
          data: {
            isDeleted: true,
            content: "This message was deleted",
          },
        });

        const deleteEventData = {
          id: message.id,
          content: "This message was deleted",
          isDeleted: true,
          senderId: message.senderId,
          receiverId: message.receiverId,
          time: message.createdAt,
        };

        this.io
          .to(`user:${message.senderId}`)
          .emit("private:message:deleted", deleteEventData);
        this.io
          .to(`user:${message.receiverId}`)
          .emit("private:message:deleted", deleteEventData);

      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
          message: "Failed to delete message",
        });
      }
    });

    // Handle clear chat
    socket.on("private:clear", async (data) => {
      if (!isAuthenticated()) return;

      const userId = socket.data.userId;
      const { receiverId } = data;

      try {
        await prisma.privateMessage.updateMany({
          where: {
            OR: [
              { senderId: userId, receiverId: receiverId },
              { senderId: receiverId, receiverId: userId },
            ],
          },
          data: {
            isDeleted: true,
            content: "This message was deleted",
          },
        });

        const clearEventData = {
          with: receiverId,
          clearedAt: new Date(),
        };

        this.io
          .to(`user:${userId}`)
          .emit("private:chat:cleared", clearEventData);
        this.io
          .to(`user:${receiverId}`)
          .emit("private:chat:cleared", clearEventData);

      } catch (error) {
        console.error("Error clearing chat:", error);
        socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
          message: "Failed to clear chat",
        });
      }
    });

    // Handle typing indicator
    socket.on(SOCKET_EVENTS.PRIVATE_TYPING, (data) => {
      if (!isAuthenticated()) return;

      const userId = socket.data.userId;
      const { receiverId, isTyping } = data;

      const receiverSocket = this.onlineUsers.get(receiverId);
      if (receiverSocket?.online) {
        this.io.to(`user:${receiverId}`).emit(SOCKET_EVENTS.PRIVATE_TYPING, {
          userId,
          isTyping,
          firstName: socket.data.user?.first_name,
          lastName: socket.data.user?.last_name,
        });
      }
    });

    // Handle read receipts
    socket.on(SOCKET_EVENTS.PRIVATE_READ, async (data) => {
      if (!isAuthenticated()) return;

      const userId = socket.data.userId;
      const { messageIds, senderId } = data;

      try {
        await prisma.privateMessage.updateMany({
          where: {
            id: { in: messageIds },
            senderId: senderId,
            receiverId: userId,
            readAt: null,
          },
          data: { readAt: new Date() },
        });

        const senderSocket = this.onlineUsers.get(senderId);
        if (senderSocket?.online) {
          this.io.to(`user:${senderId}`).emit(SOCKET_EVENTS.PRIVATE_READ, {
            messageIds,
            readBy: userId,
            readAt: new Date(),
          });
        }

        // Update unread count
        await this.sendUnreadCount(userId);

      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    // Get online users
    socket.on("users:online", () => {
      if (!isAuthenticated()) return;

      const online = Array.from(this.onlineUsers.values())
        .filter((u) => u.online)
        .map((u) => ({
          userId: u.userId,
          userType: u.userType,
          firstName: u.firstName,
          lastName: u.lastName,
          userPic: u.userPic,
          lastSeen: u.lastSeen,
        }));
      socket.emit(SOCKET_EVENTS.USERS_ONLINE_LIST, online);
    });

    // Mark notification as read
    socket.on("mark_notification_read", async (data: { notificationId: string }) => {
      if (!isAuthenticated()) return;

      const userId = socket.data.userId;
      
      try {
        const notification = await prisma.notification.update({
          where: {
            id: data.notificationId,
            userId: userId,
          },
          data: {
            isRead: true,
          },
          select: {
            organizationId: true,
          },
        });

        // Update unread count
        await this.sendUnreadCount(userId);
        
        if (notification.organizationId) {
          await this.sendUnreadCountToOrganization(notification.organizationId);
        }

        socket.emit("notification_read", {
          notificationId: data.notificationId,
          read: true,
        });

      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    });

    // Mark all notifications as read
    socket.on("mark_all_notifications_read", async () => {
      if (!isAuthenticated()) return;

      const userId = socket.data.userId;

      try {
        const notifications = await prisma.notification.findMany({
          where: {
            userId: userId,
            isRead: false,
          },
          select: {
            organizationId: true,
          },
        });

        const orgIds = new Set(notifications.map(n => n.organizationId).filter(Boolean));

        await prisma.notification.updateMany({
          where: {
            userId: userId,
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });

        // Update unread count
        await this.sendUnreadCount(userId);
        
        for (const orgId of orgIds) {
          if (orgId) {
            await this.sendUnreadCountToOrganization(orgId);
          }
        }

        socket.emit("all_notifications_read", {
          userId,
          timestamp: new Date(),
        });

      } catch (error) {
        console.error("Error marking all notifications as read:", error);
      }
    });
  }

  // Helper method to create and broadcast notification
  private async createAndBroadcastNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    data?: any;
    courseId?: string;
    groupId?: string;
    postId?: string;
    replyId?: string;
    organizationId?: string;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          title: data.title,
          message: data.message,
          type: data.type,
          userId: data.userId,
          courseId: data.courseId,
          groupId: data.groupId,
          postId: data.postId,
          replyId: data.replyId,
          organizationId: data.organizationId,
          to: "USER",
          role: "USER",
          isRead: false,
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
          organization: {
            select: {
              id: true,
              organization_name: true,
              organization_image: true,
            },
          },
        },
      });

      // Broadcast the notification
      await this.broadcastNotification(notification);
      
      // Update unread count for the user
      await this.sendUnreadCount(data.userId);
      
      // Update organization unread count if applicable
      if (data.organizationId) {
        await this.sendUnreadCountToOrganization(data.organizationId);
      }

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * PUBLIC METHODS for external access
   */
  getOnlineUsers() {
    return Array.from(this.onlineUsers.values())
      .filter((u) => u.online)
      .map((u) => ({
        userId: u.userId,
        userType: u.userType,
        firstName: u.firstName,
        lastName: u.lastName,
        userPic: u.userPic,
        lastSeen: u.lastSeen,
      }));
  }

  getUserStatus(userId: string) {
    const user = this.onlineUsers.get(userId);
    return {
      userId,
      online: user?.online || false,
      lastSeen: user?.lastSeen || null,
      firstName: user?.firstName,
      lastName: user?.lastName,
      userPic: user?.userPic,
      userType: user?.userType,
    };
  }

  isUserOnline(userId: string): boolean {
    const user = this.onlineUsers.get(userId);
    return user?.online || false;
  }

  getOrganizationOnlineUsers(organizationId: string) {
    return Array.from(this.onlineUsers.values())
      .filter((u) => u.online && u.organizationId === organizationId)
      .map((u) => ({
        userId: u.userId,
        userType: u.userType,
        firstName: u.firstName,
        lastName: u.lastName,
        userPic: u.userPic,
        lastSeen: u.lastSeen,
      }));
  }

  // Public method to broadcast notifications from any controller
  public async broadcastNewNotification(notificationId: string) {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
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
          organization: {
            select: {
              id: true,
              organization_name: true,
              organization_image: true,
            },
          },
        },
      });

      if (notification) {
        await this.broadcastNotification(notification);
        await this.sendUnreadCount(notification.userId);
        
        if (notification.organizationId) {
          await this.sendUnreadCountToOrganization(notification.organizationId);
        }
      }
    } catch (error) {
      console.error("Error broadcasting notification:", error);
    }
  }

  /**
   * Public method to emit an event to a specific user
   */
  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Public method to emit an event to an organization
   */
  public emitToOrganization(organizationId: string, event: string, data: any) {
    this.io.to(`org:${organizationId}`).emit(event, data);
  }

  /**
   * Public method to emit an event to a course
   */
  public emitToCourse(courseId: string, event: string, data: any) {
    this.io.to(`course:${courseId}`).emit(event, data);
  }

  /**
   * Public method to emit an event to a group
   */
  public emitToGroup(groupId: string, event: string, data: any) {
    this.io.to(`group:${groupId}`).emit(event, data);
  }

  /**
   * Get the underlying Socket.IO server instance
   */
  public getIO() {
    return this.io;
  }

  /**
   * Clean up resources
   */
  public cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.io.close();
  }
}