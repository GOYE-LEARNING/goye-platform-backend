import {
  Route,
  Controller,
  Tags,
  Get,
  Post,
  Body,
  Security,
  Request,
  Put,
  Delete,
  Path,
} from "tsoa";
import prisma from "../db";
import { User } from "../interface/interfaces.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SendEmail } from "../utils/sendmail";

import { MediaService } from "../services/mediaServices";
import { NotificationService, Role } from "../services/notificationServices";
import { GrowthService } from "../services/growthService";
import { PricingService } from "../services/pricingService";
import {
  generateDeviceId,
  generateTokens,
  getDeviceType,
} from "../utils/jwtHelper";
import { firebaseAuthService } from "../services/firebaseService";
import { otpRateLimit } from "../utils/otp";

//User route start here
@Route("user")
@Tags("User control APIs")
export class UserController extends Controller {
  
@Post("/auth/google")
public async GoogleAuth(
  @Body() body: { idToken: string },
  @Request() req: any,
): Promise<any> {
  try {
    // Get device information
    const userAgent = req.headers["user-agent"] || "unknown";
    const deviceType = getDeviceType(userAgent);
    const deviceId = generateDeviceId();
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "unknown";

    // Determine environment for cookie settings
    const isProduction = process.env.NODE_ENV === "production";

    // Verify Google token
    const googleUser = await firebaseAuthService.verifyGoogleToken(body.idToken);

    if (!googleUser) {
      this.setStatus(401);
      return {
        success: false,
        message: "Invalid Google token",
      };
    }

    // Find or create user with detailed status
    const {
      user,
      isExistingUser,
      isProfileComplete,
      message: userStatusMessage,
    } = await firebaseAuthService.findOrCreateGoogleUser(googleUser);

    if (!user) {
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to process user",
      };
    }

    // Check if user is organization (has associated org)
    let organization = await prisma.organization.findFirst({
      where: { userId: user.id },
      include: { user: true },
    });

    // Update user online status
    const updateUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastActive: new Date(),
      },
    });

    // Handle ORGANIZATION type
    if (organization) {
      const updatedOrganization = await prisma.organization.update({
        where: { id: organization.id },
        data: {
          isOnline: true,
          lastActive: new Date(),
        },
        include: {
          user: true,
        },
      });

      // Get or create plan for organization
      let plan = await prisma.pricingHistory.findFirst({
        where: {
          userId: updateUser.id,
        },
      });

      if (!plan) {
        plan = await PricingService.GenerateNewPaymentForNewUser({
          userId: null,
          type: "ORGANIZATION",
          orgId: updatedOrganization.id,
        });
      }

      // Generate tokens for ORGANIZATION
      const { accessToken, refreshToken } = generateTokens({
        type: "ORGANIZATION",
        id: updateUser.id,
        email: updateUser.email_address,
        role: updateUser.role,
        organizationId: updatedOrganization.id,
        organization_name: updatedOrganization.organization_name,
        organization_email: updatedOrganization.organization_email,
        organization_role: updateUser.role,
        userId: updateUser.id,
        provider: "GOOGLE",
        level: "ORGANIZATION",
        firebase_uid: user.firebase_uid,
        deviceId: deviceId,
        deviceType: deviceType,
        full_name: `${updateUser.first_name} ${updateUser.last_name}`,
      });

      // Create or update session
      await prisma.userSession.upsert({
        where: { deviceId: deviceId },
        update: {
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "ORGANIZATION",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          lastActive: new Date(),
          isRevoked: false,
        },
        create: {
          userId: updateUser.id,
          deviceId: deviceId,
          deviceType: deviceType,
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "ORGANIZATION",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          isRevoked: false,
        },
      });

      // Set cookies
      if (req.res) {
        req.res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });

        req.res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("deviceId", deviceId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });
      }

      this.setStatus(200);
      return {
        success: true,
        message: "Google authentication successful",
        status: {
          isExistingUser: true,
          isProfileComplete: true,
          requiresProfileCompletion: false,
        },
        accessToken,
        refreshToken,
        user: {
          type: "organization",
          id: updatedOrganization.id,
          organization_name: updatedOrganization.organization_name,
          organization_email: updatedOrganization.organization_email,
          organization_role: updateUser.role,
          organization_isOnline: updatedOrganization.isOnline,
        },
      };
    }

    // Handle ADMIN user
    if (user.role === "goye_admin") {
      // Get admin profile
      const adminProfile = await prisma.adminProfile.findUnique({
        where: { userId: user.id },
      });

      // ALWAYS get or create progress for admin
      let progress = await prisma.progress.findFirst({
        where: { userId: user.id },
      });

      if (!progress) {
        progress = await prisma.progress.create({
          data: {
            userId: user.id,
            startedJourney: true,
            progressBar: 0,
          },
        });
      }

      let plan = await prisma.pricingHistory.findFirst({
        where: {
          userId: user.id,
        },
      });

      if (!plan) {
        plan = await PricingService.GenerateNewPaymentForNewUser({
          userId: user.id,
          type: "INDIVIDUAL",
          orgId: null,
        });
      }

      // Generate tokens for ADMIN
      const { accessToken, refreshToken } = generateTokens({
        type: "ADMIN",
        id: updateUser.id,
        email: updateUser.email_address,
        role: updateUser.role,
        adminRole: adminProfile?.role || "super_admin",
        progressId: progress.id,
        level: updateUser.level,
        provider: "GOOGLE",
        firebase_uid: user.firebase_uid,
        deviceId: deviceId,
        deviceType: deviceType,
        full_name: `${updateUser.first_name} ${updateUser.last_name}`,
      });

      // Create or update session
      await prisma.userSession.upsert({
        where: { deviceId: deviceId },
        update: {
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "ADMIN",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          lastActive: new Date(),
          isRevoked: false,
        },
        create: {
          userId: updateUser.id,
          deviceId: deviceId,
          deviceType: deviceType,
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "ADMIN",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          isRevoked: false,
        },
      });

      // Set cookies
      if (req.res) {
        req.res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });

        req.res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("deviceId", deviceId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("progress_id", progress.id, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      this.setStatus(200);
      return {
        success: true,
        message: "Google authentication successful",
        status: {
          isExistingUser: true,
          isProfileComplete: true,
          requiresProfileCompletion: false,
        },
        accessToken,
        refreshToken,
        user: {
          type: "ADMIN",
          id: updateUser.id,
          first_name: updateUser.first_name,
          last_name: updateUser.last_name,
          role: updateUser.role,
          adminRole: adminProfile?.role || "super_admin",
          progressId: progress.id,
        },
      };
    }

    // Handle INVITED user
    if (user.form_type === "INVITED") {
      const invitationOrg = await prisma.inviteUser.findFirst({
        where: {
          email: user.email_address,
        },
      });

      // ALWAYS get or create progress for invited user
      let progress = await prisma.progress.findFirst({
        where: { userId: user.id },
      });

      if (!progress) {
        progress = await prisma.progress.create({
          data: {
            userId: user.id,
            startedJourney: true,
            progressBar: 0,
          },
        });
      }

      let plan = await prisma.pricingHistory.findFirst({
        where: {
          userId: user.id,
        },
      });

      if (!plan) {
        plan = await PricingService.GenerateNewPaymentForNewUser({
          userId: user.id,
          type: "INVITED_INDIVIDUAL",
          orgId: null,
        });
      }

      // Generate tokens for INVITED_USER
      const { accessToken, refreshToken } = generateTokens({
        type: "INVITED_USER",
        id: updateUser.id,
        email: updateUser.email_address,
        role: updateUser.role,
        progressId: progress.id,
        level: updateUser.level,
        updateStatus: updateUser.isOnline,
        organizationId: invitationOrg?.organizationId || null,
        provider: "GOOGLE",
        firebase_uid: user.firebase_uid,
        deviceId: deviceId,
        deviceType: deviceType,
        full_name: `${updateUser.first_name} ${updateUser.last_name}`,
      });

      // Create or update session
      await prisma.userSession.upsert({
        where: { deviceId: deviceId },
        update: {
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "INVITED_USER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          lastActive: new Date(),
          isRevoked: false,
        },
        create: {
          userId: updateUser.id,
          deviceId: deviceId,
          deviceType: deviceType,
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "INVITED_USER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          isRevoked: false,
        },
      });

      // Set cookies
      if (req.res) {
        req.res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });

        req.res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("deviceId", deviceId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("progress_id", progress.id, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      this.setStatus(200);
      return {
        success: true,
        message: "Google authentication successful",
        status: {
          isExistingUser: true,
          isProfileComplete: true,
          requiresProfileCompletion: false,
        },
        accessToken,
        refreshToken,
        user: {
          type: "INVITED_USER",
          id: updateUser.id,
          first_name: updateUser.first_name,
          last_name: updateUser.last_name,
          role: updateUser.role,
          progressId: progress.id,
          form_type: user.form_type,
          organizationId: invitationOrg?.organizationId || null,
        },
      };
    }

    // Handle REGULAR user (INDIVIDUAL) - FIXED SECTION
    if (user.form_type === "INDIVIDUAL") {
      // ALWAYS get or create progress for regular user (even if profile not complete)
      let progress = await prisma.progress.findFirst({
        where: { userId: user.id },
      });

      if (!progress) {
        progress = await prisma.progress.create({
          data: {
            userId: user.id,
            startedJourney: true,
            progressBar: 0,
          },
        });
      }

      // Get or create plan
      let plan = await prisma.pricingHistory.findFirst({
        where: { userId: user.id },
      });

      if (!plan) {
        plan = await PricingService.GenerateNewPaymentForNewUser({
          userId: user.id,
          type: "INDIVIDUAL",
          orgId: null,
        });
      }

      // Get or create settings
      let settings = await prisma.settings.findFirst({
        where: { userId: user.id },
      });

      if (!settings) {
        settings = await prisma.settings.create({
          data: {
            enable_push_notification: true,
            course_updates: true,
            event: true,
            achievement: true,
            daily_reminders: true,
            darkMode: false,
            email_notification: true,
            updatedAt: new Date(),
            userId: user.id,
            organizationId: null,
          },
        });
      }

      // Generate tokens for REGULAR USER - progress is guaranteed to exist
      const { accessToken, refreshToken } = generateTokens({
        type: "USER",
        id: updateUser.id,
        email: updateUser.email_address,
        role: updateUser.role,
        level: updateUser.level,
        progressId: progress.id,
        updateStatus: updateUser.isOnline,
        planId: plan.id,
        settingsId: settings.id,
        provider: "GOOGLE",
        firebase_uid: user.firebase_uid,
        deviceId: deviceId,
        deviceType: deviceType,
        full_name: `${updateUser.first_name} ${updateUser.last_name}`,
        user_pic: user.user_pic,
        isProfileComplete: isProfileComplete,
      });

      // Create or update session
      await prisma.userSession.upsert({
        where: { deviceId: deviceId },
        update: {
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "USER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          lastActive: new Date(),
          isRevoked: false,
        },
        create: {
          userId: updateUser.id,
          deviceId: deviceId,
          deviceType: deviceType,
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "USER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          isRevoked: false,
        },
      });

      // Set cookies - progress_id is always set now
      if (req.res) {
        req.res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });

        req.res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("deviceId", deviceId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        // Always set progress_id (no conditional check needed anymore)
        req.res.cookie("progress_id", progress.id, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("plan_id", plan.id, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      // Determine response message based on user status
      let responseMessage = "";
      if (!isExistingUser) {
        responseMessage = "New user created. Please complete your profile.";
      } else if (isExistingUser && !isProfileComplete) {
        responseMessage = "Welcome back! Please complete your profile to continue.";
      } else if (isExistingUser && isProfileComplete) {
        responseMessage = "Welcome back! Your profile is complete.";
      }

      this.setStatus(200);
      return {
        success: true,
        message: responseMessage,
        status: {
          isExistingUser: isExistingUser,
          isProfileComplete: isProfileComplete,
          requiresProfileCompletion: !isProfileComplete,
          userStatusMessage: userStatusMessage,
        },
        accessToken,
        refreshToken,
        user: {
          type: "USER",
          id: updateUser.id,
          first_name: updateUser.first_name,
          last_name: updateUser.last_name,
          email_address: updateUser.email_address,
          role: updateUser.role,
          user_pic: user.user_pic,
          provider: user.provider,
          country: user.country,
          state: user.state,
          phone_number: user.phone_number,
          isProfileComplete: isProfileComplete,
          progressId: progress.id,
          planId: plan.id,
        },
      };
    }

    this.setStatus(404);
    return {
      success: false,
      message: "User not found",
    };
  } catch (error: any) {
    console.error("Google auth error:", error);
    this.setStatus(500);
    return {
      success: false,
      message: `Google authentication failed: ${error.message}`,
    };
  }
}
@Post("/signup")
public async CreateUser(
  @Body() body: Omit<User, "id">,
  @Request() req: any,
): Promise<any> {
  // Generate device information
  const userAgent = req.headers["user-agent"] || "unknown";
  const deviceType = getDeviceType(userAgent);
  const deviceId = generateDeviceId();
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || "unknown";
  
  // Determine environment for cookie settings
  const isProduction = process.env.NODE_ENV === "production";

  // First check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: {
      email_address: body.email_address,
    },
  });

  if (existingUser) {
    this.setStatus(400); // Conflict
    return {
      message: "User with this email already exists",
    };
  }

  if (body.password == "") {
    this.setStatus(400);
    return {
      message: "Password must be filled",
    };
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);

  // Create user with default level if not provided
  const user = await prisma.user.create({
    data: { ...body, password: hashedPassword, level: body.level },
  });

  //After creating Users.
  //It is necessary to automatically create settings database for the users.
  const createSettings = await prisma.settings.create({
    data: {
      enable_push_notification: true,
      course_updates: true,
      event: true,
      achievement: true,
      daily_reminders: true,
      darkMode: false,
      email_notification: true,
      updatedAt: new Date(),
      userId: user.id,
      organizationId: null,
    },
  });

  //Greeting user with notifications
  await NotificationService.createNotification({
    message: `Hello ${user.first_name}, you joined GOYE, get ready to encounter the best JESUS.`,
    title: "Welcome New User",
    type: "greeting",
    role: Role.STUDENT,
    to: Role.STUDENT,
    userId: user.id,
  });

  const updateUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isOnline: true,
      lastActive: new Date(),
    },
  });

  const plan = await PricingService.GenerateNewPaymentForNewUser({
    userId: updateUser.id,
    type: "INDIVIDUAL",
    orgId: null,
  });

  const startJourney = await prisma.progress.create({
    data: {
      userId: updateUser.id,
      startedJourney: true,
      progressBar: 0,
    },
    include: {
      user: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  // Create achievement message
  const achievementResult = await GrowthService.AchievementMessage({
    message_title: "Christian Cadet",
    message_content: `${startJourney.user.first_name} you just joined the rest of the soldiers to join the army`,
    point: 10,
    progress_message: "",
    userId: updateUser.id,
    badge: "CADET_BADGE",
    progressId: startJourney.id,
  });

  // Check if achievement was created successfully
  if (achievementResult.error) {
    console.error("Achievement creation failed:", achievementResult.error);
    // Still return success for journey but with achievement error
    this.setStatus(200);
    return {
      message: "Journey created successfully, but achievement creation failed",
      data: startJourney,
      achievementError: achievementResult.error,
    };
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = generateTokens({
    id: updateUser.id,
    email: updateUser.email_address,
    role: updateUser.role,
    type: updateUser.form_type || "INDIVIDUAL",
    settingsId: createSettings.id,
    full_name: `${updateUser.first_name} ${updateUser.last_name}`,
    progressId: startJourney.id,
    updateStatus: updateUser.isOnline,
    planId: plan.id,
    deviceId: deviceId,
    deviceType: deviceType,
    level: updateUser.level,
  });

  // Create user session with all required fields
  await prisma.userSession.create({
    data: {
      userId: updateUser.id,
      deviceId: deviceId,
      deviceType: deviceType,
      refreshToken: refreshToken,
      accessToken: accessToken,
      userType: "USER",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: userAgent,
      ipAddress: ipAddress,
      isRevoked: false,
    },
  });

  if (req.res) {
    // Set cookies - FIXED
    req.res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    req.res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.res.cookie("deviceId", deviceId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    req.res.cookie("progress_id", startJourney.id, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.res.cookie("plan_id", plan.id, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  this.setStatus(201);
  return {
    message: "Signup successful",
    accessToken,  // Return in body as fallback
    refreshToken, // Return in body as fallback
    deviceId,
    user: {
      id: updateUser.id,
      first_name: updateUser.first_name,
      last_name: updateUser.last_name,
      email_address: updateUser.email_address,
      planId: plan.id,
      progressId: startJourney.id,
    },
  };
}

  //login
@Post("/login")
public async Login(
  @Body()
  credentials: {
    email: string;
    password: string;
    deviceType?: string;
    deviceId?: string;
  },
  @Request() req: any,
): Promise<any> {
  const settingsId = req.org?.settingsId;
  
  // Determine environment for cookie settings
  const isProduction = process.env.NODE_ENV === "production";
  
  try {
    // Get device information
    const userAgent = req.headers["user-agent"] || "unknown";
    const deviceType = credentials.deviceType || getDeviceType(userAgent);
    const deviceId = credentials.deviceId || generateDeviceId();
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "unknown";

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        email_address: credentials.email,
      },
      include: {
        adminProfile: true, // Include admin profile if exists
      },
    });

    // Check for admin user first (before invited or regular)
    if (user && user.role === "goye_admin") {
      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password,
      );

      if (!isPasswordValid) {
        this.setStatus(401);
        return { message: "Password is invalid" };
      }

      // Check if this device already has an active session
      const existingSession = await prisma.userSession.findUnique({
        where: { deviceId: deviceId },
      });

      // Revoke old session for this device if exists
      if (existingSession) {
        await prisma.userSession.update({
          where: { id: existingSession.id },
          data: { isRevoked: true },
        });
      }

      const updateUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          lastActive: new Date(),
        },
        include: {
          user_plan: {
            select: {
              id: true,
            },
          },
        },
      });

      // Get or create progress for admin
      let progress = await prisma.progress.findFirst({
        where: { userId: user.id },
      });

      if (!progress) {
        progress = await prisma.progress.create({
          data: {
            userId: user.id,
            startedJourney: true,
            progressBar: 0,
          },
        });
      }

      const plan = await prisma.pricingHistory.findFirst({
        where: {
          userId: user.id,
        },
      });

      const planId = plan?.id ?? null;

      if (!plan) {
        await PricingService.GenerateNewPaymentForNewUser({
          userId: updateUser.id,
          type: "INDIVIDUAL",
          orgId: null,
        });
      }

      // Generate access and refresh tokens
      const { accessToken, refreshToken } = generateTokens({
        type: "ADMIN",
        id: updateUser.id,
        email: updateUser.email_address,
        role: updateUser.role,
        adminRole: user.adminProfile?.role || "super_admin",
        progressId: progress.id,
        level: updateUser.level,
        planId,
        deviceId: deviceId,
        deviceType: deviceType,
        full_name: `${updateUser.first_name} ${updateUser.last_name}`,
      });

      // Create or update user session
      await prisma.userSession.upsert({
        where: { deviceId: deviceId },
        update: {
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "ADMIN",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          lastActive: new Date(),
          isRevoked: false,
        },
        create: {
          userId: updateUser.id,
          deviceId: deviceId,
          deviceType: deviceType,
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "ADMIN",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
        },
      });

      if (req.res) {
        // Set cookies - FIXED
        req.res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });

        req.res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("deviceId", deviceId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("progress_id", progress.id, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("plan_id", planId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      this.setStatus(200);
      return {
        data: {
          message: "Login successful",
          accessToken,  // Return in body as fallback
          refreshToken, // Return in body as fallback
          deviceId,
          user: {
            type: "ADMIN",
            id: updateUser.id,
            first_name: updateUser.first_name,
            last_name: updateUser.last_name,
            role: updateUser.role,
            adminRole: user.adminProfile?.role || "super_admin",
            progressId: progress.id,
          },
        },
      };
    }

    // Check for invited users
    if (user && user.form_type === "INVITED") {
      const invitationOrg = await prisma.inviteUser.findFirst({
        where: {
          email: credentials.email,
        },
      });

      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password,
      );

      if (!isPasswordValid) {
        this.setStatus(401);
        return { message: "Password is invalid" };
      }

      // Check if this device already has an active session
      const existingSession = await prisma.userSession.findUnique({
        where: { deviceId: deviceId },
      });

      if (existingSession) {
        await prisma.userSession.update({
          where: { id: existingSession.id },
          data: { isRevoked: true },
        });
      }

      const updateUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          lastActive: new Date(),
        },
        include: {
          progress: {
            include: { user: true },
          },
        },
      });

      let progress = updateUser.progress?.[0];

      if (!progress) {
        progress = await prisma.progress.create({
          data: {
            userId: updateUser.id,
            startedJourney: true,
            progressBar: 0,
          },
          include: { user: true },
        });

        await GrowthService.AchievementMessage({
          message_title: "Christian Cadet",
          message_content: `${progress.user.first_name} you just joined the rest of the soldiers to join the army`,
          point: 10,
          progress_message: "",
          userId: updateUser.id,
          badge: "CADET_BADGE",
          progressId: progress.id,
        });
      }

      const plan = await prisma.pricingHistory.findFirst({
        where: {
          userId: user.id,
        },
      });

      const planId = plan?.id ?? null;

      if (!plan) {
        await PricingService.GenerateNewPaymentForNewUser({
          userId: updateUser.id,
          type: "INVITED_INDIVIDUAL",
          orgId: null,
        });
      }

      // Generate access and refresh tokens
      const { accessToken, refreshToken } = generateTokens({
        type: "INVITED_USER",
        id: updateUser.id,
        email: updateUser.email_address,
        role: updateUser.role,
        progressId: progress.id,
        level: updateUser.level,
        updateStatus: updateUser.isOnline,
        organizationId: invitationOrg?.organizationId || null,
        planId,
        deviceId: deviceId,
        deviceType: deviceType,
        full_name: `${updateUser.first_name} ${updateUser.last_name}`,
      });

      // Create or update user session
      await prisma.userSession.upsert({
        where: { deviceId: deviceId },
        update: {
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "INVITED_USER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          lastActive: new Date(),
          isRevoked: false,
        },
        create: {
          userId: updateUser.id,
          deviceId: deviceId,
          deviceType: deviceType,
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "INVITED_USER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
        },
      });

      if (req.res) {
        // Set cookies - FIXED
        req.res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });

        req.res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("deviceId", deviceId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("progress_id", progress.id, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("plan_id", planId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      this.setStatus(200);
      return {
        data: {
          message: "Login successful",
          accessToken,  // Return in body as fallback
          refreshToken, // Return in body as fallback
          deviceId,
          user: {
            type: "INVITED_USER",
            id: updateUser.id,
            first_name: updateUser.first_name,
            last_name: updateUser.last_name,
            role: updateUser.role,
            progressId: progress.id,
            form_type: updateUser.form_type,
            organizationId: invitationOrg?.organizationId || null,
          },
        },
      };
    }

    // Check for regular users
    if (user && user.form_type === "INDIVIDUAL") {
      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password,
      );

      if (!isPasswordValid) {
        this.setStatus(401);
        return { message: "Password is invalid" };
      }

      // Check if this device already has an active session
      const existingSession = await prisma.userSession.findUnique({
        where: { deviceId: deviceId },
      });

      if (existingSession) {
        await prisma.userSession.update({
          where: { id: existingSession.id },
          data: { isRevoked: true },
        });
      }

      const updateUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          lastActive: new Date(),
        },
        include: {
          progress: {
            include: { user: true },
          },
        },
      });

      let progress = updateUser.progress?.[0];

      if (!progress) {
        progress = await prisma.progress.create({
          data: {
            userId: updateUser.id,
            startedJourney: true,
            progressBar: 0,
          },
          include: { user: true },
        });

        await GrowthService.AchievementMessage({
          message_title: "Christian Cadet",
          message_content: `${progress.user.first_name} you just joined the rest of the soldiers to join the army`,
          point: 10,
          progress_message: "",
          userId: updateUser.id,
          badge: "CADET_BADGE",
          progressId: progress.id,
        });
      }

      const organizationData = await prisma.organization.findFirst({
        where: { userId: user.id },
      });

      const plan = await prisma.pricingHistory.findFirst({
        where: {
          userId: user.id,
        },
      });

      const planId = plan?.id ?? null;

      if (!plan) {
        await PricingService.GenerateNewPaymentForNewUser({
          userId: updateUser.id,
          type: "INDIVIDUAL",
          orgId: organizationData?.id || null,
        });
      }

      // Generate access and refresh tokens
      const { accessToken, refreshToken } = generateTokens({
        type: "USER",
        id: updateUser.id,
        email: updateUser.email_address,
        role: updateUser.role,
        level: updateUser.level,
        progressId: progress.id,
        updateStatus: updateUser.isOnline,
        organizationId: organizationData?.id || null,
        planId,
        deviceId: deviceId,
        deviceType: deviceType,
        full_name: `${updateUser.first_name} ${updateUser.last_name}`,
      });

      // Create or update user session
      await prisma.userSession.upsert({
        where: { deviceId: deviceId },
        update: {
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "USER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          lastActive: new Date(),
          isRevoked: false,
        },
        create: {
          userId: updateUser.id,
          deviceId: deviceId,
          deviceType: deviceType,
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "USER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
        },
      });

      if (req.res) {
        // Set cookies - FIXED
        req.res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });

        req.res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("deviceId", deviceId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("progress_id", progress.id, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("plan_id", planId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      this.setStatus(200);
      return {
        data: {
          message: "Login successful",
          accessToken,  // Return in body as fallback
          refreshToken, // Return in body as fallback
          deviceId,
          user: {
            type: "USER",
            id: updateUser.id,
            first_name: updateUser.first_name,
            last_name: updateUser.last_name,
            role: updateUser.role,
            progressId: progress.id,
            form_type: updateUser.form_type,
          },
        },
      };
    }

    // Check for organization
    const organization = await prisma.organization.findUnique({
      where: {
        organization_email: credentials.email,
      },
      include: {
        user: true,
      },
    });

    if (organization) {
      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        organization.organization_password,
      );

      if (!isPasswordValid) {
        this.setStatus(401);
        return { message: "Password is invalid" };
      }

      // Check if this device already has an active session
      const existingSession = await prisma.userSession.findUnique({
        where: { deviceId: deviceId },
      });

      if (existingSession) {
        await prisma.userSession.update({
          where: { id: existingSession.id },
          data: { isRevoked: true },
        });
      }

      const updatedOrganization = await prisma.organization.update({
        where: {
          organization_email: credentials.email,
        },
        data: {
          isOnline: true,
          lastActive: new Date(),
        },
        include: {
          user: true,
        },
      });

      const plan = await prisma.pricingHistory.findFirst({
        where: {
          userId: updatedOrganization.user.id,
        },
      });

      const planId = plan?.id ?? null;

      if (!plan) {
        await PricingService.GenerateNewPaymentForNewUser({
          userId: null,
          type: "ORGANIZATION",
          orgId: updatedOrganization.id,
        });
      }

      // Generate access and refresh tokens with complete payload
      const { accessToken, refreshToken } = generateTokens({
        type: "ORGANIZATION",
        id: updatedOrganization.user.id,
        email: updatedOrganization.user.email_address,
        role: updatedOrganization.user.role,
        settingsId: settingsId,
        organizationId: updatedOrganization.id,
        organization_name: updatedOrganization.organization_name,
        organization_email: updatedOrganization.organization_email,
        organization_role: updatedOrganization.user.role,
        userId: updatedOrganization.user.id,
        planId: planId,
        deviceId: deviceId,
        level: "ORGANIZATION",
        deviceType: deviceType,
        full_name: `${updatedOrganization.user.first_name} ${updatedOrganization.user.last_name}`,
        progressId: null,
      });

      // Create or update user session
      await prisma.userSession.upsert({
        where: { deviceId: deviceId },
        update: {
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "ORGANIZATION",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
          lastActive: new Date(),
          isRevoked: false,
        },
        create: {
          userId: updatedOrganization.user.id,
          deviceId: deviceId,
          deviceType: deviceType,
          refreshToken: refreshToken,
          accessToken: accessToken,
          userType: "ORGANIZATION",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: userAgent,
          ipAddress: ipAddress,
        },
      });

      if (req.res) {
        // Set cookies - FIXED
        req.res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });

        req.res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("deviceId", deviceId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        req.res.cookie("plan_id", planId, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      this.setStatus(200);
      return {
        data: {
          message: "Login successful",
          accessToken,  // Return in body as fallback
          refreshToken, // Return in body as fallback
          deviceId,
          organization: {
            type: "organization",
            id: updatedOrganization.id,
            organization_name: updatedOrganization.organization_name,
            organization_email: updatedOrganization.organization_email,
            organization_role: updatedOrganization.user.role,
            organization_isOnline: updatedOrganization.isOnline,
          },
        },
      };
    }
    this.setStatus(404);
    return { message: "User or Login not found" };
  } catch (error: any) {
    console.error("Login error:", error);
    this.setStatus(500);
    return {
      message: `An error occurred: ${error.message}`,
    };
  }
}

