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
      const isProduction = process.env.NODE_ENV === "production";
      
      const refreshToken = req.cookies?.refreshToken || req.headers["x-refresh-token"];
      const deviceId = req.cookies?.deviceId || req.headers["x-device-id"];

      console.log("Refresh token request:", { 
        hasRefreshToken: !!refreshToken, 
        hasDeviceId: !!deviceId,
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
        include: { 
          user: {
            include: {
              organization: true,
              adminProfile: true,
              organizationMemberships: {
                include: {
                  organization: true
                }
              }
            }
          }
        },
      });

      if (!userSession) {
        this.setStatus(403);
        return {
          success: false,
          message: "Invalid session",
        };
      }

      const user = userSession.user;

      // Get progress and plan
      const [progress, plan] = await Promise.all([
        prisma.progress.findFirst({
          where: { userId: user.id },
        }),
        prisma.pricingHistory.findFirst({
          where: { userId: user.id },
          orderBy: { planActivatedAt: 'desc' }
        }),
      ]);

      // Prepare token payload with all necessary data
      const tokenPayload: any = {
        id: user.id,
        email: user.email_address,
        role: user.role,
        level: user.level,
        deviceId: deviceId,
        deviceType: userSession.deviceType,
        type: user.userType, // ✓ Fixed: use the actual UserType enum value
        progressId: progress?.id,
        planId: plan?.id,
        full_name: `${user.first_name} ${user.last_name}`,
        updateStatus: user.isOnline,
        userType: user.userType, // Include for consistency
      };

      // Add type-specific data based on userType
      if (user.userType === "ADMIN") {
        const adminProfile = user.adminProfile;
        tokenPayload.adminRole = adminProfile?.role || "super_admin";
      } 
      else if (user.userType === "ORGANIZATION_OWNER") { // ✓ Fixed: use correct enum value
        const organization = user.organization;
        if (organization) {
          tokenPayload.organizationId = organization.id;
          tokenPayload.organization_name = organization.organization_name;
          tokenPayload.organization_email = organization.organization_email;
        }
      } 
      else if (user.userType === "INVITED_MEMBER") { // ✓ Fixed: use correct enum value
        // Get the organization this user was invited to
        const membership = user.organizationMemberships?.[0];
        if (membership) {
          tokenPayload.organizationId = membership.organizationId;
          tokenPayload.organization_name = membership.organization?.organization_name;
        }
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

      // Set cookies
      if (req.res) {
        req.res.cookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });

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
        accessToken: newAccessToken,
        user: {
          id: user.id,
          email: user.email_address,
          role: user.role,
          type: user.userType,
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