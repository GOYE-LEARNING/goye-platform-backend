// auth/authentication.ts - Use the updated functions
import { Request } from "express";
import prisma from "../db";
import { verifyAccessToken, refreshTokens, normalizeLevel, generateTokens } from "../utils/jwtHelper";

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[],
): Promise<any> {
  if (securityName === "bearerAuth") {
    // Get tokens
    let accessToken = request.cookies?.accessToken;
    const tokenFromHeader = request.headers["authorization"]?.split(" ")[1];
    
    if (!accessToken && tokenFromHeader) {
      accessToken = tokenFromHeader;
    }

    const refreshToken = request.cookies?.refreshToken;
    const deviceId = request.cookies?.deviceId || `device_${Date.now()}`;

    // Try to refresh if no access token
    if (!accessToken && refreshToken) {
      const tokens = await refreshTokens(refreshToken, deviceId);
      
      if (tokens && request.res) {
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
        
        accessToken = tokens.accessToken;
      }
    }

    if (!accessToken) {
      throw new Error("No access token provided");
    }

    // Verify access token
    let decoded = verifyAccessToken(accessToken);
    if (!decoded) {
      throw new Error("Invalid access token");
    }

    // Ensure level is present
    if (!decoded.level) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });
      
      if (user) {
        const normalizedLevel = normalizeLevel(user.level || "Beginners");
        decoded.level = normalizedLevel;
        
        // Regenerate token with level
        const newToken = generateTokens({
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          level: normalizedLevel,
          deviceId: deviceId,
        });
        
        if (request.res) {
          const isProduction = process.env.NODE_ENV === "production";
          request.res.cookie("accessToken", newToken.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
            maxAge: 15 * 60 * 1000,
          });
        }
      }
    }

    // Rest of your authentication logic...
    (request as any).user = await prisma.user.findUnique({ where: { id: decoded.id } });
    (request as any).deviceId = deviceId;
    
    if (decoded.organizationId) {
      (request as any).org = await prisma.organization.findUnique({
        where: { id: decoded.organizationId },
      });
    }

    return decoded;
  }

  throw new Error(`Security scheme ${securityName} not implemented`);
}