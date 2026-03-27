// src/config/swagger.ts
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { join } from "path";

export const setupSwagger = (app: any) => {
  try {
    // Try multiple possible locations
    const possiblePaths = [
      join(__dirname, "../routes/swagger.json"),      // /src/config/../routes/swagger.json
      join(process.cwd(), "src/routes/swagger.json"), // absolute path from root
      join(process.cwd(), "dist/routes/swagger.json"), // production path
    ];

    let swaggerDocument = null;
    
    for (const path of possiblePaths) {
      try {
        swaggerDocument = JSON.parse(readFileSync(path, "utf8"));
        console.log(`✅ Found swagger.json at: ${path}`);
        break;
      } catch (e) {
        // continue trying
      }
    }

    if (swaggerDocument) {
      app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
      console.log("✅ Swagger UI available at /api/docs");
    } else {
      console.log("⚠️ swagger.json not found in any location");
    }
  } catch (error) {
    console.error("❌ Swagger setup error:", error);
  }
};