import express, { Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "./routes/routes"; // No .js extension
import bodyParser from "body-parser";

const PORT = process.env.PORT || 4000;
const app = express();

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// Use require for JSON files in CommonJS
const swaggerDocument = require('./routes/swagger.json');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req: Request, res: Response) => {
  res.send("GOYE IS RUNNING");
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ 
    status: "OK", 
    message: "GOYE Education Platform API is running",
    timestamp: new Date().toISOString()
  });
});

RegisterRoutes(app);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});