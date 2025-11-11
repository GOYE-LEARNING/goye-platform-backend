// ...existing code...
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db.js";
import dotenv from "dotenv";
dotenv.config();

export async function VerifyToken(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "No token found" });
  }

  try {
    const decoded = jwt.verify(token, process.env.BEARERAUTH_SECRET!) as any;
    req.user = decoded;

    // OPTIONAL: mark user online
    if (decoded.id) {
      prisma.user.update({
        where: { id: decoded.id },
        data: { isOnline: true, lastActive: new Date() }
      }).catch(() => {});
    }

    return next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}
