import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import { RegisterRoutes } from "./routes/routes";
import { corsOptions } from "./config/cors";
import { setupSwagger } from "./config/swagger";
import { requestLogger } from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";

export const createApp = () => {
  const app = express();

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

  // Test endpoint
  app.get("/api/test", (req: Request, res: Response) => {
    res.json({ message: "API is working!" });
  });

  // Swagger documentation
  setupSwagger(app);

  // Register tsoa routes
  RegisterRoutes(app);

  // Error handler
  app.use(errorHandler);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: "Route not found" });
  });

  return app;
};