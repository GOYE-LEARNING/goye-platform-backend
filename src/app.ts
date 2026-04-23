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

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per 15 minutes per IP
  message: {
    status: 429,
    message: "Too many requests, please slow down and try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
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
});

export const createApp = async () => {
  const app = express();
  console.log("🔄 Setting up middleware...");
  app.use(generalLimiter);
  app.use("/api/user/signup", authLimiter);
  app.use("/api/user/login", authLimiter);
  // Basic middleware
  app.use(express.json({ limit: "15mb" }));
  app.use(cookieParser());


  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // CORS
  app.use(corsOptions);
  app.options("*", corsOptions);

  // Request logging
  app.use(requestLogger);

  // Health check
  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  // Test database connection endpoint
  app.get("/api/db-test", async (req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ message: "Database connected successfully" });
    } catch (error) {
      console.error("Database test failed:", error);
      res.status(500).json({ error: "Database connection failed" });
    }
  });

  // Test endpoint
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

  // Error handler
  app.use(errorHandler);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: "Route not found" });
  });

  console.log("✅ App created successfully");
  return app;
};
