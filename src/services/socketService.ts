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

  private setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        const cookieHeader = socket.handshake.headers.cookie;
        console.log("🍪 Cookie header:", cookieHeader);

        const parsedCookies = cookie.parse(cookieHeader || "");
        const token = parsedCookies.token;
        console.log("🔑 Token found:", !!token);
        if (!token) return next(new Error(`Authentication error: ${token}`));

        const decoded = jwt.verify(token, process.env.BEARERAUTH_SECRET) as {
          id: string;
        };
        if (!decoded.id)
          return next(new Error("Authentication error: Invalid token"));
        socket.data.userId = decoded.id;

        next();
      } catch (err) {
        console.error(" JWT verify failed:", err);
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

    // Handle private message
    socket.on(SOCKET_EVENTS.PRIVATE_MESSAGE, async (data) => {
      try {
        const { receiverId, content, mediaUrls, replyToId, replyTo } = data;
        const senderId = userId;

        if (!receiverId || !content) {
          socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
            message: "Invalid message data",
          });
          return;
        }

        const encryptedContent = EncryptionUtil.encrypt(content);
        
        // Create message with reply data if provided
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
            replyTo: {
              include: {
                sender: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
          },
        });

        const decryptedMessage = {
          ...message,
          content,
          replyTo: replyTo ? {
            id: replyTo.id,
            text: replyTo.text,
            senderName: replyTo.senderName,
            senderId: replyTo.senderId,
          } : undefined,
        };

        // Send to receiver if online
        const receiverSocket = this.onlineUsers.get(receiverId);
        if (receiverSocket?.online) {
          this.io.to(`user:${receiverId}`).emit(SOCKET_EVENTS.PRIVATE_MESSAGE, {
            ...decryptedMessage,
            delivered: true,
          });
        }

        // Send confirmation to sender
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

    // Handle message update (edit)
    socket.on("private:message:update", async (data) => {
      const { messageId, content } = data;

      try {
        // Find the message and verify sender
        const message = await prisma.privateMessage.findFirst({
          where: {
            id: messageId,
            senderId: userId,
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

        if (!message) {
          socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
            message: "Message not found or not authorized to edit",
          });
          return;
        }

        // Encrypt new content
        const encryptedContent = EncryptionUtil.encrypt(content);

        // Update in database
        const updated = await prisma.privateMessage.update({
          where: { id: messageId },
          data: { content: encryptedContent },
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

        // Prepare the update event data
        const updateEventData = {
          id: updated.id,
          content: content,
          isEdited: true,
          senderId: updated.senderId,
          receiverId: updated.receiverId,
          sender: updated.sender,
          receiver: updated.receiver,
          time: updated.createdAt,
        };

        // Send to both sender and receiver
        this.io.to(`user:${message.senderId}`).emit("private:message:updated", updateEventData);
        this.io.to(`user:${message.receiverId}`).emit("private:message:updated", updateEventData);

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
        // Find the message and verify sender
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

        // Option 1: Hard delete
        await prisma.privateMessage.delete({
          where: { id: messageId },
        });

        // Option 2: Soft delete (if you have a deleted field)
        // await prisma.privateMessage.update({
        //   where: { id: messageId },
        //   data: { isDeleted: true, content: "This message was deleted" },
        // });

        const deleteEventData = {
          id: message.id,
          content: "This message was deleted",
          isDeleted: true,
          senderId: message.senderId,
          receiverId: message.receiverId,
          time: message.createdAt,
        };

        // Send to both sender and receiver
        this.io.to(`user:${message.senderId}`).emit("private:message:deleted", deleteEventData);
        this.io.to(`user:${message.receiverId}`).emit("private:message:deleted", deleteEventData);

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
        // Delete all messages between these two users
        await prisma.privateMessage.deleteMany({
          where: {
            OR: [
              { senderId: userId, receiverId: receiverId },
              { senderId: receiverId, receiverId: userId },
            ],
          },
        });

        const clearEventData = {
          with: receiverId,
          clearedAt: new Date(),
        };

        // Send to both users
        this.io.to(`user:${userId}`).emit("private:chat:cleared", clearEventData);
        this.io.to(`user:${receiverId}`).emit("private:chat:cleared", clearEventData);

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