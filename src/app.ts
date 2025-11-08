import express, { type Request, type Response } from "express";
import cors from "cors";
// import swaggerUi from "swagger-ui-express"; // Comment out for now
import { RegisterRoutes } from "./routes/routes.js";
// import swaggerDocument from '../build/swagger.json'; // Comment out for now
import bodyParser from "body-parser";

const PORT = process.env.PORT || 4000;
const app = express();

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// Comment out swagger for deployment - fix this later
// app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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
  console.log(`Server is running on http://localhost:${PORT}`);
});