// auth/authentication.ts
import { Request } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { verifyAccessToken, normalizeLevel, verifyRefreshToken } from "../utils/jwtHelper";

// Define the decoded token type
interface DecodedToken {
  id: string;
  email: string;
  role: string;
  type?: string;
  level?: string;
  deviceId?: string;
  organizationId?: string;
  progressId?: string;
  planId?: string;
  settingsId?: string;
  [key: string]: any;
}

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

// Helper function to generate new tokens and session from refresh token
const regenerateFromRefreshToken = async (refreshToken: string, deviceId: string, request: Request) => {
  try {
    // Verify refresh token with type assertion
    const decodedRefresh = verifyRefreshToken(refreshToken) as DecodedToken | null;
    if (!decodedRefresh || !decodedRefresh.id) {
      console.error("❌ Invalid refresh token format or missing id");
      return null;
    }

    console.log(`🔄 Found refresh token for user: ${decodedRefresh.id}`);

    // Get user from database (without include since relations might not exist)
    const user = await prisma.user.findUnique({
      where: { id: decodedRefresh.id },
    });

    if (!user) {
      console.error("❌ User not found for refresh token");
      return null;
    }

    console.log(`✅ User found: ${user.email_address}`);

    // Fetch related data separately
    let userOrganization = null;
    let userProgress = null;
    let userSetting = null;
    let userPricingHistory = null;

    try {
      // Try to get organization if it exists
      const organization = await prisma.organization.findFirst({
        where: { userId: user.id }
      });
      if (organization) userOrganization = organization;
    } catch (error) {
      console.log("No organization relation found");
    }

    try {
      // Try to get progress if it exists
      const progress = await prisma.progress.findFirst({
        where: { userId: user.id }
      });
      if (progress) userProgress = progress;
    } catch (error) {
      console.log("No progress relation found");
    }

    try {
      // Try to get settings if it exists
      const settings = await prisma.settings.findFirst({
        where: { userId: user.id }
      });
      if (settings) userSetting = settings;
    } catch (error) {
      console.log("No settings relation found");
    }

    try {
      // Try to get pricing history if it exists
      const pricingHistory = await prisma.pricingHistory.findFirst({
        where: { userId: user.id },
        orderBy: { planActivatedAt: 'desc' }
      });
      if (pricingHistory) userPricingHistory = pricingHistory;
    } catch (error) {
      console.log("No pricingHistory relation found");
    }

    // Get or create device info
    const deviceType = request.headers["user-agent"] ? "web" : "unknown";
    
    // Determine user type
    const userType = decodedRefresh.type || 
                     (userOrganization ? "ORGANIZATION" : 
                      user.userType ? "INVITED_USER" : "USER");

    // Normalize level
    const normalizedLevel = normalizeLevel(user.level || "Beginners");

    // Prepare payload for new tokens
    const payload: any = {
      id: user.id,
      email: user.email_address,
      role: user.role,
      deviceId: deviceId,
      level: normalizedLevel,
      deviceType: deviceType,
      type: userType,
    };

    // Add organization data if exists
    if (userOrganization) {
      payload.organizationId = userOrganization.id;
      payload.userId = user.id;
      payload.organization_name = userOrganization.organization_name;
    }

    // Add progress data for regular users
    if (userProgress && userProgress.id) {
      payload.progressId = userProgress.id;
    }
    
    // Add pricing history data
    if (userPricingHistory && userPricingHistory.id) {
      payload.planId = userPricingHistory.id;
    }
    
    // Add settings data
    if (userSetting && userSetting.id) {
      payload.settingsId = userSetting.id;
    }

    // Generate new tokens
    const newAccessToken = jwt.sign(payload, process.env.ACCESS_SECRET!, { expiresIn: "15m" });
    const newRefreshToken = jwt.sign(
      {
        id: user.id,
        email: user.email_address,
        deviceId: deviceId,
        level: normalizedLevel,
        deviceType: deviceType,
        type: userType,
      },
      process.env.REFRESH_SECRET!,
      { expiresIn: "7d" }
    );

    // Update any revoked sessions for this user and device
    await prisma.userSession.updateMany({
      where: {
        userId: user.id,
        deviceId: deviceId,
        isRevoked: true
      },
      data: {
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    });

    // Create or update session
    const existingSession = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        deviceId: deviceId,
      }
    });

    let session;
    if (existingSession) {
      // Update existing session
      session = await prisma.userSession.update({
        where: { id: existingSession.id },
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          lastActive: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isRevoked: false,
        }
      });
      console.log(`✅ Updated existing session for user: ${user.id}`);
    } else {
      // Create new session
      session = await prisma.userSession.create({
        data: {
          userId: user.id,
          deviceId: deviceId,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lastActive: new Date(),
          isRevoked: false,
          deviceType: deviceType,
          userType: userType,
        }
      });
      console.log(`✅ Created new session for user: ${user.id}`);
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: user,
      decoded: payload
    };
    
  } catch (error) {
    console.error("❌ Error regenerating from refresh token:", error);
    return null;
  }
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
    const deviceId = request.cookies?.deviceId || request.headers["x-device-id"] || `device_${Date.now()}_${Math.random()}`;
    
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

    // CASE 1: No access token - try to generate from refresh token
    if (!accessToken) {
      console.log("🔄 No access token, attempting to generate from refresh token...");
      
      if (!refreshToken) {
        console.error("❌ No refresh token available");
        throw new Error("No access token or refresh token provided");
      }

      // Try to regenerate from refresh token
      const regenerated = await regenerateFromRefreshToken(refreshToken, deviceId, request);
      
      if (regenerated && request.res) {
        // Set new cookies
        setSecureCookie(request.res, "accessToken", regenerated.accessToken, 15 * 60 * 1000);
        setSecureCookie(request.res, "refreshToken", regenerated.refreshToken, 7 * 24 * 60 * 60 * 1000);
        setSecureCookie(request.res, "deviceId", deviceId, 365 * 24 * 60 * 60 * 1000);
        
        accessToken = regenerated.accessToken;
        
        // Attach user and org to request
        (request as any).user = regenerated.user;
        (request as any).deviceId = deviceId;
        
        if (regenerated.decoded.organizationId) {
          const organization = await prisma.organization.findUnique({
            where: { id: regenerated.decoded.organizationId },
          });
          if (organization) {
            (request as any).org = organization;
          }
        }
        
        console.log("✅ Successfully generated new tokens from refresh token!");
        return regenerated.decoded;
      } else {
        console.error("❌ Failed to generate tokens from refresh token");
        throw new Error("Unable to authenticate: Please login again");
      }
    }

    // CASE 2: Have access token - verify it
    let decoded: DecodedToken | null = null;
    try {
      decoded = verifyAccessToken(accessToken) as DecodedToken | null;
      if (!decoded || !decoded.id) {
        console.log("⚠️ Access token invalid, attempting to refresh...");
        
        // Try to refresh using refresh token
        if (refreshToken) {
          const regenerated = await regenerateFromRefreshToken(refreshToken, deviceId, request);
          
          if (regenerated && request.res) {
            setSecureCookie(request.res, "accessToken", regenerated.accessToken, 15 * 60 * 1000);
            setSecureCookie(request.res, "refreshToken", regenerated.refreshToken, 7 * 24 * 60 * 60 * 1000);
            
            accessToken = regenerated.accessToken;
            decoded = regenerated.decoded as DecodedToken;
            
            (request as any).user = regenerated.user;
            (request as any).deviceId = deviceId;
            
            if (regenerated.decoded.organizationId) {
              const organization = await prisma.organization.findUnique({
                where: { id: regenerated.decoded.organizationId },
              });
              if (organization) {
                (request as any).org = organization;
              }
            }
            
            console.log("✅ Successfully refreshed expired token!");
          } else {
            throw new Error("Invalid refresh token");
          }
        } else {
          throw new Error("No refresh token available");
        }
      }
    } catch (error) {
      console.error("❌ Token verification failed:", error);
      throw new Error("Invalid or expired token");
    }

    // Ensure we have a valid decoded token at this point
    if (!decoded || !decoded.id) {
      throw new Error("Invalid token payload");
    }

    // CASE 3: Ensure level is present
    if (!decoded.level) {
      console.log("⚠️ Token missing level, fetching from database...");
      
      const userFromDb = await prisma.user.findUnique({
        where: { id: decoded.id },
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
        console.log(`⚠️ Set default level: Beginners`);
      }
    }

    // CASE 4: Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      console.error("❌ User not found in database");
      throw new Error("User not found");
    }

    // CASE 5: Ensure session exists (create if not)
    let session = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        deviceId: deviceId,
        isRevoked: false,
      }
    });

    if (!session) {
      console.log("🔄 No session found, creating new session...");
      
      session = await prisma.userSession.create({
        data: {
          userId: user.id,
          deviceId: deviceId,
          accessToken: accessToken,
          refreshToken: refreshToken || '',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lastActive: new Date(),
          isRevoked: false,
          deviceType: request.headers["user-agent"] ? "web" : "unknown",
          userType: decoded.type || "USER",
        }
      });
      
      console.log(`✅ Created new session for user: ${user.id}`);
    } else {
      // Update session
      await prisma.userSession.update({
        where: { id: session.id },
        data: { 
          lastActive: new Date(),
          accessToken: accessToken
        }
      });
    }

    // Attach data to request
    (request as any).user = user;
    (request as any).deviceId = deviceId;

    if (decoded.progressId) {
      (request as any).progressId = decoded.progressId;
    }
    if (decoded.planId) {
      (request as any).planId = decoded.planId;
    }

    // Attach organization if exists
    if (decoded.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: decoded.organizationId },
      });
      if (organization) {
        (request as any).org = organization;
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