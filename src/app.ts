// src/app.ts
import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { RegisterRoutes } from "./routes/routes";
import { setupSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/logger";
import { corsOptions } from "./config/cors";
import prisma from "./db";
import dotenv from "dotenv";
dotenv.config();

export const createApp = async () => {
  const app = express();
  console.log("🔄 Setting up middleware...");

  // Basic middleware
  app.use(express.json({ limit: "500mb" }));
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true, limit: "500mb" }));

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
