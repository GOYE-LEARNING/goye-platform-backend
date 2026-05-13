// tokenUtils.ts
import jwt from "jsonwebtoken";
import prisma from "../db";
import crypto from "crypto";

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  type?: string;
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
  level?: string;  // Optional in interface but required at runtime
  updateStatus?: boolean;
  adminRole?: string;
  [key: string]: any;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = (payload: TokenPayload): Tokens => {
  // Validate required fields
  if (!payload.level) {
    console.error("ERROR: Level is missing from token payload!", {
      userId: payload.id,
      email: payload.email,
      role: payload.role,
      type: payload.type,
      payload: JSON.stringify(payload, null, 2)
    });
    throw new Error(`Cannot generate token: Level is undefined for user ${payload.id}. User must have a level (Beginners or Intermediate).`);
  }

  // Validate level is valid
  const validLevels = ["Beginners", "Intermediate", "ORGANIZATION"];
  if (!validLevels.includes(payload.level)) {
    console.error("ERROR: Invalid level value!", {
      userId: payload.id,
      level: payload.level,
      validLevels
    });
    throw new Error(`Cannot generate token: Invalid level "${payload.level}" for user ${payload.id}. Level must be one of: ${validLevels.join(", ")}`);
  }

  console.log(`✅ Generating token with level: ${payload.level} for user: ${payload.id}`);
  
  const accessToken = jwt.sign(
    payload,
    process.env.ACCESS_SECRET!,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { 
      id: payload.id, 
      email: payload.email,
      deviceId: payload.deviceId,
      level: payload.level,
      deviceType: payload.deviceType
    },
    process.env.REFRESH_SECRET!,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): any => {
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET!);
    
    // Log if level is missing in decoded token
    if (decoded && typeof decoded === 'object' && !decoded.level) {
      console.warn("⚠️ Warning: Decoded token has no level field!", {
        userId: decoded.id,
        email: decoded.email,
        role: decoded.role
      });
    } else if (decoded && typeof decoded === 'object') {
      console.log(`✅ Verified token with level: ${decoded.level} for user: ${decoded.id}`);
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): any => {
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET!);
    return decoded;
  } catch (error) {
    return null;
  }
};

export const generateDeviceId = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const getDeviceType = (userAgent: string): string => {
  if (!userAgent) return "unknown";
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile')) return "mobile";
  if (ua.includes('tablet')) return "tablet";
  if (ua.includes('windows') || ua.includes('mac') || ua.includes('linux')) return "desktop";
  return "web";
};

export const refreshAccessToken = async (refreshToken: string, deviceId: string): Promise<string | null> => {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) return null;

  const userSession = await prisma.userSession.findFirst({
    where: {
      refreshToken: refreshToken,
      deviceId: deviceId,
      isRevoked: false,
      expiresAt: { gt: new Date() }
    }
  });

  if (!userSession) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.id }
  });

  if (!user) return null;

  // Validate user has a level
  if (!user.level) {
    console.error(`ERROR: User ${user.id} has no level set in database!`);
    return null;
  }

  let additionalData: any = { 
    id: user.id, 
    email: user.email_address, 
    role: user.role,
    deviceId: deviceId,
    level: user.level,
    deviceType: userSession.deviceType
  };
  
  if (userSession.userType === "ADMIN") {
    const adminProfile = await prisma.adminProfile.findUnique({
      where: { userId: user.id }
    });
    additionalData.adminRole = adminProfile?.role || "super_admin";
    additionalData.type = "ADMIN";
  }

  if (userSession.userType === "ORGANIZATION") {
    const organization = await prisma.organization.findFirst({
      where: { userId: user.id }
    });
    additionalData.organizationId = organization?.id;
    additionalData.type = "ORGANIZATION";
  }

  if (userSession.userType === "INVITED_USER") {
    additionalData.type = "INVITED_USER";
  }

  if (userSession.userType === "USER") {
    additionalData.type = "USER";
  }

  const newAccessToken = jwt.sign(
    additionalData,
    process.env.ACCESS_SECRET!,
    { expiresIn: "15m" }
  );

  await prisma.userSession.update({
    where: { id: userSession.id },
    data: {
      accessToken: newAccessToken,
      lastActive: new Date()
    }
  });

  return newAccessToken;
};