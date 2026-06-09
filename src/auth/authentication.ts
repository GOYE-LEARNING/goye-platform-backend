import { Request } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { verifyAccessToken, refreshTokens } from "../utils/jwtHelper";

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

// In your auth.ts file - updated expressAuthentication

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

    // Get deviceId from cookie
    const deviceId = request.cookies?.deviceId;
    
    // If no access token, try to refresh using refresh token
    if (!accessToken) {
      const refreshToken = request.cookies?.refreshToken;
      
      if (!refreshToken) {
        throw new Error("No tokens provided");
      }

      try {
        // Use refreshTokens function instead of refreshAccessToken
        const tokens = await refreshTokens(refreshToken, deviceId);
        
        if (!tokens) {
          throw new Error("Failed to refresh token");
        }

        // Set new tokens in cookies
        if (request.res) {
          const isProduction = process.env.NODE_ENV === "production";
          request.res.cookie("accessToken", tokens.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
            maxAge: 15 * 60 * 1000,
          });

          request.res.cookie("refreshToken", tokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          });
        }

        accessToken = tokens.accessToken;
      } catch (error) {
        console.error("Refresh token error:", error);
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

    // Validate session exists in database
    const session = await prisma.userSession.findFirst({
      where: {
        userId: decoded.id,
        deviceId: deviceId,
        isRevoked: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!session) {
      throw new Error("Session not found or expired");
    }

    // Update session last active time
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastActive: new Date() }
    });

    // ✅ FIX: If level is missing from token, fetch from database and regenerate token
    if (!decoded.level) {
      console.log("⚠️ Warning: Decoded token has no level field! Fetching from database...", {
        userId: decoded.id,
        email: decoded.email,
        role: decoded.role
      });
      
      const userFromDb = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { level: true }
      });
      
      if (userFromDb?.level) {
        // Normalize the level
        let normalizedLevel = userFromDb.level;
        if (normalizedLevel.toLowerCase() === 'beginner') normalizedLevel = 'Beginners';
        else if (normalizedLevel.toLowerCase() === 'intermediate') normalizedLevel = 'Intermediate';
        else if (normalizedLevel.toLowerCase() === 'organization') normalizedLevel = 'ORGANIZATION';
        
        console.log(`✅ Found level in database: ${userFromDb.level} -> normalized: ${normalizedLevel}`);
        
        // Create updated decoded object with level
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
          const isProduction = process.env.NODE_ENV === "production";
          request.res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
            maxAge: 15 * 60 * 1000,
          });
        }
        
        // Update the session in database
        await prisma.userSession.update({
          where: { id: session.id },
          data: { accessToken: newAccessToken }
        });
        
        // Update the decoded variable for this request
        decoded = updatedDecoded;
        
        console.log(`✅ Token updated with level: ${normalizedLevel} for user ${decoded.id}`);
      } else {
        console.warn(`⚠️ User ${decoded.id} has no level in database! Setting default level.`);
        
        const updatedDecoded = {
          ...decoded,
          level: "Beginners"
        };
        
        const newAccessToken = jwt.sign(
          updatedDecoded,
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" }
        );
        
        if (request.res) {
          const isProduction = process.env.NODE_ENV === "production";
          request.res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
            maxAge: 15 * 60 * 1000,
          });
        }
        
        decoded = updatedDecoded;
      }
    } else {
      // Level exists, but ensure it's normalized
      let normalizedLevel = decoded.level;
      if (normalizedLevel.toLowerCase() === 'beginner') normalizedLevel = 'Beginners';
      else if (normalizedLevel.toLowerCase() === 'intermediate') normalizedLevel = 'Intermediate';
      else if (normalizedLevel.toLowerCase() === 'organization') normalizedLevel = 'ORGANIZATION';
      
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
          const isProduction = process.env.NODE_ENV === "production";
          request.res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
            maxAge: 15 * 60 * 1000,
          });
        }
        
        // Update session
        await prisma.userSession.update({
          where: { id: session.id },
          data: { accessToken: newAccessToken }
        });
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
    (request as any).deviceId = deviceId;

    if (decoded.progressId) {
      (request as any).progressId = decoded.progressId;
      console.log("📋 Progress ID attached to request:", decoded.progressId);
    }

    if (decoded.planId) {
      (request as any).planId = decoded.planId;
      console.log("📋 Plan ID attached to request:", decoded.planId);
    }
    
    // Update user online status
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastActive: new Date() },
    });

    // ✅ Attach ORGANIZATION if organizationId exists in token
    if (decoded.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: decoded.organizationId },
      });

      if (organization) {
        (request as any).org = organization;

        await prisma.organization.update({
          where: { id: decoded.organizationId },
          data: { isOnline: true, lastActive: new Date() },
        });
      }
    }

    console.log("✅ Authentication successful for user:", {
      id: decoded.id,
      role: decoded.role,
      level: decoded.level,
      type: decoded.type
    });

    return decoded;
  }

  throw new Error(`Security scheme ${securityName} not implemented`);
}