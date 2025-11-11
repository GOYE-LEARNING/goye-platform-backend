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
  try {
    console.log("=== VERIFY TOKEN DEBUG ===");
    console.log("Request URL:", req.originalUrl);
    console.log("Request Headers:", req.headers);
    console.log("Cookies:", req.cookies);

    const tokenFromCookie = req.cookies?.token;
    const tokenFromHeader = req.headers.authorization?.split(" ")[1];
    const token = tokenFromCookie || tokenFromHeader;

    console.log("Token from cookie:", tokenFromCookie);
    console.log("Token from header:", tokenFromHeader);
    console.log("Token used:", token);

    if (!token) {
      console.warn("❌ No token found");
      return res.status(401).json({ message: "No token found" });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.BEARERAUTH_SECRET!);
      console.log("✅ Token decoded:", decoded);
    } catch (err) {
      console.error("❌ Token verification failed:", err);
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = decoded;

    // OPTIONAL: mark user online
    if (decoded.id) {
      prisma.user
        .update({
          where: { id: decoded.id },
          data: { isOnline: true, lastActive: new Date() },
        })
        .then(() => console.log(`✅ User ${decoded.id} marked online`))
        .catch((err) => console.error("⚠️ Failed to mark user online:", err));
    }

    return next();
  } catch (err) {
    console.error("Unexpected error in VerifyToken:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
