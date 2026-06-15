// auth/authentication.ts
import { Request } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { verifyAccessToken, refreshTokens, normalizeLevel, generateTokens, verifyRefreshToken } from "../utils/jwtHelper";

// Helper function to set secure cookies
const setSecureCookie = (res: any, name: string, value: string, maxAge: number) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(name, value, {
    httpOnly: true,
    secure: isProduction,
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
    // Get tokens from multiple sources
    let accessToken = request.cookies?.accessToken;
    const tokenFromHeader = request.headers["authorization"]?.split(" ")[1];
    const refreshToken = request.cookies?.refreshToken;
    const deviceId = request.cookies?.deviceId || request.headers["x-device-id"] || `device_${Date.now()}`;
    
    // Use token from header if available and no cookie token
    if (!accessToken && tokenFromHeader) {
      accessToken = tokenFromHeader;
    }

    console.log("🔐 Authentication check:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      deviceId: deviceId,
      path: request.path
    });

    // CASE 1: No access token but has refresh token - try to refresh
    if (!accessToken && refreshToken) {
      console.log("🔄 No access token, attempting to refresh using refresh token...");
      
      try {
        // First verify if refresh token is valid
        const decodedRefresh = verifyRefreshToken(refreshToken);
        if (!decodedRefresh) {
          console.error("❌ Invalid refresh token format");
          throw new Error("Invalid refresh token");
        }

        // Check if session exists in database
        const session = await prisma.userSession.findFirst({
          where: {
            refreshToken: refreshToken,
            deviceId: deviceId,
            isRevoked: false,
            expiresAt: { gt: new Date() }
          }
        });

        if (!session) {
          console.error("❌ No valid session found for refresh token");
          throw new Error("Session not found or expired");
        }

        // Get user data
        const user = await prisma.user.findUnique({
          where: { id: decodedRefresh.id }
        });

        if (!user) {
          console.error("❌ User not found for refresh token");
          throw new Error("User not found");
        }

        // Generate new tokens
        console.log(`✅ Generating new tokens for user: ${user.id}`);
        
        const normalizedLevel = normalizeLevel(user.level || "Beginners");
        
        const payload: any = {
          id: user.id,
          email: user.email_address,
          role: user.role,
          deviceId: deviceId,
          level: normalizedLevel,
          deviceType: session.deviceType || "web",
          type: session.userType || "USER",
        };

        // Add organization data if exists
        if (session.userType === "ORGANIZATION") {
          const organization = await prisma.organization.findFirst({
            where: { userId: user.id }
          });
          if (organization) {
            payload.organizationId = organization.id;
            payload.userId = user.id;
          }
        }

        // Add progress and plan data for regular users
        if (session.userType === "USER" || session.userType === "INVITED_USER") {
          const progress = await prisma.progress.findFirst({
            where: { userId: user.id }
          });
          if (progress) {
            payload.progressId = progress.id;
          }

          const plan = await prisma.pricingHistory.findFirst({
            where: { userId: user.id },
            orderBy: { planActivatedAt: 'desc' }
          });
          if (plan) {
            payload.planId = plan.id;
          }

          const settings = await prisma.settings.findFirst({
            where: { userId: user.id }
          });
          if (settings) {
            payload.settingsId = settings.id;
          }
        }

        // Generate new tokens
        const newAccessToken = jwt.sign(payload, process.env.ACCESS_SECRET!, { expiresIn: "15m" });
        const newRefreshToken = jwt.sign(
          {
            id: user.id,
            email: user.email_address,
            deviceId: deviceId,
            level: normalizedLevel,
            deviceType: session.deviceType,
            type: session.userType,
          },
          process.env.REFRESH_SECRET!,
          { expiresIn: "7d" }
        );

        // Update session in database
        await prisma.userSession.update({
          where: { id: session.id },
          data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            lastActive: new Date()
          }
        });

        // Set new cookies
        if (request.res) {
          setSecureCookie(request.res, "accessToken", newAccessToken, 15 * 60 * 1000);
          setSecureCookie(request.res, "refreshToken", newRefreshToken, 7 * 24 * 60 * 60 * 1000);
        }

        accessToken = newAccessToken;
        console.log("✅ Tokens refreshed successfully!");
        
      } catch (refreshError) {
        console.error("❌ Refresh token error:", refreshError);
        throw new Error("Failed to refresh token");
      }
    }

    // CASE 2: Still no access token after refresh attempt
    if (!accessToken) {
      console.error("❌ No access token provided and refresh failed");
      throw new Error("No access token provided");
    }

    // CASE 3: Verify access token
    let decoded: any;
    try {
      decoded = verifyAccessToken(accessToken);
      if (!decoded) {
        console.error("❌ Invalid access token");
        throw new Error("Invalid access token");
      }
      console.log(`✅ Access token verified for user: ${decoded.id}`);
    } catch (error) {
      console.error("❌ Access token verification failed:", error);
      throw new Error("Invalid or expired access token");
    }

    // CASE 4: Check and fix missing level
    if (!decoded.level) {
      console.log("⚠️ Token missing level, fetching from database...");
      
      const userFromDb = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { level: true, email_address: true, role: true }
      });
      
      if (userFromDb?.level) {
        const normalizedLevel = normalizeLevel(userFromDb.level);
        decoded.level = normalizedLevel;
        
        // Generate new token with level
        const newAccessToken = jwt.sign(
          { ...decoded },
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" }
        );
        
        if (request.res) {
          setSecureCookie(request.res, "accessToken", newAccessToken, 15 * 60 * 1000);
        }
        
        console.log(`✅ Token updated with level: ${normalizedLevel}`);
      } else {
        decoded.level = "Beginners";
        console.log(`⚠️ Set default level: Beginners for user ${decoded.id}`);
      }
    }

    // CASE 5: Validate session in database
    const session = await prisma.userSession.findFirst({
      where: {
        userId: decoded.id,
        deviceId: deviceId,
        isRevoked: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!session) {
      console.error("❌ No valid session found for user");
      
      // Try to create a new session if user exists
      const userExists = await prisma.user.findUnique({
        where: { id: decoded.id }
      });
      
      if (userExists && refreshToken) {
        console.log("🔄 Creating new session for user...");
        
        const newSession = await prisma.userSession.create({
          data: {
            userId: decoded.id,
            deviceId: deviceId,
            accessToken: accessToken,
            refreshToken: refreshToken || '',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            lastActive: new Date(),
            isRevoked: false,
            deviceType: request.headers["user-agent"] ? "web" : "unknown",
            userType: decoded.type || "USER"
          }
        });
        
        if (newSession) {
          console.log("✅ New session created for user:", decoded.id);
        }
      } else {
        throw new Error("Session not found");
      }
    } else {
      // Update session last active time
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastActive: new Date() }
      });
    }

    // CASE 6: Get and attach user to request
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      console.error("❌ User not found in database");
      throw new Error("User not found");
    }

    (request as any).user = user;
    (request as any).deviceId = deviceId;

    // Attach additional IDs
    if (decoded.progressId) {
      (request as any).progressId = decoded.progressId;
    }
    if (decoded.planId) {
      (request as any).planId = decoded.planId;
    }

    // CASE 7: Attach organization if exists
    if (decoded.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: decoded.organizationId },
      });
      if (organization) {
        (request as any).org = organization;
        console.log(`✅ Organization attached: ${organization.organization_name}`);
      }
    }

    // Update user online status
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastActive: new Date() },
    });

    console.log(`✅ Authentication successful for user: ${user.id} (${user.email_address})`);
    
    return decoded;
  }

  throw new Error(`Security scheme ${securityName} not implemented`);
}