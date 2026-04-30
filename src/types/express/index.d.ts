import { Organization, User } from "@prisma/client";
declare global {
  namespace Express {
    interface Request {
      user?: User | null;
      org?:Organization | null;
      deviceId?: string;
      deviceType?: string;
      planId?: string
      progressId?: string
    }
  }
}
