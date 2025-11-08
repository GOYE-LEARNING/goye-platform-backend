// src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "./routes/routes";
import bodyParser from "body-parser";

const PORT = process.env.PORT || 10000;
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());

// Serve Swagger documentation
try {
  const swaggerDocument = require('./routes/swagger.json');
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.log('Swagger documentation not available');
}

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ 
    status: "OK", 
    message: "GOYE Education Platform API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
RegisterRoutes(app);

// Handle 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handling middleware
app.use((error: any, req: Request, res: Response, next: any) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});