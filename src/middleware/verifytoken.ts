import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db.js";

export async function VerifyToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(404).json({ message: "No token found" });
  }

  const token = req.cookies.token || authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret-key"
    ) as any;
    req.user = decoded;

    if (decoded.id) {
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
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}
