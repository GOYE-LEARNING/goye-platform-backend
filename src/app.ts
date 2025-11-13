// src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "./routes/routes";
import bodyParser from "body-parser";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import cookieParser from "cookie-parser";

const PORT = process.env.PORT || 10000;
const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
// Or for dynamic origins
// CORS for web + mobile
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["POST", "DELETE", "GET", "PUT", "PATCH"],
    credentials: true, // important for cookies
  })
);
app.use(bodyParser.json());

// Serve Swagger documentation with debugging
console.log("=== SWAGGER SETUP DEBUG ===");
console.log("Current directory:", __dirname);
console.log("Process directory:", process.cwd());

const possibleSwaggerPaths = [
  join(__dirname, "routes", "swagger.json"),
  join(process.cwd(), "src", "routes", "swagger.json"),
  join(process.cwd(), "dist", "routes", "swagger.json"),
  join(process.cwd(), "routes", "swagger.json"),
];

let swaggerLoaded = false;

for (const swaggerPath of possibleSwaggerPaths) {
  console.log(`Checking: ${swaggerPath}`);
  if (existsSync(swaggerPath)) {
    console.log(`✅ FOUND swagger.json at: ${swaggerPath}`);
    try {
      const swaggerDocument = require(swaggerPath);
      app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
      console.log("✅ Swagger UI mounted at /api/docs");
      swaggerLoaded = true;
      break;
    } catch (error) {
      console.log(`❌ Error loading swagger from ${swaggerPath}:`, error);
    }
  }
}

if (!swaggerLoaded) {
  console.log("❌ No swagger.json found in any location");

  // List what files actually exist
  const possibleDirs = [
    join(__dirname, "routes"),
    join(process.cwd(), "src", "routes"),
    join(process.cwd(), "dist", "routes"),
    join(process.cwd(), "routes"),
  ];

  for (const dir of possibleDirs) {
    if (existsSync(dir)) {
      console.log(`Files in ${dir}:`, readdirSync(dir));
    }
  }

  // Create basic fallback Swagger
  const basicSwagger = {
    openapi: "3.0.0",
    info: {
      title: "GOYE Education Platform API",
      version: "1.0.0",
      description: "API documentation - Swagger JSON not generated yet",
    },
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: {
            "200": {
              description: "Server is healthy",
            },
          },
        },
      },
    },
  };

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(basicSwagger));
  console.log("✅ Basic fallback Swagger UI mounted at /api/docs");
}

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

// API routes
try {
  RegisterRoutes(app);
  console.log("✅ Routes registered successfully");
} catch (error) {
  console.log("❌ Error registering routes:", error);
}

// Handle 404
app.use((req: Request, res: Response) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
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
  console.log(`=== SERVER STARTED ===`);
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`Live URL: https://goye-platform-backend.onrender.com`);
});
