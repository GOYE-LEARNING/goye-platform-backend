// auth/authentication.ts - FIXED VERSION
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
      const organization = await prisma.organization.findFirst({
        where: { userId: user.id }
      });
      if (organization) userOrganization = organization;
    } catch (error) {
      console.log("No organization relation found");
    }

    try {
      const progress = await prisma.progress.findFirst({
        where: { userId: user.id }
      });
      if (progress) userProgress = progress;
    } catch (error) {
      console.log("No progress relation found");
    }

    try {
      const settings = await prisma.settings.findFirst({
        where: { userId: user.id }
      });
      if (settings) userSetting = settings;
    } catch (error) {
      console.log("No settings relation found");
    }

    try {
      const pricingHistory = await prisma.pricingHistory.findFirst({
        where: { userId: user.id },
        orderBy: { planActivatedAt: 'desc' }
      });
      if (pricingHistory) userPricingHistory = pricingHistory;
    } catch (error) {
      console.log("No pricingHistory relation found");
    }

    const deviceType = request.headers["user-agent"] ? "web" : "unknown";
    
    const userType = decodedRefresh.type || 
                     (userOrganization ? "ORGANIZATION" : 
                      user.userType ? "INVITED_USER" : "USER");

    const normalizedLevel = normalizeLevel(user.level || "Beginners");

    const payload: any = {
      id: user.id,
      email: user.email_address,
      role: user.role,
      deviceId: deviceId,
      level: normalizedLevel,
      deviceType: deviceType,
      type: userType,
    };

    if (userOrganization) {
      payload.organizationId = userOrganization.id;
      payload.userId = user.id;
      payload.organization_name = userOrganization.organization_name;
    }

    if (userProgress && userProgress.id) {
      payload.progressId = userProgress.id;
    }
    
    if (userPricingHistory && userPricingHistory.id) {
      payload.planId = userPricingHistory.id;
    }
    
    if (userSetting && userSetting.id) {
      payload.settingsId = userSetting.id;
    }

    const newAccessToken = jwt.sign(payload, process.env.ACCESS_SECRET!, { expiresIn: "15m" });

    const session = await prisma.userSession.upsert({
      where: { deviceId: deviceId },
      create: {
        userId: user.id,
        deviceId: deviceId,
        accessToken: newAccessToken,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastActive: new Date(),
        isRevoked: false,
        deviceType: deviceType,
        userType: userType,
      },
      update: {
        userId: user.id,
        accessToken: newAccessToken,
        lastActive: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        deviceType: deviceType,
        userType: userType,
      }
    });
    console.log(`✅ Session upserted for user: ${user.id}`);

    return {
      accessToken: newAccessToken,
      refreshToken: refreshToken,
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
    const tokenFromHeader = request.headers["authorization"]?.split(" ")[1];
    let accessToken = tokenFromHeader || request.cookies?.accessToken;
    const refreshToken =
      (request.headers["x-refresh-token"] as string | undefined) || request.cookies?.refreshToken;
    
    // ✅ FIX: Read deviceId from BODY, HEADERS, or COOKIES
    const deviceId = 
      request.body?.deviceId || 
      request.headers["x-device-id"] || 
      request.cookies?.deviceId || 
      `device_${Date.now()}_${Math.random()}`;

    console.log("🔐 Authentication check:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      deviceId: deviceId,
      path: request.path,
      deviceIdSource: request.body?.deviceId ? 'body' : request.headers["x-device-id"] ? 'header' : request.cookies?.deviceId ? 'cookie' : 'generated'
    });

    // CASE 1: No access token - try to generate from refresh token
    if (!accessToken) {
      console.log("🔄 No access token, attempting to generate from refresh token...");
      
      if (!refreshToken) {
        console.error("❌ No refresh token available");
        throw new Error("No access token or refresh token provided");
      }

      const regenerated = await regenerateFromRefreshToken(refreshToken, deviceId, request);
      
      if (regenerated && request.res) {
        setSecureCookie(request.res, "accessToken", regenerated.accessToken, 15 * 60 * 1000);
        setSecureCookie(request.res, "refreshToken", regenerated.refreshToken, 7 * 24 * 60 * 60 * 1000);
        setSecureCookie(request.res, "deviceId", deviceId, 365 * 24 * 60 * 60 * 1000);
        
        accessToken = regenerated.accessToken;
        
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

    // CASE 5: Ensure session exists
    if (refreshToken) {
      await prisma.userSession.upsert({
        where: { deviceId: deviceId },
        create: {
          userId: user.id,
          deviceId: deviceId,
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lastActive: new Date(),
          isRevoked: false,
          deviceType: request.headers["user-agent"] ? "web" : "unknown",
          userType: decoded.type || "USER",
        },
        update: {
          lastActive: new Date(),
          accessToken: accessToken,
          isRevoked: false,
        }
      });
    } else {
      await prisma.userSession.updateMany({
        where: { deviceId: deviceId },
        data: { lastActive: new Date(), accessToken: accessToken, isRevoked: false },
      });
    }

    (request as any).user = user;
    (request as any).deviceId = deviceId;

    if (decoded.progressId) {
      (request as any).progressId = decoded.progressId;
    }
    if (decoded.planId) {
      (request as any).planId = decoded.planId;
    }

    if (decoded.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: decoded.organizationId },
      });
      if (organization) {
        (request as any).org = organization;
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastActive: new Date() },
    });

    console.log(`✅ Authentication successful for user: ${user.id} (${user.email_address})`);
    
    return decoded;
  }

  throw new Error(`Security scheme ${securityName} not implemented`);
}