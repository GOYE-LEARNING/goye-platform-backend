// src/config/swagger.ts
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Mounts the interactive API documentation.
 *
 * Disabled in production by default. The generated spec describes all 235
 * endpoints — every path, parameter, body shape and auth requirement — and it
 * was being served unauthenticated, which hands anyone probing the API a
 * complete, accurate map instead of making them guess. Nothing in it is
 * secret on its own, but there is no reason to publish the blueprint.
 *
 * Set SWAGGER_ENABLED=true to turn it back on in a deployed environment (for
 * example while onboarding an integration partner).
 */
export const setupSwagger = (app: any) => {
  const isProduction = process.env.NODE_ENV === "production";
  const explicitlyEnabled = process.env.SWAGGER_ENABLED === "true";

  if (isProduction && !explicitlyEnabled) {
    console.log("🔒 Swagger UI disabled in production (set SWAGGER_ENABLED=true to expose it)");
    return;
  }

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