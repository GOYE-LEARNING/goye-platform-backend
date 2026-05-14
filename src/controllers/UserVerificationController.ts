import jwt from "jsonwebtoken";
import prisma from "../db";
import { verifyRefreshToken } from "../utils/jwtHelper";
import { Controller, Post, Request, Route, Tags } from "tsoa";

@Tags("User Verification")
@Route("verify")
export class UserVerificationController extends Controller {
  @Post("/refresh-token")
  public async RefreshToken(@Request() req: any): Promise<any> {
    try {
      // Determine environment for cookie settings
      const isProduction = process.env.NODE_ENV === "production";
      
      // Get refresh token from cookie or header
      const refreshToken =
        req.cookies?.refreshToken || req.headers["x-refresh-token"];
      const deviceId = req.cookies?.deviceId || req.headers["x-device-id"];

      console.log("Refresh token request:", { 
        hasRefreshToken: !!refreshToken, 
        hasDeviceId: !!deviceId,
        cookies: req.cookies,
        isProduction 
      });

      if (!refreshToken || !deviceId) {
        this.setStatus(401);
        return {
          success: false,
          message: "No refresh token or device ID provided",
        };
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        this.setStatus(403);
        return {
          success: false,
          message: "Invalid or expired refresh token",
        };
      }

      // Check if session exists and is valid
      const userSession = await prisma.userSession.findFirst({
        where: {
          refreshToken: refreshToken,
          deviceId: deviceId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!userSession) {
        this.setStatus(403);
        return {
          success: false,
          message: "Invalid session",
        };
      }

      // Get progress and plan
      const progress = await prisma.progress.findFirst({
        where: { userId: userSession.user.id },
      });

      const plan = await prisma.pricingHistory.findFirst({
        where: { userId: userSession.user.id },
      });

      // Prepare token payload with all necessary data
      const tokenPayload: any = {
        id: userSession.user.id,
        email: userSession.user.email_address,
        role: userSession.user.role,
        level: userSession.user.level,
        deviceId: deviceId,
        deviceType: userSession.deviceType,
        type: userSession.userType,
        progressId: progress?.id,
        planId: plan?.id,
        full_name: `${userSession.user.first_name} ${userSession.user.last_name}`,
        updateStatus: userSession.user.isOnline,
      };

      // Add type-specific data
      if (userSession.userType === "ADMIN") {
        const adminProfile = await prisma.adminProfile.findUnique({
          where: { userId: userSession.user.id },
        });
        tokenPayload.adminRole = adminProfile?.role || "super_admin";
      }

      if (userSession.userType === "ORGANIZATION") {
        const organization = await prisma.organization.findFirst({
          where: { userId: userSession.user.id },
        });
        tokenPayload.organizationId = organization?.id;
        tokenPayload.organization_name = organization?.organization_name;
        tokenPayload.organization_email = organization?.organization_email;
      }

      if (userSession.userType === "INVITED_USER") {
        const invitation = await prisma.inviteUser.findFirst({
          where: { email: userSession.user.email_address },
        });
        tokenPayload.organizationId = invitation?.organizationId || null;
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        tokenPayload,
        process.env.ACCESS_SECRET!,
        { expiresIn: "15m" },
      );

      // Update session with new access token
      await prisma.userSession.update({
        where: { id: userSession.id },
        data: {
          accessToken: newAccessToken,
          lastActive: new Date(),
        },
      });

      // ✅ FIX: Set new access token cookie with environment-aware settings
      if (req.res) {
        req.res.cookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: isProduction,      // false in development, true in production
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 15 * 60 * 1000, // 15 minutes
        });

        // Also update progress_id and plan_id cookies if they exist in payload
        if (progress?.id) {
          req.res.cookie("progress_id", progress.id, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          });
        }

        if (plan?.id) {
          req.res.cookie("plan_id", plan.id, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          });
        }
      }

      this.setStatus(200);
      return {
        success: true,
        message: "Token refreshed successfully",
        accessToken: newAccessToken,  // Return token in body as fallback
        user: {
          id: userSession.user.id,
          email: userSession.user.email_address,
          role: userSession.user.role,
          type: userSession.userType,
          progressId: progress?.id,
          planId: plan?.id,
        },
      };
    } catch (error: any) {
      console.error("Refresh token error:", error);
      this.setStatus(500);
      return {
        success: false,
        message: `Error refreshing token: ${error.message}`,
      };
    }
  }
}