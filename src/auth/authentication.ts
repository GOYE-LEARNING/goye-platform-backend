import { Request } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { verifyAccessToken, verifyRefreshToken } from "../utils/jwtHelper";

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

        // Generate new access token
        accessToken = jwt.sign(
          {
            id: user.id,
            email: user.email_address,
            role: user.role
          },
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" }
        );

        // Set new access token in cookie if response object is available
        if (request.res) {
          request.res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/",
            maxAge: 15 * 60 * 1000
          });
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

    return decoded;
  }

  throw new Error(`Security scheme ${securityName} not implemented`);
}