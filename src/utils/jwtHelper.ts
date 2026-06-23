// jwtHelper.ts
import jwt from "jsonwebtoken";
import prisma from "../db";
import crypto from "crypto";
import { LanguageCode } from "@prisma/client";

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  type?: string;
  language?: string;
  languageCode?: string;
  deviceId?: string;
  deviceType?: string;
  progressId?: string;
  planId?: string;
  settingsId?: string;
  organizationId?: string;
  organization_name?: string;
  organization_email?: string;
  organization_role?: string;
  userId?: string;
  full_name?: string;
  level?: string;
  updateStatus?: boolean;
  adminRole?: string;
  provider?: string;
  firebase_uid?: string;
  user_pic?: string;
  isProfileComplete?: boolean;
  [key: string]: any;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// Helper function to normalize level
export const normalizeLevel = (level: string): string => {
  if (!level) return "Beginners";

  const lowerLevel = level.toLowerCase();
  if (lowerLevel === "beginner") return "Beginners";
  if (lowerLevel === "intermediate") return "Intermediate";
  if (lowerLevel === "organization") return "ORGANIZATION";

  // If already in correct format
  if (
    level === "Beginners" ||
    level === "Intermediate" ||
    level === "ORGANIZATION"
  ) {
    return level;
  }

  return "Beginners";
};

// Validate level is valid
export const isValidLevel = (level: string): boolean => {
  const validLevels = ["Beginners", "Intermediate", "ORGANIZATION"];
  const normalized = normalizeLevel(level);
  return validLevels.includes(normalized);
};

export const generateTokens = (payload: TokenPayload): Tokens => {
  // Check if level exists
  if (!payload.level) {
    console.error("ERROR: Level is missing from token payload!", {
      userId: payload.id,
      email: payload.email,
      role: payload.role,
      type: payload.type,
    });

    // Set default level instead of throwing error
    payload.level = "Beginners";
    console.log(`⚠️ Set default level "Beginners" for user ${payload.id}`);
  }

  // Normalize level
  const normalizedLevel = normalizeLevel(payload.level);

  // Validate level is valid
  if (!isValidLevel(normalizedLevel)) {
    console.error("ERROR: Invalid level value!", {
      userId: payload.id,
      originalLevel: payload.level,
      normalizedLevel,
    });
    // Use default level
    payload.level = "Beginners";
  } else {
    payload.level = normalizedLevel;
  }

  console.log(
    `✅ Generating token with level: ${payload.level} for user: ${payload.id}`,
  );

  // Create access token payload with essential fields
  const accessPayload: any = {
    id: payload.id,
    email: payload.email,
    language: payload.language,
    languageCode: payload.languageCode,
    role: payload.role,
    level: payload.level,
    type: payload.type || "USER",
    deviceId: payload.deviceId,
  };

  // Add optional fields if they exist
  if (payload.organizationId)
    accessPayload.organizationId = payload.organizationId;
  if (payload.userId) accessPayload.userId = payload.userId;
  if (payload.progressId) accessPayload.progressId = payload.progressId;
  if (payload.planId) accessPayload.planId = payload.planId;
  if (payload.settingsId) accessPayload.settingsId = payload.settingsId;
  if (payload.full_name) accessPayload.full_name = payload.full_name;
  if (payload.adminRole) accessPayload.adminRole = payload.adminRole;
  if (payload.user_pic) accessPayload.user_pic = payload.user_pic;
  if (payload.language) accessPayload.language = payload.language
    if (payload.language) accessPayload.languageCode = payload.languageCode
  if (payload.isProfileComplete !== undefined)
    accessPayload.isProfileComplete = payload.isProfileComplete;

  const accessToken = jwt.sign(accessPayload, process.env.ACCESS_SECRET!, {
    expiresIn: "15m",
  });

  // Create refresh token payload (lighter)
  const refreshPayload = {
    id: payload.id,
    email: payload.email,
    deviceId: payload.deviceId,
    level: payload.level,
    deviceType: payload.deviceType,
    type: payload.type,
  };

  const refreshToken = jwt.sign(refreshPayload, process.env.REFRESH_SECRET!, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): any => {
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET!);

    // Log if level is missing in decoded token
    if (decoded && typeof decoded === "object") {
      if (!decoded.level) {
        console.warn("⚠️ Warning: Decoded token has no level field!", {
          userId: decoded.id,
          email: decoded.email,
          role: decoded.role,
        });
      } else {
        console.log(
          `✅ Verified token with level: ${decoded.level} for user: ${decoded.id}`,
        );
      }
    }

    return decoded;
  } catch (error) {
    console.error("Access token verification failed:", error);
    return null;
  }
};

