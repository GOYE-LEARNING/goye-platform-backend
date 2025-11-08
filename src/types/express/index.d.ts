import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    export interface Request {
      user?: JwtPayload | string | any; // you can type this more strictly later
    }
  }
}
