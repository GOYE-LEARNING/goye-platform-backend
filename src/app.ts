// src/app.ts
import express, { Request, Response, NextFunction, Router } from "express";
import cookieParser from "cookie-parser";
import { RegisterRoutes } from "./routes/routes";
import { setupSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/logger";
import { corsOptions } from "./config/cors";
import helmet from 'helmet'
import rateLimit from "express-rate-limit";
import prisma from "./db";
import dotenv from "dotenv";
import type { SocketService } from "./services/socketService"; // ✅ ADD (type-only import avoids circular init issues)
dotenv.config();

const app = express();
export const socketRoutes = Router(); // ✅ exported, empty for now

// ...later, inside createApp(), BEFORE RegisterRoutes and BEFORE the 404 handler:

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy enabled for production (Render)');
} else {
  app.set('trust proxy', 'loopback');
  console.log('✅ Trust proxy enabled for development');
}

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 429,
    message: "Too many requests, please slow down and try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.ip;
    return ip || req.socket.remoteAddress || 'unknown';
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: 429,
    message: "Too many login attempts, please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.ip;
    return ip || req.socket.remoteAddress || 'unknown';
  }
});

// ✅ CHANGED: accept an optional socketService param so routes that
// depend on it can be registered BEFORE the 404 catch-all.
export const createApp = async (socketService?: SocketService) => {
  app.use(socketRoutes);
  console.log("🔄 Setting up middleware...");

  app.use(express.json({ limit: "15mb" }));
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  app.use(corsOptions);
  app.options("*", corsOptions);

  app.use(requestLogger);
  app.use(helmet())

  app.use(generalLimiter);
  app.use("/api/user/signup", authLimiter);
  app.use("/api/user/login", authLimiter);

  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  app.get("/api/db-test", async (req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ message: "Database connected successfully" });
    } catch (error) {
      console.error("Database test failed:", error);
      res.status(500).json({ error: "Database connection failed" });
    }
  });

  app.get("/api/test", (req: Request, res: Response) => {
    res.json({ message: "API is working!" });
  });

  console.log("📚 Setting up Swagger...");
  setupSwagger(app);

  console.log("🛣️ Registering routes...");
  try {
    RegisterRoutes(app);
    console.log("✅ Routes registered successfully");
  } catch (error) {
    console.error("❌ Failed to register routes:", error);
    throw error;
  }

  // ✅ NEW: socket-dependent debug/status routes — registered here,
  // BEFORE the 404 catch-all, so they're actually reachable.
  if (socketService) {
    app.set("socketService", socketService);

    app.get("/api/users/:userId/status", (req: Request, res: Response) => {
      const { userId } = req.params;
      res.json(socketService.getUserStatus(userId));
    });

    app.get("/api/users/online", (req: Request, res: Response) => {
      res.json({ online: socketService.getOnlineUsers() });
    });

    app.get(
      "/api/organizations/:organizationId/online",
      (req: Request, res: Response) => {
        const { organizationId } = req.params;
        const users = socketService.getOrganizationOnlineUsers(organizationId);
        res.json({ organizationId, onlineCount: users.length, users });
      },
    );

    console.log("✅ Socket-dependent routes registered");
  }

  // Error handler (should be last)
  app.use(errorHandler);

  // 404 handler (must be absolute last)
  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: "Route not found" });
  });

  console.log("✅ App created successfully");
  return app;
};