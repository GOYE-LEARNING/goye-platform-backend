// src/app.ts
import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { RegisterRoutes } from "./routes/routes";
import { setupSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/logger";
import { corsOptions } from "./config/cors";
import rateLimit from "express-rate-limit";
import prisma from "./db";
import dotenv from "dotenv";
dotenv.config();

// ✅ IMPORTANT: Enable trust proxy BEFORE any middleware
// This is essential for Render, Heroku, Railway, etc.
const app = express();

// ✅ Set trust proxy based on environment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy enabled for production (Render)');
} else {
  // For local development, you can also enable it to match production behavior
  app.set('trust proxy', 'loopback');
  console.log('✅ Trust proxy enabled for development');
}

// ✅ Configure rate limiters AFTER trust proxy is set
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per 15 minutes per IP
  message: {
    status: 429,
    message: "Too many requests, please slow down and try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // ✅ Add this to handle proxy headers properly
  validate: { trustProxy: false }, // Prevent validation errors
  // ✅ Custom key generator to get real IP
  keyGenerator: (req) => {
    // Get the real IP from proxy headers
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
  validate: { trustProxy: false }, // ✅ Add this
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.ip;
    return ip || req.socket.remoteAddress || 'unknown';
  }
});

export const createApp = async () => {
  console.log("🔄 Setting up middleware...");
  
  // ✅ Apply rate limiters AFTER other middleware
  // Order matters: trust proxy -> body parsers -> rate limiters -> routes
  
  // Basic middleware (these should come before rate limiters)
  app.use(express.json({ limit: "15mb" }));
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // CORS (this can come before or after body parsers)
  app.use(corsOptions);
  app.options("*", corsOptions);

  // Request logging
  app.use(requestLogger);

  // ✅ Apply rate limiters AFTER body parsers but BEFORE routes
  app.use(generalLimiter);
  app.use("/api/user/signup", authLimiter);
  app.use("/api/user/login", authLimiter);

  // Health check (exclude from rate limiting)
  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  // Test database connection endpoint (exclude from rate limiting)
  app.get("/api/db-test", async (req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ message: "Database connected successfully" });
    } catch (error) {
      console.error("Database test failed:", error);
      res.status(500).json({ error: "Database connection failed" });
    }
  });

  // Test endpoint (exclude from rate limiting)
  app.get("/api/test", (req: Request, res: Response) => {
    res.json({ message: "API is working!" });
  });

  // Swagger documentation
  console.log("📚 Setting up Swagger...");
  setupSwagger(app);

  // Register tsoa routes
  console.log("🛣️ Registering routes...");
  try {
    RegisterRoutes(app);
    console.log("✅ Routes registered successfully");
  } catch (error) {
    console.error("❌ Failed to register routes:", error);
    throw error;
  }

  // Error handler (should be last)
  app.use(errorHandler);

  // 404 handler (should be after all routes)
  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: "Route not found" });
  });

  console.log("✅ App created successfully");
  return app;
};