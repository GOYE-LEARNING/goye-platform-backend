import { Server, Socket } from "socket.io";
import prisma from "../db";
import { EncryptionUtil } from "../utils/encryption";
import { SOCKET_EVENTS, ALLOWED_ORIGINS } from "../utils/constant";
import * as cookie from "cookie";
import jwt from "jsonwebtoken";

interface SocketUser {
  userId: string;
  socketId: string;
  online: boolean;
  lastSeen: Date;
}

export class SocketService {
  private io: Server;
  private onlineUsers: Map<string, SocketUser> = new Map();

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  // backend/socketService.ts - Update the setupMiddleware function

  // backend/socketService.ts - Update the setupMiddleware function

  private setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        const cookieHeader = socket.handshake.headers.cookie;
        console.log("🍪 Cookie header:", cookieHeader);

        const parsedCookies = cookie.parse(cookieHeader || "");

        // IMPORTANT FIX: Look for accessToken (not token)
        const token = parsedCookies.accessToken || parsedCookies.token;
        console.log("🔑 Token found:", !!token);
        console.log("Available cookies:", Object.keys(parsedCookies));

        if (!token) {
          console.error("❌ No token found in cookies");
          return next(new Error("Authentication error: No token found"));
        }

        const decoded = jwt.verify(token, process.env.BEARERAUTH_SECRET) as {
          id: string;
        };

        if (!decoded.id) {
          return next(new Error("Authentication error: Invalid token payload"));
        }

        socket.data.userId = decoded.id;
        console.log(`✅ User ${decoded.id} authenticated via socket`);

        next();
      } catch (err) {
        console.error("❌ JWT verify failed:", err);
        next(new Error("Authentication error"));
      }
    });
  }
  private setupEventHandlers() {
    this.io.on(SOCKET_EVENTS.CONNECTION, (socket: Socket) => {
      this.handleConnection(socket);
      this.setupSocketEvents(socket);
    });
  }

  private handleConnection(socket: Socket) {
    const userId = socket.data.userId;
    console.log(`🔌 User ${userId} connected with socket ${socket.id}`);

    // Store user online status
    this.onlineUsers.set(userId, {
      userId,
      socketId: socket.id,
      online: true,
      lastSeen: new Date(),
    });

    // Broadcast online status
    this.io.emit(SOCKET_EVENTS.USER_ONLINE, {
      userId,
      online: true,
      lastSeen: new Date(),
    });

    // Join user's personal room
    socket.join(`user:${userId}`);
  }

  private setupSocketEvents(socket: Socket) {
    const userId = socket.data.userId;

    // Handle private message with reply
    socket.on(SOCKET_EVENTS.PRIVATE_MESSAGE, async (data) => {
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

        // Get reply message data if replying
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
      } catch (error) {
        console.error("Error sending private message:", error);
        socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
          message: "Failed to send message",
        });
      }
    });

    // Handle message update (edit) - STORE isEdited flag
    socket.on("private:message:updated", async (data) => {
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

        // Update with isEdited flag
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

        // Send to both users
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
      const { messageId } = data;

      try {
        const message = await prisma.privateMessage.findFirst({
          where: {
            id: messageId,
            senderId: userId,
          },
          select: {
            id: true,
            senderId: true,
            receiverId: true,
            createdAt: true,
          },
        });

        if (!message) {
          socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
            message: "Message not found or not authorized to delete",
          });
          return;
        }

        // Soft delete - update content and set isDeleted flag
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

        // Send to both sender and receiver
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
      const { receiverId } = data;

      try {
        // Soft delete all messages between these two users
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

        // Send to both users
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
      const { receiverId, isTyping } = data;
      const receiverSocket = this.onlineUsers.get(receiverId);
      if (receiverSocket?.online) {
        this.io.to(`user:${receiverId}`).emit(SOCKET_EVENTS.PRIVATE_TYPING, {
          userId,
          isTyping,
        });
      }
    });

    // Handle read receipts
    socket.on(SOCKET_EVENTS.PRIVATE_READ, async (data) => {
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
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    // Handle disconnect
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log(`🔌 User ${userId} disconnected`);
      const user = this.onlineUsers.get(userId);
      if (user) {
        user.online = false;
        user.lastSeen = new Date();
        this.onlineUsers.set(userId, user);
        this.io.emit(SOCKET_EVENTS.USER_ONLINE, {
          userId,
          online: false,
          lastSeen: new Date(),
        });
      }
    });

    // Get online users
    socket.on("users:online", () => {
      const online = Array.from(this.onlineUsers.values())
        .filter((u) => u.online)
        .map((u) => u.userId);
      socket.emit(SOCKET_EVENTS.USERS_ONLINE_LIST, online);
    });
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers.values())
      .filter((u) => u.online)
      .map((u) => u.userId);
  }

  getUserStatus(userId: string) {
    const user = this.onlineUsers.get(userId);
    return {
      userId,
      online: user?.online || false,
      lastSeen: user?.lastSeen || null,
    };
  }
}
