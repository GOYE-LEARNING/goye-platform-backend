import express, { type Request, type Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "./routes/routes.js";
const PORT = process.env.PORT || 4000;
import swaggerDocument from '../build/swagger.json' with {type: 'json'};
import bodyParser from "body-parser";
import { VerifyToken } from "./middleware/verifytoken.js";
const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json())

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.get("/", (req: Request, res: Response) => {
  res.send("GOYE IS RUNNING");
});

RegisterRoutes(app)

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
