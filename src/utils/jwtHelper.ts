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
  level?: number | string;
  updateStatus?: boolean;
  adminRole?: string;
  [key: string]: any; // Allow additional properties
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = (payload: TokenPayload): Tokens => {
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
    return jwt.verify(token, process.env.ACCESS_SECRET!);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, process.env.REFRESH_SECRET!);
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