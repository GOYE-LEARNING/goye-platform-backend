import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import prisma from "../db";
import { verifyAccessToken } from "../utils/jwtHelper";

export async function VerifyToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Try to get access token from cookie or header
    const accessTokenFromCookie = req.cookies?.accessToken;
    const accessTokenFromHeader = req.headers.authorization?.split(" ")[1];
    let accessToken = accessTokenFromCookie || accessTokenFromHeader;

    // If no access token, check for refresh token
    if (!accessToken) {
      const refreshToken = req.cookies?.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ message: "No tokens found" });
      }

      // Attempt to refresh the access token
      try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET!);
        const user = await prisma.user.findUnique({
          where: { id: (decoded as any).id }
        });

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Generate new access token
        accessToken = jwt.sign(
          {
            id: user.id,
            email: user.email_address,
            role: user.role,
            level: user.level
          },
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" }
        );

        // Set new access token in cookie
        res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: 15 * 60 * 1000
        });
      } catch (refreshError) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
      }
    }

    // Verify access token
    let decoded: any;
    try {
      decoded = verifyAccessToken(accessToken);
      if (!decoded) {
        return res.status(403).json({ message: "Invalid access token" });
      }
    } catch {
      return res.status(403).json({ message: "Invalid access token" });
    }

    // ✅ Attach USER
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;

    if (decoded.progressId) {
      req.progressId = decoded.progressId;
      console.log("📋 Progress ID attached to request:", req.progressId);
    }
    
    if(decoded.planId) {
      req.planId = decoded.planId;
      console.log("📋 Plan ID attached to request in expressAuthentication:", decoded.planId);
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastActive: new Date() },
    });
    
    // Attach Organization if organizationId exists
    if (decoded.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: {
          id: decoded.organizationId
        }
      })

      if (organization) {
        req.org = organization

        await prisma.organization.update({
          where: {
            id: decoded.organizationId,
          },
          data: {
            isOnline: true,
            lastActive: new Date()
          }
        })
      }
    }

    console.log("Check the decoded: " + decoded)

    return next();
  } catch (err) {
    console.error("VerifyToken error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}