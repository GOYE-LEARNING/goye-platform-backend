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
  Query,
  Patch,
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
  refreshTokens,
} from "../utils/jwtHelper";
import { firebaseAuthService } from "../services/firebaseService";
import { otpRateLimit } from "../utils/otp";
import { WeirdService } from "../services/weridService";

const forgotPasswordRateLimit = new Map<string, number[]>();

@Route("user")
@Tags("User control APIs")
export class UserController extends Controller {
  @Post("/auth/google")
  public async GoogleAuth(
    @Body() body: { idToken: string },
    @Request() req: any,
  ): Promise<any> {
    try {
      const userAgent = req.headers["user-agent"] || "unknown";
      const deviceType = getDeviceType(userAgent);
      const deviceId = generateDeviceId();
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "unknown";
      const isProduction = process.env.NODE_ENV === "production";

      const googleUser = await firebaseAuthService.verifyGoogleToken(
        body.idToken,
      );

      if (!googleUser) {
        this.setStatus(401);
        return { success: false, message: "Invalid Google token" };
      }

      const {
        user,
        isExistingUser,
        isProfileComplete,
        message: userStatusMessage,
      } = await firebaseAuthService.findOrCreateGoogleUser(googleUser);

      if (!user) {
        this.setStatus(500);
        return { success: false, message: "Failed to process user" };
      }

      let organization = await prisma.organization.findFirst({
        where: { userId: user.id },
        include: { user: true },
      });

      const updateUser = await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastActive: new Date() },
      });

      // ─── ORGANIZATION OWNER ───────────────────────────────────────────────
      if (organization) {
        const updatedOrganization = await prisma.organization.update({
          where: { id: organization.id },
          data: { isOnline: true, lastActive: new Date() },
          include: { user: true },
        });

        let plan = await prisma.pricingHistory.findFirst({
          where: { userId: updateUser.id },
        });

        if (!plan) {
          plan = await PricingService.GenerateNewPaymentForNewUser({
            userId: null,
            type: "ORGANIZATION",
            orgId: updatedOrganization.id,
          });
        }

        const { accessToken, refreshToken } = generateTokens({
          type: "ORGANIZATION",
          id: updateUser.id,
          email: updateUser.email_address,
          role: updateUser.role,
          userType: updateUser.userType,           // ✅
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

        await prisma.userSession.upsert({
          where: { deviceId: deviceId },
          update: {
            refreshToken,
            accessToken,
            userType: "ORGANIZATION",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent,
            ipAddress,
            lastActive: new Date(),
            isRevoked: false,
          },
          create: {
            userId: updateUser.id,
            deviceId,
            deviceType,
            refreshToken,
            accessToken,
            userType: "ORGANIZATION",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent,
            ipAddress,
            isRevoked: false,
          },
        });

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
            type: "ORGANIZATION",
            userType: updateUser.userType,   // ✅
            id: updatedOrganization.id,
            organization_name: updatedOrganization.organization_name,
            organization_email: updatedOrganization.organization_email,
            organization_role: updateUser.role,
            organization_isOnline: updatedOrganization.isOnline,
          },
        };
      }

      // ─── ADMIN ────────────────────────────────────────────────────────────
      if (user.role === "goye_admin") {
        const adminProfile = await prisma.adminProfile.findUnique({
          where: { userId: user.id },
        });

        let progress = await prisma.progress.findFirst({
          where: { userId: user.id },
        });

        if (!progress) {
          progress = await prisma.progress.create({
            data: { userId: user.id, startedJourney: true, progressBar: 0 },
          });
        }

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

        const { accessToken, refreshToken } = generateTokens({
          type: "ADMIN",
          id: updateUser.id,
          email: updateUser.email_address,
          role: updateUser.role,
          userType: updateUser.userType,   // ✅
          adminRole: adminProfile?.role || "super_admin",
          progressId: progress.id,
          level: updateUser.level,
          provider: "GOOGLE",
          firebase_uid: user.firebase_uid,
          deviceId,
          deviceType,
          full_name: `${updateUser.first_name} ${updateUser.last_name}`,
        });

        await prisma.userSession.upsert({
          where: { deviceId },
          update: {
            refreshToken,
            accessToken,
            userType: "ADMIN",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent,
            ipAddress,
            lastActive: new Date(),
            isRevoked: false,
          },
          create: {
            userId: updateUser.id,
            deviceId,
            deviceType,
            refreshToken,
            accessToken,
            userType: "ADMIN",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent,
            ipAddress,
            isRevoked: false,
          },
        });

        if (req.res) {
          req.res.cookie("accessToken", accessToken, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 15 * 60 * 1000,
          });
          req.res.cookie("refreshToken", refreshToken, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000,
          });
          req.res.cookie("deviceId", deviceId, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 365 * 24 * 60 * 60 * 1000,
          });
          req.res.cookie("progress_id", progress.id, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000,
          });
        }

        this.setStatus(200);
        return {
          success: true,
          message: "Google authentication successful",
          status: { isExistingUser: true, isProfileComplete: true, requiresProfileCompletion: false },
          accessToken,
          refreshToken,
          user: {
            type: "ADMIN",
            userType: updateUser.userType,   // ✅
            id: updateUser.id,
            first_name: updateUser.first_name,
            last_name: updateUser.last_name,
            role: updateUser.role,
            adminRole: adminProfile?.role || "super_admin",
            progressId: progress.id,
          },
        };
      }

      // ─── INVITED MEMBER ───────────────────────────────────────────────────
      // ✅ Use userType instead of form_type === "INVITED"
      if (user.userType === "INVITED_MEMBER") {
        // ✅ Resolve which org this user belongs to via OrganizationMember
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: user.id, isActive: true },
          select: { organizationId: true },
        });

        let progress = await prisma.progress.findFirst({
          where: { userId: user.id },
        });

        if (!progress) {
          progress = await prisma.progress.create({
            data: { userId: user.id, startedJourney: true, progressBar: 0 },
          });
        }

        let plan = await prisma.pricingHistory.findFirst({
          where: { userId: user.id },
        });

        if (!plan) {
          plan = await PricingService.GenerateNewPaymentForNewUser({
            userId: user.id,
            type: "INVITED_INDIVIDUAL",
            orgId: null,
          });
        }

        const { accessToken, refreshToken } = generateTokens({
          type: "INVITED_USER",
          id: updateUser.id,
          email: updateUser.email_address,
          role: updateUser.role,
          userType: updateUser.userType,                    // ✅
          progressId: progress.id,
          level: updateUser.level,
          updateStatus: updateUser.isOnline,
          organizationId: membership?.organizationId || null, // ✅ from membership table
          provider: "GOOGLE",
          firebase_uid: user.firebase_uid,
          deviceId,
          deviceType,
          full_name: `${updateUser.first_name} ${updateUser.last_name}`,
        });

        await prisma.userSession.upsert({
          where: { deviceId },
          update: {
            refreshToken, accessToken, userType: "INVITED_USER",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress, lastActive: new Date(), isRevoked: false,
          },
          create: {
            userId: updateUser.id, deviceId, deviceType,
            refreshToken, accessToken, userType: "INVITED_USER",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress, isRevoked: false,
          },
        });

        if (req.res) {
          req.res.cookie("accessToken", accessToken, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 15 * 60 * 1000,
          });
          req.res.cookie("refreshToken", refreshToken, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000,
          });
          req.res.cookie("deviceId", deviceId, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 365 * 24 * 60 * 60 * 1000,
          });
          req.res.cookie("progress_id", progress.id, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000,
          });
        }

        this.setStatus(200);
        return {
          success: true,
          message: "Google authentication successful",
          status: { isExistingUser: true, isProfileComplete: true, requiresProfileCompletion: false },
          accessToken,
          refreshToken,
          user: {
            type: "INVITED_USER",
            userType: updateUser.userType,               // ✅
            id: updateUser.id,
            first_name: updateUser.first_name,
            last_name: updateUser.last_name,
            role: updateUser.role,
            progressId: progress.id,
            organizationId: membership?.organizationId || null, // ✅
          },
        };
      }

      // ─── INDIVIDUAL ───────────────────────────────────────────────────────
      if (user.userType === "INDIVIDUAL" || user.form_type === "INDIVIDUAL") {
        let progress = await prisma.progress.findFirst({
          where: { userId: user.id },
        });

        if (!progress) {
          progress = await prisma.progress.create({
            data: { userId: user.id, startedJourney: true, progressBar: 0 },
          });
        }

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

        const { accessToken, refreshToken } = generateTokens({
          type: "USER",
          id: updateUser.id,
          email: updateUser.email_address,
          role: updateUser.role,
          userType: updateUser.userType,   // ✅
          level: updateUser.level,
          progressId: progress.id,
          updateStatus: updateUser.isOnline,
          planId: plan.id,
          settingsId: settings.id,
          provider: "GOOGLE",
          firebase_uid: user.firebase_uid,
          deviceId,
          deviceType,
          full_name: `${updateUser.first_name} ${updateUser.last_name}`,
          user_pic: user.user_pic,
          isProfileComplete,
        });

        await prisma.userSession.upsert({
          where: { deviceId },
          update: {
            refreshToken, accessToken, userType: "USER",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress, lastActive: new Date(), isRevoked: false,
          },
          create: {
            userId: updateUser.id, deviceId, deviceType,
            refreshToken, accessToken, userType: "USER",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress, isRevoked: false,
          },
        });

        if (req.res) {
          req.res.cookie("accessToken", accessToken, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 15 * 60 * 1000,
          });
          req.res.cookie("refreshToken", refreshToken, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000,
          });
          req.res.cookie("deviceId", deviceId, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 365 * 24 * 60 * 60 * 1000,
          });
          req.res.cookie("progress_id", progress.id, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000,
          });
          req.res.cookie("plan_id", plan.id, {
            httpOnly: true, secure: isProduction,
            sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000,
          });
        }

        let responseMessage = "";
        if (!isExistingUser) {
          responseMessage = "New user created. Please complete your profile.";
        } else if (isExistingUser && !isProfileComplete) {
          responseMessage = "Welcome back! Please complete your profile to continue.";
        } else {
          responseMessage = "Welcome back! Your profile is complete.";
        }

        this.setStatus(200);
        return {
          success: true,
          message: responseMessage,
          status: {
            isExistingUser,
            isProfileComplete,
            requiresProfileCompletion: !isProfileComplete,
            userStatusMessage,
          },
          accessToken,
          refreshToken,
          user: {
            type: "USER",
            userType: updateUser.userType,   // ✅
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
            isProfileComplete,
            progressId: progress.id,
            planId: plan.id,
          },
        };
      }

      this.setStatus(404);
      return { success: false, message: "User not found" };
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
    const userAgent = req.headers["user-agent"] || "unknown";
    const deviceType = getDeviceType(userAgent);
    const deviceId = generateDeviceId();
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const isProduction = process.env.NODE_ENV === "production";

    const existingUser = await prisma.user.findUnique({
      where: { email_address: body.email_address },
    });

    if (existingUser) {
      this.setStatus(400);
      return { message: "User with this email already exists" };
    }

    if (body.password === "") {
      this.setStatus(400);
      return { message: "Password must be filled" };
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        ...body,
        password: hashedPassword,
        level: body.level,
        language: body.language,
        languageCode: body.languageCode as any,
        userType: "INDIVIDUAL", // ✅ explicit on signup
      },
    });

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
      data: { isOnline: true, lastActive: new Date() },
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
        user: { select: { first_name: true, last_name: true } },
      },
    });

    const achievementResult = await GrowthService.AchievementMessage({
      message_title: "Christian Cadet",
      message_content: `${startJourney.user.first_name} you just joined the rest of the soldiers to join the army`,
      point: 10,
      progress_message: "",
      userId: updateUser.id,
      badge: "CADET_BADGE",
      progressId: startJourney.id,
    });

    if (achievementResult.error) {
      console.error("Achievement creation failed:", achievementResult.error);
      this.setStatus(200);
      return {
        message: "Journey created successfully, but achievement creation failed",
        data: startJourney,
        achievementError: achievementResult.error,
      };
    }

    const { accessToken, refreshToken } = generateTokens({
      id: updateUser.id,
      email: updateUser.email_address,
      role: updateUser.role,
      language: updateUser.language,
      languageCode: updateUser.languageCode,
      type: updateUser.form_type || "INDIVIDUAL",
      userType: updateUser.userType,   // ✅
      settingsId: createSettings.id,
      full_name: `${updateUser.first_name} ${updateUser.last_name}`,
      progressId: startJourney.id,
      updateStatus: updateUser.isOnline,
      planId: plan.id,
      deviceId,
      deviceType,
      level: updateUser.level,
    });

    await prisma.userSession.create({
      data: {
        userId: updateUser.id,
        deviceId,
        deviceType,
        refreshToken,
        accessToken,
        userType: "USER",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent,
        ipAddress,
        isRevoked: false,
      },
    });

    if (req.res) {
      req.res.cookie("accessToken", accessToken, {
        httpOnly: true, secure: isProduction,
        sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 15 * 60 * 1000,
      });
      req.res.cookie("refreshToken", refreshToken, {
        httpOnly: true, secure: isProduction,
        sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      req.res.cookie("deviceId", deviceId, {
        httpOnly: true, secure: isProduction,
        sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 365 * 24 * 60 * 60 * 1000,
      });
      req.res.cookie("progress_id", startJourney.id, {
        httpOnly: true, secure: isProduction,
        sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      req.res.cookie("plan_id", plan.id, {
        httpOnly: true, secure: isProduction,
        sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    this.setStatus(201);
    return {
      message: "Signup successful",
      accessToken,
      refreshToken,
      deviceId,
      user: {
        id: updateUser.id,
        first_name: updateUser.first_name,
        last_name: updateUser.last_name,
        email_address: updateUser.email_address,
        userType: updateUser.userType, // ✅
        planId: plan.id,
        progressId: startJourney.id,
      },
    };
  }

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
    const isProduction = process.env.NODE_ENV === "production";

    try {
      const userAgent = req.headers["user-agent"] || "unknown";
      const deviceType = credentials.deviceType || getDeviceType(userAgent);
      const deviceId = credentials.deviceId || generateDeviceId();
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "unknown";

      const user = await prisma.user.findUnique({
        where: { email_address: credentials.email },
        include: { adminProfile: true },
      });

      // ─── ADMIN ──────────────────────────────────────────────────────────
      if (user && user.role === "goye_admin") {
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          this.setStatus(401);
          return { message: "Password is invalid" };
        }

        const existingSession = await prisma.userSession.findUnique({
          where: { deviceId },
        });

        if (existingSession) {
          await prisma.userSession.update({
            where: { id: existingSession.id },
            data: { isRevoked: true },
          });
        }

        const updateUser = await prisma.user.update({
          where: { id: user.id },
          data: { isOnline: true, lastActive: new Date() },
          include: { user_plan: { select: { id: true } } },
        });

        let progress = await prisma.progress.findFirst({
          where: { userId: user.id },
        });

        if (!progress) {
          progress = await prisma.progress.create({
            data: { userId: user.id, startedJourney: true, progressBar: 0 },
          });
        }

        const plan = await prisma.pricingHistory.findFirst({
          where: { userId: user.id },
        });

        const planId = plan?.id ?? null;

        if (!plan) {
          await PricingService.GenerateNewPaymentForNewUser({
            userId: updateUser.id,
            type: "INDIVIDUAL",
            orgId: null,
          });
        }

        const { accessToken, refreshToken } = generateTokens({
          type: "ADMIN",
          id: updateUser.id,
          email: updateUser.email_address,
          role: updateUser.role,
          userType: updateUser.userType,   // ✅
          language: updateUser.language,
          languageCode: updateUser.languageCode,
          adminRole: user.adminProfile?.role || "super_admin",
          progressId: progress.id,
          level: updateUser.level,
          planId,
          deviceId,
          deviceType,
          full_name: `${updateUser.first_name} ${updateUser.last_name}`,
        });

        await prisma.userSession.upsert({
          where: { deviceId },
          update: {
            refreshToken, accessToken, userType: "ADMIN",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress, lastActive: new Date(), isRevoked: false,
          },
          create: {
            userId: updateUser.id, deviceId, deviceType,
            refreshToken, accessToken, userType: "ADMIN",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress,
          },
        });

        if (req.res) {
          req.res.cookie("accessToken", accessToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 15 * 60 * 1000 });
          req.res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
          req.res.cookie("deviceId", deviceId, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 365 * 24 * 60 * 60 * 1000 });
          req.res.cookie("progress_id", progress.id, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
          req.res.cookie("plan_id", planId, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
        }

        this.setStatus(200);
        return {
          data: {
            message: "Login successful",
            accessToken,
            refreshToken,
            deviceId,
            user: {
              type: "ADMIN",
              userType: updateUser.userType,   // ✅
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

      // ─── INVITED MEMBER ─────────────────────────────────────────────────
      // ✅ Use userType instead of form_type === "INVITED"
      if (user && user.userType === "INVITED_MEMBER") {
        // ✅ Resolve org from OrganizationMember — no more InviteUser lookup
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: user.id, isActive: true },
          select: { organizationId: true },
        });

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          this.setStatus(401);
          return { message: "Password is invalid" };
        }

        const existingSession = await prisma.userSession.findUnique({
          where: { deviceId },
        });

        if (existingSession) {
          await prisma.userSession.update({
            where: { id: existingSession.id },
            data: { isRevoked: true },
          });
        }

        const updateUser = await prisma.user.update({
          where: { id: user.id },
          data: { isOnline: true, lastActive: new Date() },
          include: { progress: { include: { user: true } } },
        });

        let progress = updateUser.progress?.[0];

        if (!progress) {
          progress = await prisma.progress.create({
            data: { userId: updateUser.id, startedJourney: true, progressBar: 0 },
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
          where: { userId: user.id },
        });

        const planId = plan?.id ?? null;

        if (!plan) {
          await PricingService.GenerateNewPaymentForNewUser({
            userId: updateUser.id,
            type: "INVITED_INDIVIDUAL",
            orgId: null,
          });
        }

        const { accessToken, refreshToken } = generateTokens({
          type: "INVITED_USER",
          id: updateUser.id,
          email: updateUser.email_address,
          role: updateUser.role,
          userType: updateUser.userType,                    // ✅
          progressId: progress.id,
          level: updateUser.level,
          language: updateUser.language,
          languageCode: updateUser.languageCode,
          updateStatus: updateUser.isOnline,
          organizationId: membership?.organizationId || null, // ✅ from membership table
          planId,
          deviceId,
          deviceType,
          full_name: `${updateUser.first_name} ${updateUser.last_name}`,
        });

        await prisma.userSession.upsert({
          where: { deviceId },
          update: {
            refreshToken, accessToken, userType: "INVITED_USER",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress, lastActive: new Date(), isRevoked: false,
          },
          create: {
            userId: updateUser.id, deviceId, deviceType,
            refreshToken, accessToken, userType: "INVITED_USER",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress,
          },
        });

        if (req.res) {
          req.res.cookie("accessToken", accessToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 15 * 60 * 1000 });
          req.res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
          req.res.cookie("deviceId", deviceId, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 365 * 24 * 60 * 60 * 1000 });
          req.res.cookie("progress_id", progress.id, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
          req.res.cookie("plan_id", planId, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
        }

        this.setStatus(200);
        return {
          data: {
            message: "Login successful",
            accessToken,
            refreshToken,
            deviceId,
            user: {
              type: "INVITED_USER",
              userType: updateUser.userType,                   // ✅
              id: updateUser.id,
              first_name: updateUser.first_name,
              last_name: updateUser.last_name,
              role: updateUser.role,
              progressId: progress.id,
              organizationId: membership?.organizationId || null, // ✅
            },
          },
        };
      }

      // ─── INDIVIDUAL USER ─────────────────────────────────────────────────
      if (user && (user.userType === "INDIVIDUAL" || user.form_type === "INDIVIDUAL")) {
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          this.setStatus(401);
          return { message: "Password is invalid" };
        }

        const existingSession = await prisma.userSession.findUnique({
          where: { deviceId },
        });

        if (existingSession) {
          await prisma.userSession.update({
            where: { id: existingSession.id },
            data: { isRevoked: true },
          });
        }

        const updateUser = await prisma.user.update({
          where: { id: user.id },
          data: { isOnline: true, lastActive: new Date() },
          include: { progress: { include: { user: true } } },
        });

        let progress = updateUser.progress?.[0];

        if (!progress) {
          progress = await prisma.progress.create({
            data: { userId: updateUser.id, startedJourney: true, progressBar: 0 },
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
          where: { userId: user.id },
        });

        const planId = plan?.id ?? null;

        if (!plan) {
          await PricingService.GenerateNewPaymentForNewUser({
            userId: updateUser.id,
            type: "INDIVIDUAL",
            orgId: organizationData?.id || null,
          });
        }

        const { accessToken, refreshToken } = generateTokens({
          type: "USER",
          id: updateUser.id,
          email: updateUser.email_address,
          role: updateUser.role,
          userType: updateUser.userType,   // ✅
          language: updateUser.language,
          languageCode: updateUser.languageCode,
          level: updateUser.level,
          progressId: progress.id,
          updateStatus: updateUser.isOnline,
          organizationId: organizationData?.id || null,
          planId,
          deviceId,
          deviceType,
          full_name: `${updateUser.first_name} ${updateUser.last_name}`,
        });

        await prisma.userSession.upsert({
          where: { deviceId },
          update: {
            refreshToken, accessToken, userType: "USER",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress, lastActive: new Date(), isRevoked: false,
          },
          create: {
            userId: updateUser.id, deviceId, deviceType,
            refreshToken, accessToken, userType: "USER",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress,
          },
        });

        if (req.res) {
          req.res.cookie("accessToken", accessToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 15 * 60 * 1000 });
          req.res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
          req.res.cookie("deviceId", deviceId, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 365 * 24 * 60 * 60 * 1000 });
          req.res.cookie("progress_id", progress.id, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
          req.res.cookie("plan_id", planId, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
        }

        this.setStatus(200);
        return {
          data: {
            message: "Login successful",
            accessToken,
            refreshToken,
            deviceId,
            user: {
              type: "USER",
              userType: updateUser.userType,   // ✅
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

      // ─── ORGANIZATION LOGIN ──────────────────────────────────────────────
      const organization = await prisma.organization.findUnique({
        where: { organization_email: credentials.email },
        include: { user: true },
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

        const existingSession = await prisma.userSession.findUnique({
          where: { deviceId },
        });

        if (existingSession) {
          await prisma.userSession.update({
            where: { id: existingSession.id },
            data: { isRevoked: true },
          });
        }

        const updatedOrganization = await prisma.organization.update({
          where: { organization_email: credentials.email },
          data: { isOnline: true, lastActive: new Date() },
          include: { user: true },
        });

        const plan = await prisma.pricingHistory.findFirst({
          where: { userId: updatedOrganization.user.id },
        });

        const planId = plan?.id ?? null;

        if (!plan) {
          await PricingService.GenerateNewPaymentForNewUser({
            userId: null,
            type: "ORGANIZATION",
            orgId: updatedOrganization.id,
          });
        }

        const { accessToken, refreshToken } = generateTokens({
          type: "ORGANIZATION",
          id: updatedOrganization.user.id,
          email: updatedOrganization.user.email_address,
          role: updatedOrganization.user.role,
          userType: updatedOrganization.user.userType,   // ✅
          settingsId,
          language: updatedOrganization.language,
          languageCode: updatedOrganization.languageCode,
          organizationId: updatedOrganization.id,
          organization_name: updatedOrganization.organization_name,
          organization_email: updatedOrganization.organization_email,
          organization_role: updatedOrganization.user.role,
          userId: updatedOrganization.user.id,
          planId,
          deviceId,
          level: "ORGANIZATION",
          deviceType,
          full_name: `${updatedOrganization.user.first_name} ${updatedOrganization.user.last_name}`,
          progressId: null,
        });

        await prisma.userSession.upsert({
          where: { deviceId },
          update: {
            refreshToken, accessToken, userType: "ORGANIZATION",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress, lastActive: new Date(), isRevoked: false,
          },
          create: {
            userId: updatedOrganization.user.id, deviceId, deviceType,
            refreshToken, accessToken, userType: "ORGANIZATION",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent, ipAddress,
          },
        });

        if (req.res) {
          req.res.cookie("accessToken", accessToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 15 * 60 * 1000 });
          req.res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
          req.res.cookie("deviceId", deviceId, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 365 * 24 * 60 * 60 * 1000 });
          req.res.cookie("plan_id", planId, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
        }

        this.setStatus(200);
        return {
          data: {
            message: "Login successful",
            accessToken,
            refreshToken,
            deviceId,
            organization: {
              type: "ORGANIZATION",
              userType: updatedOrganization.user.userType,   // ✅
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
      return { message: `An error occurred: ${error.message}` };
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
      password: string;
      country: string;
      state: string;
      phone_number: string;
      role: string;
      level: string;
    },
  ) {
    const userId = req.user?.id;
    const isProduction = process.env.NODE_ENV === "production";

    if (!userId) {
      this.setStatus(401);
      return { success: false, message: "Unauthorized - User not found" };
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { progress: true, settings: true, user_plan: true },
      });

      if (!existingUser) {
        this.setStatus(404);
        return { success: false, message: "User does not exist" };
      }

      if (existingUser.isProfileComplete === true) {
        this.setStatus(400);
        return { success: false, message: "Profile is already complete" };
      }

      const userLevel = body.level || "1";
      const hashPassword = await bcrypt.hash(body.password, 10);

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
          // ✅ userType stays as INDIVIDUAL — no change needed on profile completion
        },
      });

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
            userId,
            organizationId: null,
          },
        });
      }

      let progress = existingUser.progress?.[0];
      if (!progress) {
        progress = await prisma.progress.create({
          data: { userId, startedJourney: true, progressBar: 0 },
        });

        await GrowthService.AchievementMessage({
          message_title: "Christian Cadet",
          message_content: `${updatedUser.first_name} you just joined the rest of the soldiers to join the army`,
          point: 10,
          progress_message: "",
          userId,
          badge: "CADET_BADGE",
          progressId: progress.id,
        });
      }

      let plan = existingUser.user_plan?.[0];
      if (!plan) {
        plan = await PricingService.GenerateNewPaymentForNewUser({
          userId,
          type: "INDIVIDUAL",
          orgId: null,
        });
      }

      const deviceId = req.cookies?.deviceId || generateDeviceId();
      const userAgent = req.headers["user-agent"] || "unknown";
      const deviceType = getDeviceType(userAgent);

      const { accessToken, refreshToken } = generateTokens({
        type: "USER",
        id: updatedUser.id,
        email: updatedUser.email_address,
        role: updatedUser.role,
        userType: updatedUser.userType,   // ✅
        level: updatedUser.level,
        progressId: progress?.id,
        updateStatus: updatedUser.isOnline,
        planId: plan?.id,
        settingsId: settings?.id,
        deviceId,
        deviceType,
        full_name: `${updatedUser.first_name} ${updatedUser.last_name}`,
        user_pic: updatedUser.user_pic,
        isProfileComplete: true,
      });

      await prisma.userSession.updateMany({
        where: { userId },
        data: { refreshToken, accessToken, lastActive: new Date() },
      });

      await NotificationService.createNotification({
        message: `Hello ${updatedUser.first_name}, welcome to GOYE! Your profile is now complete. Get ready to encounter the best JESUS.`,
        title: "Welcome to GOYE",
        type: "greeting",
        role: Role.STUDENT,
        to: Role.STUDENT,
        userId,
      });

      if (req.res) {
        req.res.cookie("accessToken", accessToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 15 * 60 * 1000 });
        req.res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
        if (progress?.id) {
          req.res.cookie("progress_id", progress.id, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
        }
        if (plan?.id) {
          req.res.cookie("plan_id", plan.id, { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
        }
      }

      this.setStatus(200);
      return {
        success: true,
        message: "Profile completed successfully! Welcome to GOYE!",
        accessToken,
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
            userType: updatedUser.userType,   // ✅
            isProfileComplete: updatedUser.isProfileComplete,
          },
          settings: {
            id: settings.id,
            darkMode: settings.darkMode,
            email_notification: settings.email_notification,
          },
          progress: progress
            ? { id: progress.id, progressBar: progress.progressBar, startedJourney: progress.startedJourney }
            : null,
          plan: plan ? { id: plan.id, type: plan.type } : null,
        },
      };
    } catch (error: any) {
      console.error("Complete profile error:", error);
      this.setStatus(500);
      return { success: false, message: `Failed to complete profile: ${error.message}` };
    }
  }

  @Get("/check-email")
  public async CheckEmail(@Query() email: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { email_address: email },
        select: {
          id: true,
          email_address: true,
          userType: true,       // ✅ replaces checking `organization` relation
          organization: true,
        },
      });

      if (user) {
        return {
          exists: true,
          userId: user.id,
          userType: user.userType,                   // ✅
          isOrganizationOwner: user.userType === "ORGANIZATION_OWNER",
          hasOrganization: !!user.organization?.id,
        };
      }

      return { exists: false };
    } catch (error: any) {
      console.error("Check email error:", error);
      this.setStatus(500);
      return { exists: false, error: error.message };
    }
  }

  @Patch("/update-invitation/{userId}")
  public async UpdateUserInvitation(
    @Path() userId: string,
    @Body() body: { organizationId: string; role: string },
  ): Promise<any> {
    try {
      const { organizationId, role } = body;

      // ✅ Update user to INVITED_MEMBER — no more `invited` boolean
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          userType: "INVITED_MEMBER",  // ✅
          role: role,
          form_type: "INVITED",
        },
      });

      // ✅ Upsert the OrganizationMember record
      await prisma.organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
        update: {
          role,
          isActive: true,
        },
        create: {
          userId,
          organizationId,
          role,
          joinedVia: "INVITE",
          isActive: true,
        },
      });

      // ✅ Create an InviteUser record for audit trail
      await prisma.inviteUser.create({
        data: {
          email: updatedUser.email_address,
          role: role,
          code: crypto.randomBytes(32).toString("hex"),
          organizationId: organizationId,
          sentById: userId,
          invited: true,
          expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return {
        success: true,
        message: "User invitation updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email_address,
          userType: updatedUser.userType,   // ✅
          organizationId,
        },
      };
    } catch (error: any) {
      console.error("Update invitation error:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to update user invitation",
        error: error.message,
      };
    }
  }

  @Post("/sendOtp")
  public async SendOtp(@Body() body: { email: string }): Promise<any> {
    try {
      const { email } = body;

      if (!email) {
        this.setStatus(400);
        return { success: false, message: "Email is required" };
      }

      const user = await prisma.user.findUnique({
        where: { email_address: email },
        select: { id: true, email_address: true },
      });

      const organization = await prisma.organization.findUnique({
        where: { organization_email: email },
        select: { id: true, organization_email: true },
      });

      if (!user && !organization) {
        this.setStatus(404);
        return {
          success: false,
          message: "No account found with this email address. Please sign up first.",
        };
      }

      const now = Date.now();
      const userRequests = otpRateLimit.get(email) || [];
      const recentRequests = userRequests.filter(
        (time: number) => time > now - 5 * 60 * 1000,
      );

      if (recentRequests.length >= 3) {
        this.setStatus(429);
        return {
          success: false,
          status: 429,
          message: "Too many OTP requests. Please try again in 5 minutes.",
        };
      }

      recentRequests.push(now);
      otpRateLimit.set(email, recentRequests);

      const otp = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 5 * 60 * 1000);

      await prisma.otp.deleteMany({ where: { email } });

      const newOtp = await prisma.otp.create({
        data: { code: otp, email, expiresIn: expires },
      });

      const sessionToken = jwt.sign(
        { email, otpId: newOtp.id },
        process.env.JWT_SECRET || "secret-key",
        { expiresIn: "6min" },
      );

      let emailSent = false;
      for (let i = 0; i < 3; i++) {
        try {
          await SendEmail(newOtp.email, "GOYE VERIFICATION", `${newOtp.code}`, "otp");
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
        message: emailSent ? "OTP sent successfully" : "OTP generated but email failed",
        sessionToken,
        email,
        ...(process.env.NODE_ENV === "development" && { otp }),
      };
    } catch (error: any) {
      console.error("SendOTP error:", error);
      this.setStatus(500);
      return { success: false, message: `Failed to send OTP: ${error.message}` };
    }
  }

  @Post("/verify-otp")
  public async VerifyOtp(@Body() body: { otp: string; sessionToken: string }) {
    try {
      const { otp, sessionToken } = body;

      if (!otp || !sessionToken) {
        this.setStatus(400);
        return { success: false, message: "OTP and session token are required" };
      }

      let decoded: { email: string; otpId: string };
      try {
        decoded = jwt.verify(
          sessionToken,
          process.env.JWT_SECRET || "secret-key",
        ) as any;
      } catch (jwtError) {
        this.setStatus(401);
        return { success: false, message: "Invalid or expired session token" };
      }

      const verifyOtp = await prisma.otp.findFirst({
        where: { code: otp, email: decoded.email },
        orderBy: { createdAt: "desc" },
      });

      if (!verifyOtp) {
        this.setStatus(400);
        return { success: false, message: "Invalid OTP code" };
      }

      if (verifyOtp.expiresIn < new Date()) {
        await prisma.otp.delete({ where: { id: verifyOtp.id } });
        this.setStatus(400);
        return { success: false, message: "OTP has expired. Please request a new one." };
      }

      await prisma.otp.delete({ where: { id: verifyOtp.id } });

      this.setStatus(200);
      return { success: true, message: "Email verified successfully", email: decoded.email };
    } catch (error: any) {
      console.error("VerifyOTP error:", error);
      this.setStatus(500);
      return { success: false, message: `Verification failed: ${error.message}` };
    }
  }

  @Security("bearerAuth")
  @Post("/upload-profile-picture")
  public async UploadPicture(
    @Request() req: any,
    @Body() body: { file: string; fileName: string; mimeType: string },
  ): Promise<any> {
    const userId = req.user?.id;
    const fileBuffer = Buffer.from(body.file, "base64");

    const { url, error } = await MediaService.uploadUserAvatar(
      userId, fileBuffer, body.fileName, body.mimeType,
    );

    if (error) {
      this.setStatus(500);
      return { message: "Upload failed", error };
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { user_pic: url },
        select: { first_name: true, user_pic: true },
      });

      this.setStatus(200);
      return { message: "Avatar uploaded successfully", user: updatedUser };
    } catch (error: any) {
      if (error.message.includes("row-level security")) {
        try {
          await prisma.$executeRaw`UPDATE "User" SET user_pic = ${url} WHERE id = ${userId}`;
          this.setStatus(200);
          return { message: "Avatar uploaded successfully (used fallback)", user: { user_pic: url } };
        } catch (rawError) {
          this.setStatus(500);
          return { message: "Failed to update user profile", error: rawError.message };
        }
      }
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
      select: { id: true },
    });

    this.setStatus(200);
    return { message: "Password fetched successfully", user, password };
  }

  @Security("bearerAuth")
  @Put("/update-password")
  public async UpdatePassword(
    @Request() req: any,
    @Body() body: { newPassword: string },
  ): Promise<any> {
    const userId = req.user?.id;
    const organizationId = req.org?.id;
    const isOrganization = req.user?.type === "ORGANIZATION" || req.org?.id;

    if (!body.newPassword) {
      this.setStatus(400);
      return { message: "Current password and new password are required" };
    }

    if (body.newPassword.length < 8) {
      this.setStatus(400);
      return { message: "New password must be at least 8 characters long" };
    }

    try {
      if (isOrganization && organizationId) {
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { id: true, organization_password: true, organization_email: true },
        });

        if (!organization) {
          this.setStatus(404);
          return { message: "Organization not found" };
        }

        const hashedPassword = await bcrypt.hash(body.newPassword, 10);

        const updatedOrganization = await prisma.organization.update({
          where: { id: organizationId },
          data: { organization_password: hashedPassword },
          select: { id: true, organization_email: true },
        });

        const associatedUser = await prisma.user.findFirst({
          where: { organization: { id: organizationId } },
        });

        if (associatedUser) {
          await prisma.user.update({
            where: { id: associatedUser.id },
            data: { password: hashedPassword },
          });
        }

        this.setStatus(200);
        return {
          message: "Organization password updated successfully",
          data: { id: updatedOrganization.id, email: updatedOrganization.organization_email, type: "ORGANIZATION" },
        };
      } else if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email_address: true, password: true, organization: true },
        });

        if (!user) {
          this.setStatus(404);
          return { message: "User not found" };
        }

        const hashedPassword = await bcrypt.hash(body.newPassword, 10);

        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { password: hashedPassword },
          select: { id: true, email_address: true, organization: true },
        });

        if (updatedUser.organization) {
          await prisma.organization.update({
            where: { id: updatedUser.organization.id },
            data: { organization_password: hashedPassword },
          });
        }

        this.setStatus(200);
        return {
          message: "User password updated successfully",
          data: { id: updatedUser.id, email: updatedUser.email_address, type: "USER" },
        };
      } else {
        this.setStatus(401);
        return { message: "Unauthorized - No user or organization ID found" };
      }
    } catch (error: any) {
      console.error("Error updating password:", error);
      this.setStatus(500);
      return { message: "Failed to update password", error: error.message };
    }
  }

  @Get("/get-user/{id}")
  public async GetUser(@Path() id: string): Promise<any> {
    const getUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        user_pic: true,
        first_name: true,
        last_name: true,
        email_address: true,
        role: true,
        userType: true,   // ✅
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
      return { message: "User not found" };
    }

    this.setStatus(200);
    return { message: "User fetched successfully", getUser };
  }

  @Security("bearerAuth")
  @Put("/update-user")
  public async UpdateUser(
    @Request() req: any,
    @Body()
    data: {
      first_name?: string;
      last_name?: string;
      country?: string;
      state?: string;
      phone_number?: string;
      language?: string;
      languageCode?: string;
    },
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(404);
      return { message: "User not found" };
    }

    const updateData: any = {};
    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;
    if (data.language !== undefined) updateData.language = data.language;
    if (data.languageCode !== undefined) updateData.languageCode = data.languageCode;

    if (Object.keys(updateData).length === 0) {
      this.setStatus(400);
      return { message: "No fields provided to update" };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    this.setStatus(200);
    return { message: "User updated successfully", data: user };
  }

  @Delete("delete-user/{id}")
  public async DeleteUser(@Path() id: string) {
    const user = await prisma.user.delete({ where: { id } });
    this.setStatus(200);
    return { message: "User Deleted Successfully", user };
  }

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

  @Security("bearerAuth")
  @Get("/fetch-users-student")
  public async GetStudent(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    const orgId = req.org?.id;

    try {
      const users = await prisma.user.findUnique({ where: { id: userId } });

      if (users) {
        const students = await prisma.user.findMany({
          where: { role: "student" },
          select: {
            id: true, user_pic: true, first_name: true, last_name: true,
            email_address: true, role: true, userType: true, isOnline: true,
            lastActive: true, enrollment: true,
          },
          orderBy: { createdAt: "desc" },
        });

        const enhancedStudents = students.map((student) => ({
          ...student,
          isCurrentlyOnline: student.isOnline && student.lastActive > new Date(Date.now() - 5 * 60 * 1000),
          lastActiveFormatted: this.formatLastActive(student.lastActive),
          full_name: `${student.first_name} ${student.last_name}`,
        }));

        this.setStatus(200);
        return { message: "Student fetched successfully", enhancedStudents };
      }

      const organization = await prisma.organization.findUnique({
        where: { id: orgId },
      });

      if (organization) {
        const students = await prisma.organization.findMany({
          where: { user: { role: "student" } },
          select: {
            user: {
              select: {
                id: true, user_pic: true, first_name: true, last_name: true,
                email_address: true, role: true, userType: true, isOnline: true,
                lastActive: true, enrollment: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const enhancedStudents = students.map((student) => ({
          ...student,
          isCurrentlyOnline: student.user.isOnline && student.user.lastActive > new Date(Date.now() - 5 * 60 * 1000),
          lastActiveFormatted: this.formatLastActive(student.user.lastActive),
          full_name: `${student.user.first_name} ${student.user.last_name}`,
        }));

        this.setStatus(200);
        return { message: "Student fetched successfully", enhancedStudents };
      }
    } catch (error) {
      this.setStatus(500);
      console.error(error);
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-users-tutors")
  public async GetTutor(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    const orgId = req.org?.id;

    try {
      const tutor = await prisma.user.findUnique({ where: { id: userId } });

      if (tutor) {
        const tutors = await prisma.user.findMany({
          where: { role: "tutor" },
          select: {
            id: true, user_pic: true, first_name: true, last_name: true,
            email_address: true, role: true, userType: true, isOnline: true,
            lastActive: true, enrollment: true,
          },
          orderBy: { createdAt: "desc" },
        });

        const enhancedStudents = tutors.map((t) => ({
          ...t,
          isCurrentlyOnline: t.isOnline && t.lastActive > new Date(Date.now() - 5 * 60 * 1000),
          lastActiveFormatted: this.formatLastActive(t.lastActive),
          full_name: `${t.first_name} ${t.last_name}`,
        }));

        this.setStatus(200);
        return { message: "Tutor fetched successfully", enhancedStudents };
      }

      const organization = await prisma.organization.findUnique({
        where: { id: orgId },
      });

      if (organization) {
        const tutors = await prisma.organization.findMany({
          where: { user: { role: "tutor" } },
          select: {
            user: {
              select: {
                id: true, user_pic: true, first_name: true, last_name: true,
                email_address: true, role: true, userType: true, isOnline: true,
                lastActive: true, enrollment: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const enhancedStudents = tutors.map((t) => ({
          ...t,
          isCurrentlyOnline: t.user.isOnline && t.user.lastActive > new Date(Date.now() - 5 * 60 * 1000),
          lastActiveFormatted: this.formatLastActive(t.user.lastActive),
          full_name: `${t.user.first_name} ${t.user.last_name}`,
        }));

        this.setStatus(200);
        return { message: "Tutor fetched successfully", enhancedStudents };
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
      const userLevel = req.user?.level;
      const progressId = req.progressId;

      if (!userId) {
        this.setStatus(401);
        return { message: "Unauthorized", status: 401 };
      }

      if (userRole === "instructor") {
        const user = await prisma.user.findUnique({
          where: { id: userId, role: userRole },
        });

        if (!user) {
          this.setStatus(404);
          return { message: "Instructor not found", status: 404 };
        }

        this.setStatus(200);
        return { message: "Profile fetched successfully", user };
      }

      if (userRole === "student") {
        const user = await prisma.user.findUnique({
          where: { id: userId, role: userRole },
          include: {
            progress: {
              include: { achivement: true, badges_and_levels: true, badges: true },
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
          progressId,
        };
      }

      if (userRole === "Member" || userRole === "member") {
        const user = await prisma.user.findUnique({
          where: { id: userId, role: userRole },
          include: {
            progress: {
              include: { achivement: true, badges_and_levels: true, badges: true },
            },
            organization: {
              select: {
                organization_name: true,
                organization_email: true,
                organization_phone_number: true,
                organization_image: true,
                organization_country: true,
                organization_description: true,
                organization_state: true,
                organization_role: true,
                organization_year: true,
                organization_type: true,
                Church: true,
                school: true,
                Club: true,
              },
            },
            // ✅ Also include their membership record for richer context
            organizationMemberships: {
              where: { isActive: true },
              select: {
                organizationId: true,
                role: true,
                joinedVia: true,
                joinedAt: true,
              },
            },
          },
        });

        if (!user) {
          this.setStatus(404);
          return { message: "Member not found", status: 404 };
        }

        this.setStatus(200);
        return {
          message: "Profile fetched successfully",
          user: {
            first_name: user.first_name,
            last_name: user.last_name,
            email_address: user.email_address,
            phone_number: user.phone_number,
            country: user.country,
            state: user.state,
            level: user.level,
            userType: user.userType,               // ✅
            profile_pic: user.user_pic,
            organization: user.organization,
            memberships: user.organizationMemberships, // ✅
          },
          level: userLevel ?? null,
          progressId,
        };
      }

      this.setStatus(400);
      return { message: "Invalid user role", status: 400, role: userRole };
    } catch (error) {
      console.error("Error fetching profile:", error);
      this.setStatus(500);
      return { message: "Internal server error", status: 500, error: error.message };
    }
  }

  @Post("/forgot-password")
  public async ForgotPassword(
    @Body() body: { email: string; link?: string },
  ): Promise<any> {
    try {
      const { email, link } = body;

      if (!email) {
        this.setStatus(400);
        return { success: false, message: "Email is required" };
      }

      const rateLimitKey = `forgot_password_${email}`;
      const now = Date.now();
      const requests = forgotPasswordRateLimit.get(rateLimitKey) || [];
      const recentRequests = requests.filter(
        (time: number) => time > now - 15 * 60 * 1000,
      );

      if (recentRequests.length >= 3) {
        this.setStatus(429);
        return {
          success: false,
          message: "Too many password reset requests. Please try again in 15 minutes.",
        };
      }

      recentRequests.push(now);
      forgotPasswordRateLimit.set(rateLimitKey, recentRequests);

      let user = null;
      let organization = null;
      let accountType = "";

      user = await prisma.user.findUnique({
        where: { email_address: email },
        select: { id: true, email_address: true, first_name: true, last_name: true, password: true },
      });

      if (user) {
        accountType = "user";
      } else {
        organization = await prisma.organization.findUnique({
          where: { organization_email: email },
          select: { id: true, organization_email: true, organization_name: true, organization_password: true },
        });
        if (organization) accountType = "organization";
      }

      if (!user && !organization) {
        this.setStatus(200);
        return {
          success: true,
          message: "If an account exists with this email, a password reset link has been sent.",
        };
      }

      const resetToken = jwt.sign(
        {
          email,
          type: accountType,
          ...(user && { userId: user.id }),
          ...(organization && { organizationId: organization.id }),
        },
        process.env.BEARERAUTH_SECRET || "secret-key",
        { expiresIn: "1h" },
      );

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken, resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) },
        });
      }

      if (organization) {
        await prisma.organization.update({
          where: { id: organization.id },
          data: { resetToken, resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) },
        });
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetLink = link || `${baseUrl}/auth/reset-password?token=${resetToken}`;

      const accountName = user
        ? `${user.first_name} ${user.last_name}`
        : organization?.organization_name || "Your Account";

      const emailSubject = accountType === "organization"
        ? "Reset Your Organization Password - GOYE Platform"
        : "Reset Your Password - GOYE Platform";

      let emailSent = false;
      for (let i = 0; i < 3; i++) {
        try {
          await SendEmail(email, emailSubject, resetLink, "reset-password", { userName: accountName });
          emailSent = true;
          break;
        } catch (error) {
          console.log(`Email attempt ${i + 1} failed for ${email}`);
          if (i < 2) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!emailSent) {
        this.setStatus(500);
        return { success: false, message: "Failed to send password reset email. Please try again." };
      }

      this.setStatus(200);
      return {
        success: true,
        message: `Password reset link sent to ${accountType === "organization" ? "organization " : ""}email`,
        data: {
          email,
          type: accountType,
          accountName,
          ...(process.env.NODE_ENV === "development" && { resetLink }),
        },
      };
    } catch (error: any) {
      console.error("ForgotPassword error:", error);
      this.setStatus(500);
      return { success: false, message: `Failed to process request: ${error.message}` };
    }
  }

  @Post("/reset-password-no-auth")
  public async ResetPasswordNoAuth(
    @Body() body: { token: string; newPassword: string },
  ): Promise<any> {
    try {
      const { token, newPassword } = body;

      if (!token || !newPassword) {
        this.setStatus(400);
        return { success: false, message: "Token and new password are required" };
      }

      if (newPassword.length < 8) {
        this.setStatus(400);
        return { success: false, message: "Password must be at least 8 characters long" };
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, process.env.BEARERAUTH_SECRET || "secret-key");
      } catch (error: any) {
        if (error.name === "TokenExpiredError") {
          this.setStatus(401);
          return { success: false, message: "Password reset token has expired. Please request a new one." };
        }
        this.setStatus(401);
        return { success: false, message: "Invalid password reset token" };
      }

      const { type, userId, organizationId } = decoded;
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      if (type === "user" && userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email_address: true, resetToken: true, resetTokenExpires: true },
        });

        if (!user) {
          this.setStatus(404);
          return { success: false, message: "User not found" };
        }

        if (user.resetToken !== token) {
          this.setStatus(401);
          return { success: false, message: "Invalid reset token" };
        }

        if (user.resetTokenExpires && new Date() > user.resetTokenExpires) {
          this.setStatus(401);
          return { success: false, message: "Reset token has expired" };
        }

        await prisma.user.update({
          where: { id: userId },
          data: { password: hashedPassword, resetToken: null, resetTokenExpires: null },
        });

        this.setStatus(200);
        return {
          success: true,
          message: "Password reset successfully",
          data: { type: "user", email: user.email_address },
        };
      } else if (type === "organization" && organizationId) {
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { id: true, organization_email: true, resetToken: true, resetTokenExpires: true, userId: true },
        });

        if (!organization) {
          this.setStatus(404);
          return { success: false, message: "Organization not found" };
        }

        if (organization.resetToken !== token) {
          this.setStatus(401);
          return { success: false, message: "Invalid reset token" };
        }

        if (organization.resetTokenExpires && new Date() > organization.resetTokenExpires) {
          this.setStatus(401);
          return { success: false, message: "Reset token has expired" };
        }

        await prisma.organization.update({
          where: { id: organizationId },
          data: { organization_password: hashedPassword, resetToken: null, resetTokenExpires: null },
        });

        if (organization.userId) {
          await prisma.user.update({
            where: { id: organization.userId },
            data: { password: hashedPassword },
          });
        }

        this.setStatus(200);
        return {
          success: true,
          message: "Organization password reset successfully",
          data: { type: "organization", email: organization.organization_email },
        };
      } else {
        this.setStatus(400);
        return { success: false, message: "Invalid token data" };
      }
    } catch (error: any) {
      console.error("ResetPassword error:", error);
      this.setStatus(500);
      return { success: false, message: `Failed to reset password: ${error.message}` };
    }
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
        where: { email_address: userEmail },
      });

      if (user) {
        const checkPassword = await bcrypt.compare(body.password, user.password);
        if (!checkPassword) {
          this.setStatus(400);
          return { status: 400, message: "Password is invalid" };
        }
        this.setStatus(200);
        return { message: "Password is correct", status: 200 };
      }

      const organization = await prisma.organization.findUnique({
        where: { organization_email: orgEmail },
      });

      if (organization) {
        const checkPassword = await bcrypt.compare(
          body.password,
          organization.organization_password,
        );
        if (!checkPassword) {
          this.setStatus(400);
          return { message: "Password is invalid" };
        }
        this.setStatus(200);
        return { message: "Password is valid", status: 200 };
      }

      return { message: "An error occurred" };
    } catch (error: any) {
      console.error(error.message);
    }
  }

  @Get("/user-student-status")
  public async GetUserStatus(): Promise<any> {
    const totalStudents = await prisma.user.count({ where: { role: "student" } });
    const onlineStudents = await prisma.user.count({ where: { role: "student", isOnline: true } });
    const newStudentsToday = await prisma.user.count({
      where: {
        role: "student",
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
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

  @Security("bearerAuth")
  @Get("/admin-dashboard-stats")
  public async GetAdminDashboardStats(@Request() req: any): Promise<any> {
    const userRole = req.user?.role;

    if (userRole !== "admin" && userRole !== "ADMIN") {
      this.setStatus(403);
      return { message: "Only admins can access dashboard statistics" };
    }

    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { isOnline: true } });
    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });

    // ✅ Count by userType — much cleaner than old boolean checks
    const orgOwners = await prisma.user.count({ where: { userType: "ORGANIZATION_OWNER" } });
    const invitedMembers = await prisma.user.count({ where: { userType: "INVITED_MEMBER" } });
    const individualUsers = await prisma.user.count({ where: { userType: "INDIVIDUAL" } });

    const totalOrganizations = await prisma.organization.count();
    const totalCourses = await prisma.course.count();
    const totalEnrollments = await prisma.enrollment.count();
    const completedEnrollments = await prisma.enrollment.count({ where: { status: "COMPLETED" } });

    const avgCompletionRate = totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

    const engagedUsers = await prisma.enrollment.groupBy({
      by: ["userId"],
      _count: { userId: true },
    });

    const engagedUserCount = engagedUsers.length;
    const engagementRate = totalUsers > 0
      ? Math.round((engagedUserCount / totalUsers) * 100)
      : 0;

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
        // ✅ New breakdown by userType
        userTypeBreakdown: {
          orgOwners,
          invitedMembers,
          individualUsers,
        },
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
        id: true, darkMode: true, enable_push_notification: true,
        course_updates: true, event: true, achievement: true,
        daily_reminders: true, group_activity: true, email_notification: true,
        userId: true, organizationId: true, updatedAt: true, createdAt: true,
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

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authenticated" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastActive: new Date() },
    });

    if (req.res) {
      req.res.clearCookie("token", {
        httpOnly: true, secure: true, sameSite: "none", path: "/",
      });
      req.res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      req.res.setHeader("Pragma", "no-cache");
      req.res.setHeader("Expires", "0");
    }

    this.setStatus(200);
    return { message: "Logout successful", clearTokens: true };
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

@Security("bearerAuth")
@Get("/socket-token")
public async GetSocketToken(@Request() req: any): Promise<any> {
  // ✅ Resolve userId from either auth path — individual users carry
  // req.user, org admins/invited members carry req.org
  const userId = req.user?.id ?? req.org?.userId;

  if (!userId) {
    this.setStatus(401);
    return { message: "Unauthorized" };
  }

  // ✅ Resolve organizationId from every possible source, with a DB
  // fallback via OrganizationMember for anyone the token/middleware
  // didn't already resolve it for.
  let organizationId: string | null =
    req.user?.organizationId ?? req.org?.id ?? null;

  let userType: string | undefined = req.user?.userType;

  if (!organizationId || !userType) {
    // Try the User table directly first (covers both individual and
    // invited members, since userType lives on User regardless of path)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true },
    });

    userType = userType ?? user?.userType;

    if (!organizationId) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId, isActive: true },
        select: { organizationId: true },
        orderBy: { joinedAt: "desc" },
      });
      organizationId = membership?.organizationId ?? null;
    }
  }

  const socketToken = jwt.sign(
    {
      id: userId,
      userType: userType,
      organizationId: organizationId, // ✅ the field that was missing
    },
    process.env.ACCESS_SECRET!,
    { expiresIn: "1h" },
  );

  this.setStatus(200);
  return { token: socketToken };
}
  @Post("/refresh")
  public async RefreshToken(@Request() req: any): Promise<any> {
    const refreshToken = req.cookies?.refreshToken;
    const deviceId = req.cookies?.deviceId;

    if (!refreshToken) {
      this.setStatus(401);
      return { message: "No refresh token provided" };
    }

    if (!deviceId) {
      this.setStatus(401);
      return { message: "No device ID provided" };
    }

    try {
      const tokens = await refreshTokens(refreshToken, deviceId);

      if (!tokens) {
        this.setStatus(401);
        return { message: "Failed to refresh token - invalid or expired session" };
      }

      const isProduction = process.env.NODE_ENV === "production";

      req.res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true, secure: isProduction,
        sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 15 * 60 * 1000,
      });

      req.res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true, secure: isProduction,
        sameSite: isProduction ? "none" : "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      this.setStatus(200);
      return { message: "Token refreshed successfully", accessToken: tokens.accessToken };
    } catch (error: any) {
      console.error("Refresh token error:", error);
      this.setStatus(401);
      return { message: "Invalid refresh token" };
    }
  }

  @Security("bearerAuth")
  @Get("fetch-countries")
  public async FetchCountries() {
    const data = await WeirdService.FetchCountries();
    return { data };
  }
}