export const verifyRefreshToken = (token: string): any => {
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET!);
    return decoded;
  } catch (error) {
    console.error("Refresh token verification failed:", error);
    return null;
  }
};

// Main refresh function that returns both tokens
export const refreshTokens = async (
  refreshToken: string,
  deviceId: string,
): Promise<{ accessToken: string; refreshToken: string } | null> => {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      console.error("Invalid refresh token");
      return null;
    }

    // Find session
    const userSession = await prisma.userSession.findFirst({
      where: {
        refreshToken: refreshToken,
        deviceId: deviceId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!userSession) {
      console.error("Session not found or expired");
      return null;
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      console.error("User not found");
      return null;
    }

    // Get normalized level
    let normalizedLevel = normalizeLevel(user.level || "Beginners");

    // Prepare payload for new tokens
    const payload: TokenPayload = {
      id: user.id,
      email: user.email_address,
      role: user.role,
      language: user.language,
      LanguageCode: user.languageCode,
      deviceId: deviceId,
      level: normalizedLevel,
      deviceType: userSession.deviceType,
      type: userSession.userType || "USER",
    };

    // Add type-specific fields
    if (userSession.userType === "ADMIN") {
      const adminProfile = await prisma.adminProfile.findUnique({
        where: { userId: user.id },
      });
      if (adminProfile) {
        payload.adminRole = adminProfile.role || "super_admin";
      }
    }

    if (userSession.userType === "ORGANIZATION") {
      const organization = await prisma.organization.findFirst({
        where: { userId: user.id },
      });
      if (organization) {
        payload.organizationId = organization.id;
        payload.organization_name = organization.organization_name;
        payload.organization_email = organization.organization_email;
        payload.userId = user.id;
      }
    }

    if (
      userSession.userType === "USER" ||
      userSession.userType === "INVITED_USER"
    ) {
      const progress = await prisma.progress.findFirst({
        where: { userId: user.id },
      });
      if (progress) {
        payload.progressId = progress.id;
      }

      const plan = await prisma.pricingHistory.findFirst({
        where: { userId: user.id },
        orderBy: { planActivatedAt: "desc" },
      });
      if (plan) {
        payload.planId = plan.id;
      }

      const settings = await prisma.settings.findFirst({
        where: { userId: user.id },
      });
      if (settings) {
        payload.settingsId = settings.id;
      }
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } =
      generateTokens(payload);

    // Update session with new tokens
    await prisma.userSession.update({
      where: { id: userSession.id },
      data: {
        accessToken: accessToken,
        refreshToken: newRefreshToken,
        lastActive: new Date(),
      },
    });

    console.log(
      `✅ Tokens refreshed for user: ${user.id} with level: ${normalizedLevel}`,
    );

    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    console.error("Error refreshing tokens:", error);
    return null;
  }
};

// Legacy function for backward compatibility
export const refreshAccessToken = async (
  refreshToken: string,
  deviceId: string,
): Promise<string | null> => {
  const tokens = await refreshTokens(refreshToken, deviceId);
  return tokens?.accessToken || null;
};

export const generateDeviceId = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const getDeviceType = (userAgent: string): string => {
  if (!userAgent) return "unknown";

  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile")) return "mobile";
  if (ua.includes("tablet")) return "tablet";
  if (ua.includes("windows") || ua.includes("mac") || ua.includes("linux"))
    return "desktop";
  return "web";
};

// Helper function to get user from token
export const getUserFromToken = async (token: string): Promise<any | null> => {
  try {
    const decoded = verifyAccessToken(token);
    if (!decoded) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    return user;
  } catch (error) {
    console.error("Error getting user from token:", error);
    return null;
  }
};

// Helper function to get organization from token
export const getOrganizationFromToken = async (
  token: string,
): Promise<any | null> => {
  try {
    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.organizationId) return null;

    const organization = await prisma.organization.findUnique({
      where: { id: decoded.organizationId },
    });

    return organization;
  } catch (error) {
    console.error("Error getting organization from token:", error);
    return null;
  }
};

// Helper function to decode token without verification (for debugging only)
export const decodeToken = (token: string): any => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};
