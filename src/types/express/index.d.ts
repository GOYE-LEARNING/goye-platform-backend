import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    export interface Request {
      user?: JwtPayload | string | any;
      org?: JwtPayload | string | any;
    }
  }
}
