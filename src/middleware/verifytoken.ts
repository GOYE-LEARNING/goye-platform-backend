import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken'
import prisma from "../db";
export async function VerifyToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tokenFromCookie = req.cookies?.token;
    const tokenFromHeader = req.headers.authorization?.split(" ")[1];
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      return res.status(401).json({ message: "No token found" });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.BEARERAUTH_SECRET!);
    } catch {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // ✅ Attach USER
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;

    // ✅ mark user online
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastActive: new Date() },
    });

    
    //Attach Orgnization
    const organization = await prisma.organization.findUnique({
      where: {
        id: decoded.organization_id
      }
    })

    if (!organization) {
      return res.status(404).json({
        message: 'Organization not found',
        status: 404
      })
    }

    if (organization) {
      await prisma.organization.update({
        where: {
          id: decoded.organization_id,
        },
        data: {
          isOnline: true,
          lastActive: new Date()
        }
      })
    }

    return next();
  } catch (err) {
    console.error("VerifyToken error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
