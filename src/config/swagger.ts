import swaggerUi from "swagger-ui-express";
import { join } from "path";
import fs from "fs";

export const setupSwagger = (app: any) => {
  try {
    const possiblePaths = [
      join(__dirname, "../routes", "swagger.json"),
      join(process.cwd(), "src", "routes", "swagger.json"),
      join(__dirname, "../../src/routes", "swagger.json"),
    ];

    let swaggerLoaded = false;

    for (const swaggerPath of possiblePaths) {
      console.log(` Looking for swagger at: ${swaggerPath}`);
      if (fs.existsSync(swaggerPath)) {
        console.log(` Found swagger.json at: ${swaggerPath}`);
        const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));
        app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
        swaggerLoaded = true;
        break;
      }
    }

    if (!swaggerLoaded) {
      console.log(" Could not find swagger.json in any location");
    }
  } catch (error) {
    console.error(" Swagger error:", error);
  }
};