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
  private pendingAuthSockets: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true,
      },
      allowEIO3: true,
      transports: ['websocket', 'polling']
    });
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use((socket, next) => {
      console.log("🔌 New socket connection attempt from:", socket.handshake.address);
      socket.data.authenticated = false;
      next();
    });
  }

  private setupEventHandlers() {
    this.io.on(SOCKET_EVENTS.CONNECTION, (socket: Socket) => {
      console.log(`📡 Socket connected: ${socket.id}`);
      
      const authTimeout = setTimeout(() => {
        if (!socket.data.authenticated) {
          console.log(`⏰ Socket ${socket.id} timed out without authentication, disconnecting`);
          socket.emit("auth_timeout", { message: "Authentication timeout" });
          socket.disconnect();
        }
      }, 10000);
      
      this.pendingAuthSockets.set(socket.id, authTimeout);
      
      this.setupAuthentication(socket);
      this.setupSocketEvents(socket);
    });
  }

  private setupAuthentication(socket: Socket) {
    socket.on("authenticate", async (data: { token: string }) => {
      try {
        console.log(`🔐 Authentication attempt for socket ${socket.id}`);
        
        if (!data || !data.token) {
          socket.emit("authenticated", { 
            success: false, 
            error: "No token provided" 
          });
          return;
        }

        const decoded = jwt.verify(
          data.token,
          process.env.ACCESS_SECRET as string
        ) as { id: string };

        if (!decoded || !decoded.id) {
          socket.emit("authenticated", { 
            success: false, 
            error: "Invalid token payload" 
          });
          return;
        }

        const timeout = this.pendingAuthSockets.get(socket.id);
        if (timeout) {
          clearTimeout(timeout);
          this.pendingAuthSockets.delete(socket.id);
        }

        socket.data.userId = decoded.id;
        socket.data.authenticated = true;
        
        socket.join(`user:${decoded.id}`);
        
        const existingUser = this.onlineUsers.get(decoded.id);
        if (existingUser) {
          existingUser.socketId = socket.id;
          existingUser.online = true;
          existingUser.lastSeen = new Date();
          this.onlineUsers.set(decoded.id, existingUser);
        } else {
          this.onlineUsers.set(decoded.id, {
            userId: decoded.id,
            socketId: socket.id,
            online: true,
            lastSeen: new Date(),
          });
        }
        
        socket.emit("authenticated", { 
          success: true, 
          userId: decoded.id 
        });
        
        this.io.emit(SOCKET_EVENTS.USER_ONLINE, {
          userId: decoded.id,
          online: true,
          lastSeen: new Date(),
        });
        
        console.log(`✅ User ${decoded.id} authenticated successfully on socket ${socket.id}`);
        
        const onlineUsersList = Array.from(this.onlineUsers.values())
          .filter(u => u.online && u.userId !== decoded.id)
          .map(u => u.userId);
        
        socket.emit(SOCKET_EVENTS.USERS_ONLINE_LIST, onlineUsersList);
        
      } catch (err) {
        console.error("❌ Authentication error:", err);
        socket.emit("authenticated", { 
          success: false, 
          error: "Authentication failed" 
        });
      }
    });
  }

  private setupSocketEvents(socket: Socket) {
    const isAuthenticated = () => {
      if (!socket.data.authenticated || !socket.data.userId) {
        socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
          message: "Not authenticated. Please authenticate first."
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

    // Handle message update (edit)
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
      if (!isAuthenticated()) return;
      
      const userId = socket.data.userId;
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
      if (!isAuthenticated()) return;
      
      const userId = socket.data.userId;
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
      if (!isAuthenticated()) return;
      
      const userId = socket.data.userId;
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
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    // Handle disconnect
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      const userId = socket.data.userId;
      
      const timeout = this.pendingAuthSockets.get(socket.id);
      if (timeout) {
        clearTimeout(timeout);
        this.pendingAuthSockets.delete(socket.id);
      }
      
      if (userId) {
        console.log(`🔌 User ${userId} disconnected from socket ${socket.id}`);
        const user = this.onlineUsers.get(userId);
        if (user && user.socketId === socket.id) {
          user.online = false;
          user.lastSeen = new Date();
          this.onlineUsers.set(userId, user);
          
          this.io.emit(SOCKET_EVENTS.USER_ONLINE, {
            userId,
            online: false,
            lastSeen: new Date(),
          });
        }
      } else {
        console.log(`🔌 Unauthenticated socket ${socket.id} disconnected`);
      }
    });

    // Get online users
    socket.on("users:online", () => {
      if (!isAuthenticated()) return;
      
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