// src/config/swagger.ts
import swaggerUi from "swagger-ui-express";
import { join } from "path";
import fs from "fs";

export const setupSwagger = (app: any) => {
  try {
    // Look for swagger.json in the routes folder
    const swaggerPath = join(__dirname, "../routes", "swagger.json");
    
    console.log(` Looking for swagger at: ${swaggerPath}`);
    if (fs.existsSync(swaggerPath)) {
      console.log(` Found swagger.json`);
      const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));
      app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
      console.log("✅ Swagger UI available at /api/docs");
    } else {
      console.log("⚠️ swagger.json not found. Run 'npm run swagger' to generate it.");
    }
  } catch (error) {
    console.error("❌ Swagger error:", error);
  }
};