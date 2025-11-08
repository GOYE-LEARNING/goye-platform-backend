import express, { type Request, type Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "./routes/routes";
import bodyParser from "body-parser";

const PORT = process.env.PORT || 4000;
const app = express();

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// Swagger documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(require('./routes/swagger.json')));

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