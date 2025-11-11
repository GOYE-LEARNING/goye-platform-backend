// ...existing code...
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db.js";
import dotenv from "dotenv";
dotenv.config();

export async function VerifyToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // prefer cookie (httpOnly) but accept Authorization header
  const cookieToken = (req as any).cookies?.token;
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  const token = cookieToken || bearerToken;
  if (!token) {
    return res.status(401).json({ message: "No token found" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.BEARERAUTH_SECRET || "secret-key"
    ) as any;
    (req as any).user = decoded;

    if (decoded?.id) {
      await prisma.user
        .update({
          where: { id: decoded.id },
          data: {
            isOnline: true,
            lastActive: new Date(),
          },
        })
        .catch((err) => console.error(err));
    }
    next();
  } catch (error: any) {
    const msg = error?.name === "TokenExpiredError" ? "Token expired" : "Invalid or expired token";
    return res.status(403).json({ message: msg });
  }
}
// ...existing code...