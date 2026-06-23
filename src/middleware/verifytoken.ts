import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { verifyAccessToken } from "../utils/jwtHelper";

// Helper function to normalize level
const normalizeLevel = (level: string): string => {
  if (!level) return "Beginners";

  const lowerLevel = level.toLowerCase();
  if (lowerLevel === "beginner") return "Beginners";
  if (lowerLevel === "intermediate") return "Intermediate";
  if (lowerLevel === "organization") return "ORGANIZATION";

  // If already in correct format, return as is
  if (
    level === "Beginners" ||
    level === "Intermediate" ||
    level === "ORGANIZATION"
  ) {
    return level;
  }

  return "Beginners";
};

export async function VerifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
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
          where: { id: (decoded as any).id },
        });

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Normalize level from database
        const normalizedLevel = normalizeLevel(user.level);

        // Generate new access token
        accessToken = jwt.sign(
          {
            id: user.id,
            email: user.email_address,
            role: user.role,
            language: user.language,
            languageCode: user.languageCode,
            level: normalizedLevel,
          },
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" },
        );

        // Set new access token in cookie
        res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });
      } catch (refreshError) {
        return res
          .status(401)
          .json({ message: "Invalid or expired refresh token" });
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

    // ✅ FIX: If level is missing from token, fetch from database and regenerate token
    if (!decoded.level) {
      console.log(
        "⚠️ Warning: Decoded token has no level field! Fetching from database...",
        {
          userId: decoded.id,
          email: decoded.email,
          role: decoded.role,
        },
      );

      const userFromDb = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { level: true, email_address: true, role: true },
      });

      if (userFromDb?.level) {
        // Normalize the level from database
        const normalizedLevel = normalizeLevel(userFromDb.level);

        console.log(
          `✅ Found level in database: ${userFromDb.level} -> normalized: ${normalizedLevel}`,
        );

        // Create new decoded object with level
        const updatedDecoded = {
          ...decoded,
          level: normalizedLevel,
        };

        // Generate new access token with level
        const newAccessToken = jwt.sign(
          updatedDecoded,
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" },
        );

        // Update the cookie with new token
        res.cookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });

        // Also update the session in database
        try {
          await prisma.userSession.updateMany({
            where: { userId: decoded.id },
            data: { accessToken: newAccessToken },
          });
        } catch (sessionError) {
          console.log("Could not update session, but continuing...");
        }

        // Update the decoded variable for this request
        decoded = updatedDecoded;

        console.log(
          `✅ Token updated with level: ${normalizedLevel} for user ${decoded.id}`,
        );
      } else {
        console.warn(
          `⚠️ User ${decoded.id} has no level in database! Setting default level.`,
        );

        // Set a default level
        const updatedDecoded = {
          ...decoded,
          level: "Beginners",
        };

        // Generate new token with default level
        const newAccessToken = jwt.sign(
          updatedDecoded,
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" },
        );

        res.cookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });

        decoded = updatedDecoded;
        console.log(
          `✅ Token updated with default level: Beginners for user ${decoded.id}`,
        );
      }
    } else {
      // Level exists, but ensure it's normalized
      const normalizedLevel = normalizeLevel(decoded.level);
      if (normalizedLevel !== decoded.level) {
        console.log(
          `📝 Normalizing level in token: "${decoded.level}" -> "${normalizedLevel}"`,
        );
        decoded.level = normalizedLevel;

        // Update token with normalized level
        const newAccessToken = jwt.sign(decoded, process.env.ACCESS_SECRET!, {
          expiresIn: "15m",
        });

        res.cookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });
      }
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

    if (decoded.planId) {
      req.planId = decoded.planId;
      console.log("📋 Plan ID attached to request:", decoded.planId);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastActive: new Date() },
    });

    // Attach Organization if organizationId exists
    if (decoded.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: {
          id: decoded.organizationId,
        },
      });

      if (organization) {
        req.org = organization;

        await prisma.organization.update({
          where: {
            id: decoded.organizationId,
          },
          data: {
            isOnline: true,
            lastActive: new Date(),
          },
        });
      }
    }

    console.log("Check the decoded level:", decoded.level);

    return next();
  } catch (err) {
    console.error("VerifyToken error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
