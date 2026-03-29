import { Server, Socket } from "socket.io";
import prisma from "../db";
import { EncryptionUtil } from "../utils/encryption";
import { SOCKET_EVENTS, ALLOWED_ORIGINS } from "../utils/constant";
import cookie from "cookie";
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
        if (!cookieHeader) return next(new Error("Authentication error"));

        const parsedCookies = cookie.parse(cookieHeader); 
        const token = parsedCookies.token; 
        if (!token) return next(new Error("Authentication error"));

        const decoded = jwt.verify(token, process.env.BEARERAUTH_SECRET) as {
          userId: string;
        }; 
        if (!decoded.userId)
          return next(new Error("Authentication error: Invalid token"));
        socket.data.userId = decoded.userId;

        next();
      } catch (err) {
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
        const { receiverId, content, mediaUrls } = data;
        const senderId = userId;

        if (!receiverId || !content) {
          socket.emit(SOCKET_EVENTS.PRIVATE_ERROR, {
            message: "Invalid message data",
          });
          return;
        }

        const encryptedContent = EncryptionUtil.encrypt(content);
        const message = await prisma.privateMessage.create({
          data: {
            content: encryptedContent,
            senderId,
            receiverId,
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

        const decryptedMessage = { ...message, content };

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