@Security("bearerAuth")
@Post("/complete-profile")
public async CompleteProfile(
  @Request() req: any,
  @Body()
  body: {
    first_name: string;
    last_name: string;
    password: string
    country: string;
    state: string;
    phone_number: string;
    role: string;
    level: string;
  },
) {
  const userId = req.user?.id;
  
  // Determine environment for cookie settings
  const isProduction = process.env.NODE_ENV === "production";

  if (!userId) {
    this.setStatus(401);
    return {
      success: false,
      message: "Unauthorized - User not found",
    };
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        progress: true,
        settings: true,
        user_plan: true,
      },
    });

    if (!existingUser) {
      this.setStatus(404);
      return {
        success: false,
        message: "User does not exist",
      };
    }

    // Check if profile is already complete
    if (existingUser.isProfileComplete === true) {
      this.setStatus(400);
      return {
        success: false,
        message: "Profile is already complete",
      };
    }

    // Ensure level has a value
    const userLevel = body.level || "1";
    
    const hashPassword = await bcrypt.hash(body.password, 10)

    // Update user information and mark profile as complete
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        first_name: body.first_name,
        last_name: body.last_name,
        country: body.country,
        state: body.state,
        password: hashPassword,
        phone_number: body.phone_number,
        role: body.role,
        level: userLevel,
        isProfileComplete: true,
      },
    });

    // Check if user has settings, if not create them (like signup)
    let settings = existingUser.settings?.[0];
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          enable_push_notification: true,
          course_updates: true,
          event: true,
          achievement: true,
          daily_reminders: true,
          darkMode: false,
          email_notification: true,
          updatedAt: new Date(),
          userId: userId,
          organizationId: null,
        },
      });
      console.log(`Created settings for user ${userId}`);
    }

    // Check if user has progress, if not create it (like signup)
    let progress = existingUser.progress?.[0];
    if (!progress) {
      // Create progress
      progress = await prisma.progress.create({
        data: {
          userId: userId,
          startedJourney: true,
          progressBar: 0,
        },
      });

      // Create achievement message for new user
      await GrowthService.AchievementMessage({
        message_title: "Christian Cadet",
        message_content: `${updatedUser.first_name} you just joined the rest of the soldiers to join the army`,
        point: 10,
        progress_message: "",
        userId: userId,
        badge: "CADET_BADGE",
        progressId: progress.id,
      });

      console.log(`Created progress and achievement for user ${userId}`);
    }

    // Check if user has a plan, if not create one (like signup)
    let plan = existingUser.user_plan?.[0];
    if (!plan) {
      plan = await PricingService.GenerateNewPaymentForNewUser({
        userId: userId,
        type: "INDIVIDUAL",
        orgId: null,
      });
      console.log(`Created plan for user ${userId}`);
    }

    // ✅ CRITICAL FIX: Generate NEW tokens with updated level
    const deviceId = req.cookies?.deviceId || generateDeviceId();
    const userAgent = req.headers["user-agent"] || "unknown";
    const deviceType = getDeviceType(userAgent);
    
    const { accessToken, refreshToken } = generateTokens({
      type: "USER",
      id: updatedUser.id,
      email: updatedUser.email_address,
      role: updatedUser.role,
      level: updatedUser.level,
      progressId: progress?.id,
      updateStatus: updatedUser.isOnline,
      planId: plan?.id,
      settingsId: settings?.id,
      deviceId: deviceId,
      deviceType: deviceType,
      full_name: `${updatedUser.first_name} ${updatedUser.last_name}`,
      user_pic: updatedUser.user_pic,
      isProfileComplete: true,
    });

    // Update the session with new tokens
    await prisma.userSession.updateMany({
      where: { userId: userId },
      data: {
        refreshToken: refreshToken,
        accessToken: accessToken,
        lastActive: new Date(),
      },
    });

    // Send welcome notification
    await NotificationService.createNotification({
      message: `Hello ${updatedUser.first_name}, welcome to GOYE! Your profile is now complete. Get ready to encounter the best JESUS.`,
      title: "Welcome to GOYE",
      type: "greeting",
      role: Role.STUDENT,
      to: Role.STUDENT,
      userId: userId,
    });
    console.log(`Sent welcome notification to user ${userId}`);

    // Update session cookies with new tokens and ids - FIXED
    if (req.res) {
      req.res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
        maxAge: 15 * 60 * 1000,
      });

      req.res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
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
      message: "Profile completed successfully! Welcome to GOYE!",
      accessToken,  // Return new tokens in body as fallback
      refreshToken,
      data: {
        user: {
          id: updatedUser.id,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          email_address: updatedUser.email_address,
          country: updatedUser.country,
          state: updatedUser.state,
          phone_number: updatedUser.phone_number,
          role: updatedUser.role,
          level: updatedUser.level,
          isProfileComplete: updatedUser.isProfileComplete,
        },
        settings: {
          id: settings.id,
          darkMode: settings.darkMode,
          email_notification: settings.email_notification,
        },
        progress: progress
          ? {
              id: progress.id,
              progressBar: progress.progressBar,
              startedJourney: progress.startedJourney,
            }
          : null,
        plan: plan
          ? {
              id: plan.id,
              type: plan.type,
            }
          : null,
      },
    };
  } catch (error: any) {
    console.error("Complete profile error:", error);
    this.setStatus(500);
    return {
      success: false,
      message: `Failed to complete profile: ${error.message}`,
    };
  }
}
  @Post("/sendOtp")
  public async SendOtp(@Body() body: { email: string }): Promise<any> {
    try {
      // ✅ CHANGE 1: Add rate limiting
      const now = Date.now();
      const userRequests = otpRateLimit.get(body.email) || [];
      const recentRequests = userRequests.filter(
        (time) => time > now - 5 * 60 * 1000,
      );

      if (recentRequests.length >= 3) {
        this.setStatus(429);
        return {
          success: false,
          status: 429,
          message: "Too many OTP requests. Please try again in an 5 minutes.",
        };
      }

      recentRequests.push(now);
      otpRateLimit.set(body.email, recentRequests);

      const otp = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 5 * 60 * 1000);

      // ✅ CHANGE 2: Delete old OTPs before creating new one
      await prisma.otp.deleteMany({
        where: { email: body.email },
      });

      const newOtp = await prisma.otp.create({
        data: {
          code: otp,
          email: body.email,
          expiresIn: expires,
        },
      });

      const sessionToken = jwt.sign(
        { email: body.email, otpId: otp },
        process.env.JWT_SECRET || "secret-key",
        { expiresIn: "6min" },
      );

      // ✅ CHANGE 3: Add retry logic for email
      let emailSent = false;
      for (let i = 0; i < 3; i++) {
        try {
          await SendEmail(
            newOtp.email,
            "GOYE VERIFICATION",
            `${newOtp.code}`,
            "otp",
          );
          emailSent = true;
          break;
        } catch (error) {
          console.log(`Email attempt ${i + 1} failed`);
          if (i < 2) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      this.setStatus(200);
      return {
        success: emailSent,
        message: emailSent
          ? "OTP sent successfully"
          : "OTP generated but email failed",
        sessionToken,
        // ✅ CHANGE 4: NEVER return OTP in production - only in development
        ...(process.env.NODE_ENV === "development" && { otp }),
        email: body.email,
      };
    } catch (error: any) {
      console.error("SendOTP error:", error);
      this.setStatus(500);
      return {
        success: false,
        message: `Failed to send OTP: ${error.message}`,
      };
    }
  }

  @Post("/verify-otp")
  public async VerifyOtp(@Body() body: { otp: string; sessionToken: string }) {
    try {
      const { otp, sessionToken } = body;

      // ✅ CHANGE: Better validation
      if (!otp || !sessionToken) {
        this.setStatus(400);
        return {
          success: false,
          message: "OTP and session token are required",
        };
      }

      let decoded: { email: string; otpId: string };
      try {
        decoded = jwt.verify(
          sessionToken,
          process.env.JWT_SECRET || "secret-key",
        ) as any;
      } catch (jwtError) {
        this.setStatus(401);
        return {
          success: false,
          message: "Invalid or expired session token",
        };
      }

      const verifyOtp = await prisma.otp.findFirst({
        where: {
          code: otp,
          email: decoded.email,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!verifyOtp) {
        this.setStatus(400);
        return {
          success: false,
          message: "Invalid OTP code",
        };
      }

      if (verifyOtp.expiresIn < new Date()) {
        // ✅ CHANGE: Delete expired OTP
        await prisma.otp.delete({ where: { id: verifyOtp.id } });

        this.setStatus(400);
        return {
          success: false,
          message: "OTP has expired. Please request a new one.",
        };
      }

      // Delete the used OTP
      await prisma.otp.delete({ where: { id: verifyOtp.id } });

      this.setStatus(200);
      return {
        success: true,
        message: "Email verified successfully",
        email: decoded.email,
      };
    } catch (error: any) {
      console.error("VerifyOTP error:", error);
      this.setStatus(500);
      return {
        success: false,
        message: `Verification failed: ${error.message}`,
      };
    }
  }

  @Security("bearerAuth")
  @Post("/upload-profile-picture")
  public async UploadPicture(
    @Request() req: any,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    const userId = req.user?.id;
    const fileBuffer = Buffer.from(body.file, "base64");

    // 1. Upload to Firebase
    const { url, error } = await MediaService.uploadUserAvatar(
      userId,
      fileBuffer,
      body.fileName,
      body.mimeType,
    );

    if (error) {
      this.setStatus(500);
      return { message: "Upload failed", error };
    }

    try {
      // 2. Try to update user with Prisma
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { user_pic: url },
        select: { first_name: true, user_pic: true },
      });

      this.setStatus(200);
      return {
        message: "Avatar uploaded successfully",
        user: updatedUser,
      };
    } catch (error: any) {
      // 3. If RLS error, use raw SQL fallback
      if (error.message.includes("row-level security")) {
        console.log("RLS detected, using raw SQL fallback");

        try {
          await prisma.$executeRaw`UPDATE "User" SET user_pic = ${url} WHERE id = ${userId}`;

          this.setStatus(200);
          return {
            message: "Avatar uploaded successfully (used fallback)",
            user: { user_pic: url },
          };
        } catch (rawError) {
          this.setStatus(500);
          return {
            message: "Failed to update user profile",
            error: rawError.message,
          };
        }
      }

      // 4. Handle other errors
      this.setStatus(500);
      return { message: "Failed to update user profile", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/get-user-password")
  public async GetPassword(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    const password = req.user?.password;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    this.setStatus(200);
    return {
      message: "Password fetched successfully",
      user,
      password,
    };
  }

  @Security("bearerAuth")
@Put("/update-password")
public async UpdatePassword(
  @Request() req: any,
  @Body() body: { newPassword: string },
): Promise<any> {
  const userId = req.user?.id;
  const orgId = req.org?.id;
  const hashedPassword = await bcrypt.hash(body.newPassword, 10);

  try {
    // First, check if this is an individual user
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { organization: true } // Include related organization if any
    });
    
    if (!user) {
      this.setStatus(404);
      return { message: "User not found" };
    }

    // Check if password is different from old one
    const checkPassword = await bcrypt.compare(body.newPassword, user.password);
    if (checkPassword) {
      this.setStatus(400);
      return { message: "This password must be different from the old one" };
    }

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // If user belongs to an organization, also update organization password
    if (orgId) {
      const organization = await prisma.organization.findUnique({
        where: { id: orgId },
      });

      if (organization) {
        const checkOrgPassword = await bcrypt.compare(
          body.newPassword,
          organization.organization_password,
        );
        
        if (!checkOrgPassword) {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              organization_password: hashedPassword,
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    this.setStatus(200);
    return { message: "Password updated successfully" };
    
  } catch (error: any) {
    console.error("Error updating password:", error);
    this.setStatus(500);
    return { 
      message: `An error occurred while updating password: ${error.message}` 
    };
  }
}

  @Get("/get-user/{id}")
  public async GetUser(@Path() id: string): Promise<any> {
    const getUser = await prisma.user.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        user_pic: true,
        first_name: true,
        last_name: true,
        email_address: true,
        role: true,
        isOnline: true,
        lastActive: true,
        country: true,
        state: true,
        phone_number: true,
        level: true,
        createdAt: true,
      },
    });

    if (!getUser) {
      this.setStatus(404);
      return {
        message: "User not found",
      };
    }
    this.setStatus(200);
    return {
      message: `User fetched successfully`,
      getUser,
    };
  }

  //update User
  @Security("bearerAuth")
  @Security("bearerAuth")
  @Put("/update-user")
  public async UpdateUser(
    @Request() req: any,
    @Body()
    data: {
      first_name: string;
      last_name: string;
      country: string;
      state: string;
      phone_number: string;
    },
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(404);
      return {
        message: "User not found",
      };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        country: data.country,
        state: data.state,
        phone_number: data.phone_number,
      },
    });

    this.setStatus(201);
    return {
      message: "User updated successfully",
      data: user,
    };
  }

  //delete user
  @Delete("delete-user/{id}")
  public async DeleteUser(@Path() id: string) {
    const user = await prisma.user.delete({
      where: {
        id,
      },
    });

    this.setStatus(200);
    return {
      message: "User Deleted Succefully",
      user,
    };
  }

  //format time
  private formatLastActive(lastActive: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - lastActive.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }

  //fetch student
  @Security("bearerAuth")
  @Get("/fetch-users-student")
  public async GetStudent(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    const orgId = req.org?.id;

    try {
      const users = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (users) {
        const students = await prisma.user.findMany({
          where: {
            role: "student",
          },
          select: {
            id: true,
            user_pic: true,
            first_name: true,
            last_name: true,
            email_address: true,
            role: true,
            isOnline: true,
            lastActive: true,
            enrollment: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        const enhancedStudents = students.map((student) => ({
          ...student,
          // Calculate if user was active in last 5 minutes
          isCurrentlyOnline:
            student.isOnline &&
            student.lastActive > new Date(Date.now() - 5 * 60 * 1000),
          // Format last active time
          lastActiveFormatted: this.formatLastActive(student.lastActive),
          // Full name for display
          full_name: `${student.first_name} ${student.last_name}`,
        }));

        this.setStatus(200);
        return {
          message: "Student fetched successfully",
          enhancedStudents,
        };
      }

      const organization = await prisma.organization.findUnique({
        where: {
          id: orgId,
        },
      });

      //To fetch Student in an orgniazation
      if (organization) {
        const students = await prisma.organization.findMany({
          where: {
            user: {
              role: "student",
            },
          },
          select: {
            user: {
              select: {
                id: true,
                user_pic: true,
                first_name: true,
                last_name: true,
                email_address: true,
                role: true,
                isOnline: true,
                lastActive: true,
                enrollment: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        const enhancedStudents = students.map((student) => ({
          ...student,
          // Calculate if user was active in last 5 minutes
          isCurrentlyOnline:
            student.user.isOnline &&
            student.user.lastActive > new Date(Date.now() - 5 * 60 * 1000),
          // Format last active time
          lastActiveFormatted: this.formatLastActive(student.user.lastActive),
          // Full name for display
          full_name: `${student.user.first_name} ${student.user.last_name}`,
        }));

        this.setStatus(200);
        return {
          message: "Student fetched successfully",
          enhancedStudents,
        };
      }
    } catch (error) {
      this.setStatus(500);
      console.error(error);
    }
  }

  //fetch tutors
  @Security("bearerAuth")
  @Get("/fetch-users-tutors")
  public async GetTutor(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    const orgId = req.org?.id;

    try {
      const tutor = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (tutor) {
        const tutors = await prisma.user.findMany({
          where: {
            role: "tutor",
          },
          select: {
            id: true,
            user_pic: true,
            first_name: true,
            last_name: true,
            email_address: true,
            role: true,
            isOnline: true,
            lastActive: true,
            enrollment: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        const enhancedStudents = tutors.map((tutors) => ({
          ...tutors,
          // Calculate if user was active in last 5 minutes
          isCurrentlyOnline:
            tutors.isOnline &&
            tutors.lastActive > new Date(Date.now() - 5 * 60 * 1000),
          // Format last active time
          lastActiveFormatted: this.formatLastActive(tutors.lastActive),
          // Full name for display
          full_name: `${tutors.first_name} ${tutors.last_name}`,
        }));

        this.setStatus(200);
        return {
          message: "Tutor fetched successfully",
          enhancedStudents,
        };
      }

      const organization = await prisma.organization.findUnique({
        where: {
          id: orgId,
        },
      });

      //To fetch Student in an orgniazation
      if (organization) {
        const tutors = await prisma.organization.findMany({
          where: {
            user: {
              role: "tutor",
            },
          },
          select: {
            user: {
              select: {
                id: true,
                user_pic: true,
                first_name: true,
                last_name: true,
                email_address: true,
                role: true,
                isOnline: true,
                lastActive: true,
                enrollment: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        const enhancedStudents = tutors.map((tutors) => ({
          ...tutors,
          // Calculate if user was active in last 5 minutes
          isCurrentlyOnline:
            tutors.user.isOnline &&
            tutors.user.lastActive > new Date(Date.now() - 5 * 60 * 1000),
          // Format last active time
          lastActiveFormatted: this.formatLastActive(tutors.user.lastActive),
          // Full name for display
          full_name: `${tutors.user.first_name} ${tutors.user.last_name}`,
        }));

        this.setStatus(200);
        return {
          message: "Tutor fetched successfully",
          enhancedStudents,
        };
      }
    } catch (error) {
      this.setStatus(500);
      console.error(error);
    }
  }

  @Security("bearerAuth")
  @Get("/profile")
  public async GetProfile(@Request() req: any) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const userLevel = req.user?.level
      const progressId = req.progressId

      // Check if user exists
      if (!userId) {
        this.setStatus(401);
        return { message: "Unauthorized", status: 401 };
      }

      // Handle instructor role
      if (userRole === "instructor") {
        const user = await prisma.user.findUnique({
          where: { id: userId, role: userRole },
        });

        if (!user) {
          this.setStatus(404);
          return { message: "Instructor not found", status: 404 };
        }

        this.setStatus(200);
        return {
          message: "Profile fetched successfully",
          user,
        };
      }

      // Handle student or member role
      if (userRole === "student" || userRole === "Member") {
        const user = await prisma.user.findUnique({
          where: {
            id: userId,
            role: userRole,
          },
          include: {
            progress: {
              include: {
                achivement: true,
                badges_and_levels: true,
                badges: true,
              },
            },
          },
        });

        if (!user) {
          this.setStatus(404);
          return { message: "Student not found", status: 404 };
        }

        this.setStatus(200);
        return {
          message: "Profile fetched successfully",
          user,
          level: userLevel ?? null,
          progressId: progressId
        };
      }

      // Handle invalid role
      this.setStatus(400);
      return {
        message: "Invalid user role",
        status: 400,
        role: userRole,
      };
    } catch (error) {
      console.error("Error fetching profile:", error);
      this.setStatus(500);
      return {
        message: "Internal server error",
        status: 500,
        error: error.message,
      };
    }
  }

  @Post("/forgot-password")
  public async ForgotPassword(
    @Body() body: { email: string; link: string },
  ): Promise<any> {
    const checkEmail = await prisma.user.findUnique({
      where: { email_address: body.email },
    });

    if (!checkEmail) {
      this.setStatus(401);
      return {
        message: "User does not exist",
      };
    }

    await SendEmail(
      checkEmail.email_address,
      "Forgot Password Link",
      body.link,
      "reset-password",
    );
    this.setStatus(200);
    return {
      message: "Link sent successfully",
    };
  }

  @Security("bearerAuth")
  @Post("/check-password")
  public async CheckPassword(
    @Body() body: { password: string },
    @Request() req: any,
  ) {
    const userEmail = req.user?.email;
    const orgEmail = req.org?.organization_email;

    try {
      const user = await prisma.user.findUnique({
        where: {
          email_address: userEmail,
        },
      });

      if (user) {
        const checkPassword = await bcrypt.compare(
          body.password,
          user.password,
        );
        if (!checkPassword) {
          this.setStatus(400);
          return {
            status: 400,
            message: "Password is invalid",
          };
        }

        this.setStatus(200);
        return {
          message: "Password is correct",
          status: 200,
        };
      }

      const organization = await prisma.organization.findUnique({
        where: {
          organization_email: orgEmail,
        },
      });

      if (organization) {
        const checkPassword = await bcrypt.compare(
          body.password,
          organization.organization_password,
        );
        if (!checkPassword) {
          this.setStatus(400);
          return {
            message: "Password is invalid",
          };
        }

        this.setStatus(200);
        return {
          message: "Password is valid",
          status: 200,
        };
      }

      return {
        message: "An error occured",
      };
    } catch (error: any) {
      console.error(error.message);
    }
  }

  @Get("/user-student-status")
  public async GetUserStatus(): Promise<any> {
    const totalStudents = await prisma.user.count({
      where: {
        role: "student",
      },
    });

    const onlineStudents = await prisma.user.count({
      where: {
        role: "student",
        isOnline: true,
      },
    });

    const newStudentsToday = await prisma.user.count({
      where: {
        role: "student",
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });
    return {
      message: "User statistics fetched successfully",
      stats: {
        totalStudents,
        onlineStudents,
        newStudentsToday,
        offlineStudents: totalStudents - onlineStudents,
      },
    };
  }

  // Global admin dashboard statistics
  @Security("bearerAuth")
  @Get("/admin-dashboard-stats")
  public async GetAdminDashboardStats(@Request() req: any): Promise<any> {
    const userRole = req.user?.role;

    // Only allow platform admins to access this endpoint
    if (userRole !== "admin" && userRole !== "ADMIN") {
      this.setStatus(403);
      return {
        message: "Only admins can access dashboard statistics",
      };
    }

    // Basic user stats
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { isOnline: true },
    });
    const newUsersToday = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    // Organizations and courses
    const totalOrganizations = await prisma.organization.count();
    const totalCourses = await prisma.course.count();

    // Enrollment / completion stats
    const totalEnrollments = await prisma.enrollment.count();
    const completedEnrollments = await prisma.enrollment.count({
      where: { status: "COMPLETED" },
    });

    const avgCompletionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;

    // Engagement: percentage of users who enrolled in at least one course
    const engagedUsers = await prisma.enrollment.groupBy({
      by: ["userId"],
      _count: { userId: true },
    });

    const engagedUserCount = engagedUsers.length;
    const engagementRate =
      totalUsers > 0 ? Math.round((engagedUserCount / totalUsers) * 100) : 0;

    this.setStatus(200);
    return {
      message: "Admin dashboard statistics fetched successfully",
      stats: {
        totalUsers,
        activeUsers,
        newUsersToday,
        totalOrganizations,
        totalCourses,
        totalEnrollments,
        completedEnrollments,
        avgCompletionRate,
        engagementRate,
      },
    };
  }

  @Security("bearerAuth")
  @Get("/settings")
  public async GetSettings(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    const orgId = req.org?.id;

    if (!userId && !orgId) {
      this.setStatus(401);
      return { message: "Unauthorized" };
    }

    const settings = await prisma.settings.findFirst({
      where: orgId ? { organizationId: orgId } : { userId },
      select: {
        id: true,
        darkMode: true,
        enable_push_notification: true,
        course_updates: true,
        event: true,
        achievement: true,
        daily_reminders: true,
        group_activity: true,
        email_notification: true,
        userId: true,
        organizationId: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    this.setStatus(200);
    return { message: "Settings fetched successfully", settings };
  }

  @Security("bearerAuth")
  @Put("/settings/dark-mode")
  public async UpdateDarkMode(
    @Request() req: any,
    @Body() body: { darkMode: boolean },
  ): Promise<any> {
    const userId = req.user?.id;
    const orgId = req.org?.id;

    if (!userId && !orgId) {
      this.setStatus(401);
      return { message: "Unauthorized" };
    }

    const existing = await prisma.settings.findFirst({
      where: orgId ? { organizationId: orgId } : { userId },
      select: { id: true },
    });

    const updated = existing
      ? await prisma.settings.update({
          where: { id: existing.id },
          data: { darkMode: !!body.darkMode, updatedAt: new Date() },
          select: { id: true, darkMode: true },
        })
      : await prisma.settings.create({
          data: {
            enable_push_notification: true,
            course_updates: true,
            event: true,
            achievement: true,
            daily_reminders: false,
            group_activity: true,
            email_notification: true,
            darkMode: !!body.darkMode,
            updatedAt: new Date(),
            userId: orgId ? null : userId,
            organizationId: orgId || null,
          },
          select: { id: true, darkMode: true },
        });

    this.setStatus(200);
    return { message: "Dark mode updated successfully", settings: updated };
  }

  @Security("bearerAuth")
  @Post("/logout")
  public async Logout(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    const deviceId = req.deviceId;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authenticated" };
    }

    // Clean up session for this specific device

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: false,
        lastActive: new Date(),
      },
    });

    // Clear the cookie
    if (req.res) {
      req.res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      });

      // Set cache control headers to prevent caching
      req.res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      req.res.setHeader("Pragma", "no-cache");
      req.res.setHeader("Expires", "0");
    }

    this.setStatus(200);
    return {
      message: "Logout successful",
      clearTokens: true,
    };
  }

  @Get("/debug-progress")
  @Security("bearerAuth")
  public async DebugProgress(@Request() req: any) {
    return {
      message: "Progress debug info",
      fromRequest: req.progressId,
      fromUser: req.user?.id,
      fromToken: req.user ? "User attached" : "No user",
      cookies: req.cookies,
    };
  }

  // UserController.ts - add this endpoint
@Security("bearerAuth")
@Get("/socket-token")
public async GetSocketToken(@Request() req: any): Promise<any> {
  const userId = req.user?.id;

  if (!userId) {
    this.setStatus(401);
    return { message: "Unauthorized" };
  }

  // Sign with ACCESS_SECRET so socket can verify it
  const socketToken = jwt.sign(
    { id: userId },
    process.env.ACCESS_SECRET!,
    { expiresIn: "1h" }
  );

  this.setStatus(200);
  return { token: socketToken };
}
}
