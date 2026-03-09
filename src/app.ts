// src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "./routes/routes";
import bodyParser from "body-parser";
import { join } from "path";
import cookieParser from "cookie-parser";
import { deviceAwareAuth } from "./middleware/tab-aware-auth";
import { startCleanupJob } from "./services/cleanup.service";

const PORT = process.env.PORT || 10000;
const app = express();

// Basic middleware
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:3000"], // Add your production domain here
    methods: ["POST", "DELETE", "GET", "PUT", "PATCH"],
    credentials: true,
  })
);

// Public routes that don't need authentication
const publicPaths = [
  '/api/user/login',
  '/api/user/signup',
  '/api/user/sendOtp',
  '/api/user/verify-otp',
  '/api/user/forgot-password',
  '/health',
  '/api/docs',
];

// Apply device-aware auth middleware to all API routes EXCEPT public ones
app.use('/api', (req, res, next) => {
  const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
  
  if (isPublicPath) {
    return next();
  }
  
  return deviceAwareAuth(req, res, next);
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    message: "GOYE Education Platform API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    docs: "/api/docs",
  });
});

// Swagger documentation
try {
  const swaggerPath = join(__dirname, "routes", "swagger.json");
  const swaggerDocument = require(swaggerPath);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log("✅ Swagger UI mounted at /api/docs");
} catch (error) {
  console.log("❌ Failed to load swagger.json:", error);
}

// Register API routes
try {
  RegisterRoutes(app);
  console.log("✅ Routes registered successfully");
} catch (error) {
  console.log("❌ Error registering routes:", error);
}

// Handle 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: "Route not found",
    path: req.url,
    method: req.method,
  });
});

// Error handling middleware
app.use((error: any, req: Request, res: Response, next: any) => {
  console.error("Error:", error);
  res.status(error.status || 500).json({
    message: error.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

app.listen(PORT, () => {
    startCleanupJob();
  console.log(`=== SERVER STARTED ===`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Docs: http://localhost:${PORT}/api/docs`);
});