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

// Simple CORS
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-frontend-domain.com'] 
      : ['http://localhost:3000'],
    credentials: true,
  })
);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Swagger
try {
  const swaggerPath = join(__dirname, "routes", "swagger.json");
  if (fs.existsSync(swaggerPath)) {
    const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log('✅ Swagger UI mounted at /api/docs');
  }
} catch (error) {
  console.log('❌ Swagger not available');
}

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
});