import express, { Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "./routes/routes";
import cookieParser from "cookie-parser";
import { join } from "path";
import fs from "fs";

const PORT = process.env.PORT || 10000;
const app = express();

// Basic middleware
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://goye-web-app.vercel.app',
  'https://goye-web-app.onrender.com',
  'https://goye-platform-backend.onrender.com',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Your logic remains the same
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    // Setting allowedHeaders to true allows all headers sent by the client
  allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Cache-Control',
      'Pragma' // Now safely included as a string
    ],
  })
);

app.options('*', cors());

// Request logging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Test endpoint
app.get("/api/test", (req: Request, res: Response) => {
  res.json({ message: "API is working!" });
});

// ===== SWAGGER SETUP - FIXED PATHS =====
try {
  // Your swagger.json is at src/routes/swagger.json
  // In production (dist folder), it will be at dist/routes/swagger.json
  const possiblePaths = [
    join(__dirname, "routes", "swagger.json"),           // For dist folder (production)
    join(process.cwd(), "src", "routes", "swagger.json"), // For src folder (development)
    join(__dirname, "../src/routes", "swagger.json"),    // Alternative path
  ];
  
  let swaggerLoaded = false;
  
  for (const swaggerPath of possiblePaths) {
    console.log(`🔍 Looking for swagger at: ${swaggerPath}`);
    if (fs.existsSync(swaggerPath)) {
      console.log(`✅ Found swagger.json at: ${swaggerPath}`);
      const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
      app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
      swaggerLoaded = true;
      break;
    }
  }
  
  if (!swaggerLoaded) {
    console.log('❌ Could not find swagger.json in any location');
  }
} catch (error) {
  console.error('❌ Swagger error:', error);
}
// ===== END SWAGGER SETUP =====

// Register routes
RegisterRoutes(app);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((error: any, req: Request, res: Response, next: any) => {
  console.error("Error:", error);
  res.status(500).json({ message: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📚 Swagger should be at: http://localhost:${PORT}/api/docs`);
});