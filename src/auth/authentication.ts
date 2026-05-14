import { Request } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { verifyAccessToken, verifyRefreshToken } from "../utils/jwtHelper";

// Helper function to normalize level
const normalizeLevel = (level: string): string => {
  if (!level) return "Beginners";
  
  const lowerLevel = level.toLowerCase();
  if (lowerLevel === 'beginner') return 'Beginners';
  if (lowerLevel === 'intermediate') return 'Intermediate';
  if (lowerLevel === 'organization') return 'ORGANIZATION';
  
  // If already in correct format, return as is
  if (level === 'Beginners' || level === 'Intermediate' || level === 'ORGANIZATION') {
    return level;
  }
  
  return 'Beginners';
};

// Helper function to set secure cookies based on environment
const setSecureCookie = (res: any, name: string, value: string, maxAge: number) => {
  const isProduction = process.env.NODE_ENV === "production";
  
  res.cookie(name, value, {
    httpOnly: true,
    secure: isProduction,      // false in development, true in production
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: maxAge
  });
};

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[],
): Promise<any> {
  if (securityName === "bearerAuth") {
    // Look for access token in both cookie and header
    let accessToken = request.cookies?.accessToken;
    const tokenFromHeader = request.headers["authorization"]?.split(" ")[1];
    
    if (!accessToken && tokenFromHeader) {
      accessToken = tokenFromHeader;
    }

    // If no access token, try to refresh using refresh token
    if (!accessToken) {
      const refreshToken = request.cookies?.refreshToken;
      
      if (!refreshToken) {
        throw new Error("No tokens provided");
      }

      try {
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) {
          throw new Error("Invalid refresh token");
        }

        const user = await prisma.user.findUnique({
          where: { id: decoded.id }
        });

        if (!user) {
          throw new Error("User not found");
        }

        // Normalize level from database
        const normalizedLevel = normalizeLevel(user.level);

        // Generate new access token
        accessToken = jwt.sign(
          {
            id: user.id,
            email: user.email_address,
            role: user.role,
            level: normalizedLevel
          },
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" }
        );

        // Set new access token in cookie if response object is available
        if (request.res) {
          setSecureCookie(request.res, "accessToken", accessToken, 15 * 60 * 1000);
        }
      } catch (error) {
        throw new Error("Failed to refresh token");
      }
    }

    // Verify access token
    let decoded: any;
    try {
      decoded = verifyAccessToken(accessToken);
      if (!decoded) {
        throw new Error("Invalid access token");
      }
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }

    // ✅ FIX: If level is missing from token, fetch from database and regenerate token
    if (!decoded.level) {
      console.log("⚠️ Warning: Decoded token has no level field! Fetching from database...", {
        userId: decoded.id,
        email: decoded.email,
        role: decoded.role
      });
      
      const userFromDb = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { level: true, email_address: true, role: true }
      });
      
      if (userFromDb?.level) {
        // Normalize the level from database
        const normalizedLevel = normalizeLevel(userFromDb.level);
        
        console.log(`✅ Found level in database: ${userFromDb.level} -> normalized: ${normalizedLevel}`);
        
        // Create new decoded object with level
        const updatedDecoded = {
          ...decoded,
          level: normalizedLevel
        };
        
        // Generate new access token with level
        const newAccessToken = jwt.sign(
          updatedDecoded,
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" }
        );
        
        // Update the cookie with new token
        if (request.res) {
          setSecureCookie(request.res, "accessToken", newAccessToken, 15 * 60 * 1000);
        }
        
        // Also update the session in database
        try {
          await prisma.userSession.updateMany({
            where: { userId: decoded.id },
            data: { accessToken: newAccessToken }
          });
        } catch (sessionError) {
          console.log("Could not update session, but continuing...");
        }
        
        // Update the decoded variable for this request
        decoded = updatedDecoded;
        
        console.log(`✅ Token updated with level: ${normalizedLevel} for user ${decoded.id}`);
      } else {
        console.warn(`⚠️ User ${decoded.id} has no level in database! Setting default level.`);
        
        // Set a default level
        const updatedDecoded = {
          ...decoded,
          level: "Beginners"
        };
        
        // Generate new token with default level
        const newAccessToken = jwt.sign(
          updatedDecoded,
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" }
        );
        
        if (request.res) {
          setSecureCookie(request.res, "accessToken", newAccessToken, 15 * 60 * 1000);
        }
        
        decoded = updatedDecoded;
        console.log(`✅ Token updated with default level: Beginners for user ${decoded.id}`);
      }
    } else {
      // Level exists, but ensure it's normalized
      const normalizedLevel = normalizeLevel(decoded.level);
      if (normalizedLevel !== decoded.level) {
        console.log(`📝 Normalizing level in token: "${decoded.level}" -> "${normalizedLevel}"`);
        decoded.level = normalizedLevel;
        
        // Update token with normalized level
        const newAccessToken = jwt.sign(
          decoded,
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" }
        );
        
        if (request.res) {
          setSecureCookie(request.res, "accessToken", newAccessToken, 15 * 60 * 1000);
        }
      }
    }

    // ✅ Attach USER to request
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new Error("User not found");
    }

    (request as any).user = user;

    if (decoded.progressId) {
      (request as any).progressId = decoded.progressId;
      console.log("📋 Progress ID attached to request in expressAuthentication:", decoded.progressId);
    }

    if(decoded.planId) {
      (request as any).planId = decoded.planId;
      console.log("📋 Plan ID attached to request in expressAuthentication:", decoded.planId);
    }
    
    // Update user online status
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastActive: new Date() },
    });

    // ✅ Attach ORGANIZATION if organizationId exists in token
    if (decoded.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: {
          id: decoded.organizationId,
        },
      });

      if (organization) {
        (request as any).org = organization;

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

    console.log("✅ Authentication successful for user:", {
      id: decoded.id,
      role: decoded.role,
      level: decoded.level
    });

    return decoded;
  }

  throw new Error(`Security scheme ${securityName} not implemented`);
}