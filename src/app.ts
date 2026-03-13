import express, { Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "./routes/routes";
import cookieParser from "cookie-parser";
import { join } from "path";
import fs from "fs";
import multer from "multer";

const PORT = process.env.PORT || 10000;
const app = express();

// Basic middleware
app.use(express.json({ limit: "500mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

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
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Cache-Control',
      'Pragma'
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

// ===== SWAGGER SETUP =====
try {
  const possiblePaths = [
    join(__dirname, "routes", "swagger.json"),
    join(process.cwd(), "src", "routes", "swagger.json"),
    join(__dirname, "../src/routes", "swagger.json"),
  ];
  
  let swaggerLoaded = false;
  
  for (const swaggerPath of possiblePaths) {
    console.log(` Looking for swagger at: ${swaggerPath}`);
    if (fs.existsSync(swaggerPath)) {
      console.log(` Found swagger.json at: ${swaggerPath}`);
      const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
      app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
      swaggerLoaded = true;
      break;
    }
  }
  
  if (!swaggerLoaded) {
    console.log(' Could not find swagger.json in any location');
  }
} catch (error) {
  console.error(' Swagger error:', error);
}

// ===== IMPORTANT: Register tsoa routes =====
// This will automatically use the multer config from tsoa.json
RegisterRoutes(app);

// ===== Error handler for multer errors =====
app.use((error: any, req: Request, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        message: 'File too large. Maximum size is 500MB.' 
      });
    }
    return res.status(400).json({ message: error.message });
  }
  
  console.error("Error:", error);
  res.status(500).json({ message: "Internal Server Error" });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Swagger should be at: http://localhost:${PORT}/api/docs`);
});