import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Request,
  Route,
  Security,
  Tags,
} from "tsoa";
import { CourseResponse, OrganizationDTO, User } from "../interface/interfaces";
import prisma from "../db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MediaService } from "../services/mediaServices";
import { SendEmail } from "../utils/sendmail";
import { PricingService } from "../services/pricingService";
import { TranslateText } from "../utils/ai_utils/translator";

enum OrgType {
  CHURCH,
  SCHOOL,
  CLUB,
  OTHER,
}

@Route("organizations")
@Tags("Organization Controllers")
export class OrganizationController extends Controller {
  @Post("/auth/create-organization")
  public async CreateOrganization(
    @Body() body: Omit<OrganizationDTO, "id">,
  ): Promise<any> {
    const orgTypeMap: Record<string, "CHURCH" | "SCHOOL" | "CLUB"> = {
      church: "CHURCH",
      school: "SCHOOL",
      club: "CLUB",
    };

    try {
      if (
        (body.church?.church_email &&
          body.church.church_email === body.user_email_address) ||
        (body.school?.school_email &&
          body.school.school_email === body.user_email_address)
      ) {
        return {
          errorType: "SAME_EMAIL_ISSUE",
          message:
            "Your personal information email address should not be the same as your organization email address.",
        };
      }

      const createOrganization = await prisma.organization.create({
        data: {
          organization_name: body.organization_name,
          organization_email: body.organization_email,
          lastActive: new Date(),
          organization_role: body.organization_role,
          organization_description: body.organization_description,
          organization_country: body.organization_country,
          organization_state: body.organization_state,
          organization_phone_number: body.organization_phone_number,
          organization_year: body.organization_year,
          organization_type: orgTypeMap[body.organization_type],
          language: body.language,
          languageCode: body.languageCode,

          // ✅ USER — mark as ORGANIZATION_OWNER
          user: {
            create: {
              first_name: body.user_first_name,
              last_name: body.user_last_name,
              email_address: body.user_email_address,
              country: body.user_country,
              state: body.user_state,
              phone_number: body.user_phone_number,
              role: "org_admin",
              form_type: "ORGANIZATION",
              level: "ORGANIZATION",
              userType: "ORGANIZATION_OWNER", // ✅ replaces old `invited: false`
            },
          },

          // ✅ CHURCH (only if sent)
          ...(body.church && {
            Church: {
              create: {
                church_min_name: body.church.church_ministry_name,
                church_ld_pastor: body.church.church_lead_pastor,
                church_role: body.church.church_leadership_role,
                church_email: body.church.church_email,
                church_address: body.church.church_address,
                church_logo: body.church.church_logo,
                church_website: body.church.church_website,
                church_weekly_service: body.church.church_weekly_service,
              },
            },
          }),

          // ✅ SCHOOL (only if sent)
          ...(body.school && {
            school: {
              create: {
                school_name: body.school.school_name,
                school_type: body.school.school_type,
                school_address: body.school.school_address,
                school_admin_name: body.school.school_admin_name,
                school_role: body.school.school_role,
                school_accreditation_number:
                  body.school.school_accreditation_number,
                school_document: body.school.school_document,
                school_email: body.school.school_email,
                school_website: body.school.school_website,
              },
            },
          }),

          // ✅ CLUB (only if sent)
          ...(body.club && {
            Club: {
              create: {
                club_name: body.club.club_name,
                club_type: body.club.club_type,
                club_leader_name: body.club.club_leader_name,
                club_description: body.club.club_description,
                club_document: body.club.club_document,
                club_meeting_frequency: body.club.club_meeting_frequency,
                club_parent_org: body.club.club_parent_org,
                club_role: body.club.club_role,
                club_social_link: body.club.club_social_link,
              },
            },
          }),
        },
        include: {
          user: true,
        },
      });

      // ✅ Create OrganizationMember record for the owner
      await prisma.organizationMember.create({
        data: {
          userId: createOrganization.user.id,
          organizationId: createOrganization.id,
          role: "org_admin",
          joinedVia: "CREATED",
          isActive: true,
        },
      });

      // Auto-generate settings for the organization
      await prisma.settings.create({
        data: {
          enable_push_notification: true,
          course_updates: true,
          event: true,
          achievement: true,
          daily_reminders: true,
          darkMode: false,
          email_notification: true,
          updatedAt: new Date(),
          userId: null,
          organizationId: createOrganization.id,
        },
      });

      await PricingService.GenerateNewPaymentForNewUser({
        userId: null,
        orgId: createOrganization.id,
        type: "ORGANIZATION",
      });

      this.setStatus(201);
      return {
        message: "Perfecto organization created successfully.",
        data: createOrganization,
      };
    } catch (error: any) {
      console.error(error);
      this.setStatus(500);
      return {
        message: "Organization creation failed.",
        error: error.message,
      };
    }
  }

  @Post("/auth/org/login")
  public async OrgLogin(
    @Request() req: any,
    @Body() credential: { org_email: string; org_password: string },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: {
          organization_email: credential.org_email,
        },
        include: {
          user: true,
        },
      });

      if (!organization) {
        this.setStatus(404);
        return {
          message: "Organization not found or invalid credentials",
        };
      }

      const unHashedPassword = await bcrypt.compare(
        credential.org_password,
        organization.organization_password,
      );

      if (!unHashedPassword) {
        this.setStatus(400);
        return {
          message: "Password is incorrect",
        };
      }

      const updateOrg = await prisma.organization.update({
        where: {
          id: organization.id,
        },
        data: {
          isOnline: true,
          lastActive: new Date(),
        },
      });

      const token = jwt.sign(
        {
          type: "ORGANIZATION",
          id: organization.user.id,
          userId: organization.user.id,
          organizationId: updateOrg.id,
          org_name: organization.organization_name,
          org_email: organization.organization_email,
          full_name: `${organization.user.first_name} ${organization.user.last_name}`,
          email: organization.user.email_address,
          updatedStatus: updateOrg.isOnline,
          // ✅ Include userType in token for middleware discrimination
          userType: organization.user.userType,
        },
        (process.env.BEARERAUTH_SECRET! as string) || "secret-key",
        { expiresIn: "7d" },
      );

      if (req.res) {
        req.res.cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      this.setStatus(200);
      return {
        message: "Organization login successful",
        token,
        organization: {
          id: organization.id,
          organization_name: organization.organization_name,
          organization_email: organization.organization_email,
          user: {
            id: organization.user.id,
            first_name: organization.user.first_name,
            last_name: organization.user.last_name,
            userType: organization.user.userType, // ✅ expose to client
          },
        },
      };
    } catch (error: any) {
      console.error(error);
      this.setStatus(500);
      return {
        message: "Organization login failed",
        error: error.message,
      };
    }
  }

  @Post("/auth/send-verification-otp/{organizationId}")
  public async SendVerificationOTP(
    @Path() organizationId: string,
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { user: true },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      if (organization.isVerified) {
        this.setStatus(400);
        return { success: false, message: "Organization is already verified" };
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = await bcrypt.hash(otp, 10);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          verificationOTP: hashedOTP,
          verificationOTPExpires: new Date(Date.now() + 10 * 60 * 1000),
          verificationOTPAttempts: 0,
        },
      });

      const { sendOrganizationVerificationOTP } =
        await import("../utils/sendmail.js");

      await sendOrganizationVerificationOTP(
        organization.organization_email,
        otp,
        organization.organization_name,
      );

      this.setStatus(200);
      return {
        success: true,
        message: "Verification OTP sent successfully",
        data: {
          organizationId: organization.id,
          email: organization.organization_email,
          expiresIn: "10 minutes",
        },
      };
    } catch (error: any) {
      console.error("Error sending verification OTP:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to send verification OTP",
        error: error.message,
      };
    }
  }

  @Post("/auth/verify-organization-otp")
  public async VerifyOrganizationOTP(
    @Body() body: { organizationId: string; otp: string },
  ): Promise<any> {
    try {
      const { organizationId, otp } = body;

      if (!organizationId || !otp) {
        this.setStatus(400);
        return {
          success: false,
          message: "Organization ID and OTP are required",
        };
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      if (organization.isVerified) {
        this.setStatus(400);
        return { success: false, message: "Organization is already verified" };
      }

      if (
        !organization.verificationOTP ||
        !organization.verificationOTPExpires
      ) {
        this.setStatus(400);
        return {
          success: false,
          message: "No verification OTP found. Please request a new one.",
        };
      }

      if (new Date() > organization.verificationOTPExpires) {
        this.setStatus(400);
        return {
          success: false,
          message: "Verification OTP has expired. Please request a new one.",
        };
      }

      const attempts = organization.verificationOTPAttempts || 0;
      if (attempts >= 5) {
        this.setStatus(400);
        return {
          success: false,
          message: "Too many failed attempts. Please request a new OTP.",
        };
      }

      const isValid = await bcrypt.compare(otp, organization.verificationOTP);

      if (!isValid) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: { verificationOTPAttempts: attempts + 1 },
        });

        const remainingAttempts = 4 - attempts;
        this.setStatus(400);
        return {
          success: false,
          message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
          data: { remainingAttempts },
        };
      }

      const updatedOrganization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verificationOTP: null,
          verificationOTPExpires: null,
          verificationOTPAttempts: 0,
        },
        include: {
          user: true,
          Church: true,
          school: true,
          Club: true,
        },
      });

      this.setStatus(200);
      return {
        success: true,
        message: "Organization verified successfully",
        data: {
          organizationId: updatedOrganization.id,
          organizationName: updatedOrganization.organization_name,
          isVerified: updatedOrganization.isVerified,
          verifiedAt: updatedOrganization.verifiedAt,
        },
      };
    } catch (error: any) {
      console.error("Error verifying organization:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to verify organization",
        error: error.message,
      };
    }
  }

  @Post("/auth/resend-verification-otp/{organizationId}")
  public async ResendVerificationOTP(
    @Path() organizationId: string,
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      if (organization.isVerified) {
        this.setStatus(400);
        return { success: false, message: "Organization is already verified" };
      }

      const lastResend = organization.verificationOTPResendAt;
      if (lastResend) {
        const timeSinceLastResend = Date.now() - new Date(lastResend).getTime();
        const minutesSinceLastResend = timeSinceLastResend / (1000 * 60);

        if (minutesSinceLastResend < 2) {
          this.setStatus(429);
          return {
            success: false,
            message: `Please wait ${Math.ceil(2 - minutesSinceLastResend)} minutes before requesting another OTP`,
          };
        }
      }

      const resendCount = organization.verificationOTPResendCount || 0;
      if (resendCount >= 3) {
        this.setStatus(429);
        return {
          success: false,
          message: "Maximum resend limit reached. Please try again in 1 hour.",
        };
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = await bcrypt.hash(otp, 10);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          verificationOTP: hashedOTP,
          verificationOTPExpires: new Date(Date.now() + 10 * 60 * 1000),
          verificationOTPAttempts: 0,
          verificationOTPResendCount: resendCount + 1,
          verificationOTPResendAt: new Date(),
        },
      });

      const { sendOrganizationVerificationOTP } =
        await import("../utils/sendmail.js");

      await sendOrganizationVerificationOTP(
        organization.organization_email,
        otp,
        organization.organization_name,
      );

      this.setStatus(200);
      return {
        success: true,
        message: "New verification OTP sent successfully",
        data: {
          organizationId: organization.id,
          email: organization.organization_email,
          expiresIn: "10 minutes",
          remainingResends: 2 - resendCount,
        },
      };
    } catch (error: any) {
      console.error("Error resending verification OTP:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to resend verification OTP",
        error: error.message,
      };
    }
  }

  @Get("/auth/check-verification-status/{organizationId}")
  public async CheckVerificationStatus(
    @Path() organizationId: string,
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          organization_name: true,
          isVerified: true,
          verifiedAt: true,
          verificationOTPExpires: true,
          verificationOTPAttempts: true,
        },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      let status = "NOT_VERIFIED";
      let message = "Organization is not verified yet";

      if (organization.isVerified) {
        status = "VERIFIED";
        message = "Organization is verified";
      } else if (
        organization.verificationOTPExpires &&
        new Date() > organization.verificationOTPExpires
      ) {
        status = "OTP_EXPIRED";
        message = "Verification OTP has expired. Please request a new one.";
      } else if (organization.verificationOTPExpires) {
        status = "OTP_SENT";
        message = "Verification OTP has been sent and is still valid";
      } else {
        status = "NO_OTP";
        message = "No verification OTP found. Please request one.";
      }

      this.setStatus(200);
      return {
        success: true,
        message,
        data: {
          organizationId: organization.id,
          organizationName: organization.organization_name,
          isVerified: organization.isVerified,
          verifiedAt: organization.verifiedAt,
          status,
          otpExpiresAt: organization.verificationOTPExpires,
          attemptsUsed: organization.verificationOTPAttempts || 0,
        },
      };
    } catch (error: any) {
      console.error("Error checking verification status:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Failed to check verification status",
        error: error.message,
      };
    }
  }

  @Get("/fetch-organizations")
  public async FetchOrganization(): Promise<any> {
    try {
      const fetchOrganizationsType = await prisma.organization.findMany({
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email_address: true,
              userType: true, // ✅ include userType
            },
          },
          Church: true,
          school: true,
          Club: true,
          members: {
            // ✅ include membership info
            select: {
              id: true,
              userId: true,
              role: true,
              joinedVia: true,
              joinedAt: true,
              isActive: true,
            },
          },
        },
      });

      return {
        message: "Organization Fetched successfully",
        data: fetchOrganizationsType,
      };
    } catch (error: any) {
      console.error(error);
    }
  }

  @Get("/fetch-specific-organization/{id}")
  public async FetchSpecificOrganization(@Path() id: string) {
    try {
      const fetchSpecificOrganization = await prisma.organization.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email_address: true,
              userType: true, // ✅
            },
          },
          members: {
            select: {
              id: true,
              userId: true,
              role: true,
              joinedVia: true,
              joinedAt: true,
              isActive: true,
            },
          },
        },
      });

      if (!fetchSpecificOrganization) {
        return {
          message: "Sorry this Organization does not exist",
          status: 404,
        };
      }

      return {
        message: "Organization fetched successfully",
        data: fetchSpecificOrganization,
      };
    } catch (error) {
      console.error(error);
    }
  }

  @Post("/upload-organization-profile_picture/{organizationId}")
  public async UploadOrganizationImage(
    @Path() organizationId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "Organization not found" };
      }

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.UploadOrganizationImage(
        organizationId,
        fileBuffer,
        body.fileName,
        body.mimeType,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const updateOrganization = await prisma.organization.update({
        where: { id: organizationId },
        data: { organization_image: url },
      });

      this.setStatus(201);
      return {
        message: "Success uploading image",
        url: updateOrganization.organization_image,
      };
    } catch (error) {
      this.setStatus(500);
      return { message: "Error uploading organization image" };
    }
  }

  @Post("/upload-church-logo/{organizationId}")
  public async UploadChurchLogo(
    @Path() organizationId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "Organization not found" };
      }

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.UploadOrganizationChurchLogo(
        organizationId,
        fileBuffer,
        body.fileName,
        body.mimeType,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const updateOrganizationChurch = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          Church: {
            update: { church_logo: url },
          },
        },
        select: {
          Church: {
            select: { id: true, church_logo: true },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Church image uploaded successfully",
        data: { organizationId: updateOrganizationChurch.Church.id },
        url: updateOrganizationChurch.Church.church_logo,
      };
    } catch (error) {
      console.error(error);
    }
  }

  @Post("/upload-school-logo/{organizationId}")
  public async UploadSchoolLogo(
    @Path() organizationId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "Organization not found" };
      }

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.UploadOrganizationSchoolLogo(
        organizationId,
        fileBuffer,
        body.fileName,
        body.mimeType,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const updateOrganizationSchool = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          school: {
            update: { school_logo: url },
          },
        },
        select: {
          school: {
            select: { id: true, school_logo: true },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "School image uploaded successfully",
        data: { organizationId: updateOrganizationSchool.school.id },
        url: updateOrganizationSchool.school.school_logo,
      };
    } catch (error) {
      console.error(error);
    }
  }

  @Post("/upload-school-document/{organizationId}")
  public async UploadSchoolOrganizationMaterial(
    @Path() organizationId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "organization not found" };
      }

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.uploadSchoolMaterial(
        organizationId,
        fileBuffer,
        body.fileName,
        body.mimeType,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const updateOrganization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          school: {
            update: { school_document: url },
          },
        },
        include: {
          school: {
            select: { id: true, school_document: true },
          },
        },
      });

      this.setStatus(201);
      return {
        message: "organization material uploaded successfully",
        data: updateOrganization,
        url: updateOrganization.school.school_document,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to upload organization material",
        error: error.message,
      };
    }
  }

  @Post("/upload-club-document/{organizationId}")
  public async UploadClubOrganizationMaterial(
    @Path() organizationId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "organization not found" };
      }

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.uploadClubMaterial(
        organizationId,
        fileBuffer,
        body.fileName,
        body.mimeType,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const updateOrganization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          Club: {
            update: { club_document: url },
          },
        },
        include: {
          Club: {
            select: { id: true, club_document: true },
          },
        },
      });

      this.setStatus(201);
      return {
        message: "organization material uploaded successfully",
        data: updateOrganization,
        url: updateOrganization.Club.club_document,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to upload organization material",
        error: error.message,
      };
    }
  }

  @Put("/update-organization/{id}")
  public async UpdateOrganization(
    @Path() id: string,
    @Body() body: Omit<OrganizationDTO, "id">,
  ) {
    try {
      const findOrganization = await prisma.organization.findUnique({
        where: { id },
        include: {
          Church: true,
          school: true,
          Club: true,
          user: true,
        },
      });

      if (!findOrganization) {
        this.setStatus(404);
        return { message: "This organization does not exist." };
      }

      const updateOrganization = await prisma.organization.update({
        where: { id },
        data: {
          organization_name: body.organization_name,
          organization_description: body.organization_description,
          organization_country: body.organization_country,
          organization_state: body.organization_state,
          organization_phone_number: body.organization_phone_number,
          organization_year: body.organization_year,
          organization_type: body.organization_type as any,
          language: body.language,
          languageCode: body.languageCode,

          Church: body.church
            ? {
                update: {
                  church_min_name: body.church.church_ministry_name,
                  church_ld_pastor: body.church.church_lead_pastor,
                  church_address: body.church.church_address,
                  church_weekly_service: body.church.church_weekly_service,
                  church_website: body.church.church_website,
                  church_logo: body.church.church_logo,
                },
              }
            : undefined,

          school: body.school
            ? {
                update: {
                  school_name: body.school.school_name,
                  school_type: body.school.school_type,
                  school_address: body.school.school_address,
                  school_admin_name: body.school.school_admin_name,
                  school_role: body.school.school_role,
                  school_website: body.school.school_website,
                  school_accreditation_number:
                    body.school.school_accreditation_number,
                  school_document: body.school.school_document,
                },
              }
            : undefined,

          Club: body.club
            ? {
                update: {
                  club_name: body.club.club_name,
                  club_type: body.club.club_type,
                  club_leader_name: body.club.club_leader_name,
                  club_meeting_frequency: body.club.club_meeting_frequency,
                  club_social_link: body.club.club_social_link,
                  club_parent_org: body.club.club_parent_org,
                  club_description: body.club.club_description,
                  club_document: body.club.club_document,
                  club_role: body.club.club_role,
                },
              }
            : undefined,

          user: {
            update: {
              first_name: body.user_first_name,
              last_name: body.user_last_name,
              email_address: body.user_email_address,
              country: body.user_country,
              state: body.user_state,
              phone_number: body.user_phone_number,
              role: body.user_role,
              form_type: body.user_form_type as any,
              // ✅ preserve userType — never overwrite it during a plain update
            },
          },
        },
        include: {
          Church: true,
          school: true,
          Club: true,
          user: true,
        },
      });

      return {
        message: "Organization updated successfully",
        data: updateOrganization,
      };
    } catch (error: any) {
      console.error("Error updating organization:", error.message);
      this.setStatus(500);
      return {
        message: "Failed to update organization",
        error: error.message,
      };
    }
  }

  @Post("/organization-password-generated/{organizationId}")
  public async OrganizationPasswordGenerator(@Path() organizationId: string) {
    const generatedPassword = crypto
      .randomBytes(9)
      .toString("base64")
      .slice(0, 12);

    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "Organization not found" };
      }

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          user: {
            update: { password: hashedPassword as any },
          },
          organization_password: hashedPassword,
        },
      });

      this.setStatus(200);
      return {
        message: "password done successfully",
        generatedPassword: generatedPassword,
      };
    } catch (error) {
      console.error(error);
    }
  }

  @Security("bearerAuth")
  @Get("/profile")
  public async GetProfile(@Request() req: any) {
    const organizationId = req.org?.id;

    if (!organizationId) {
      this.setStatus(401);
      return { message: "Unauthorized", status: 401 };
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email_address: true,
            userType: true, // ✅
          },
        },
        Church: true,
        school: true,
        Club: true,
        members: {
          // ✅ return membership list
          select: {
            id: true,
            userId: true,
            role: true,
            joinedVia: true,
            joinedAt: true,
            isActive: true,
          },
        },
      },
    });

    this.setStatus(200);
    return {
      message: "Profile fetched successfully",
      organization,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INVITE USER SIGNUP
  // When an invited user clicks the link and creates their account.
  // ─────────────────────────────────────────────────────────────────────────
  @Post("/invite-user/signup/{organizationId}")
  public async CreateUser(
    @Path() organizationId: string,
    @Body()
    body: {
      first_name: string;
      last_name: string;
      email_address: string;
      password: string;
      country: string;
      state: string;
      phone_number: string;
      role: string;
      level: string;
    },
    @Request() req: any,
  ): Promise<any> {
    try {
      const hashedPassword = await bcrypt.hash(body.password, 10);

      // ✅ Find the invitation by email
      const invitation = await prisma.inviteUser.findFirst({
        where: { email: body.email_address },
      });

      if (!invitation) {
        this.setStatus(403);
        return {
          message: "No invitation found for this email address.",
        };
      }

      if (body.password === "") {
        this.setStatus(400);
        return { message: "Password must be filled" };
      }

      // ✅ Create user — mark as INVITED_MEMBER (replaces `invited: true`)
      const user = await prisma.user.create({
        data: {
          ...body,
          password: hashedPassword,
          userType: "INVITED_MEMBER", // ✅ new field
          form_type: "INVITED",
          level: body.level || "Beginner",
          // ✅ Do NOT connect org here via the one-to-one relation;
          //    the OrganizationMember table now owns that relationship.
        },
      });

      // ✅ Create OrganizationMember record — this is the authoritative link
      await prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organizationId,
          role: body.role || invitation.role || "member",
          joinedVia: "INVITE",
          inviteId: invitation.id,
          isActive: true,
        },
      });

      // Auto-create settings for the user
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

      const updateUser = await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastActive: new Date() },
      });

      const token = jwt.sign(
        {
          id: updateUser.id,
          settingsId: createSettings.id,
          full_name: `${updateUser.first_name} ${updateUser.last_name}`,
          email: updateUser.email_address,
          role: updateUser.role,
          userType: updateUser.userType, // ✅ in token
          organizationId: organizationId, // ✅ in token so middleware knows their org
          updateStatus: updateUser.isOnline,
        },
        (process.env.BEARERAUTH_SECRET as string) || "secret-key",
        { expiresIn: "7d" },
      );

      if (req.res) {
        req.res.cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      this.setStatus(201);
      return {
        message: "Signup successful",
        token,
        user: {
          id: updateUser.id,
          first_name: updateUser.first_name,
          last_name: updateUser.last_name,
          email_address: updateUser.email_address,
          userType: updateUser.userType, // ✅
          organizationId,
        },
      };
    } catch (error) {
      this.setStatus(500);
      console.error(error);
    }
  }

  @Security("bearerAuth")
  @Post("/invite-users-to-organization/{organizationId}")
  public async InviteUsersToOrganization(
    @Path() organizationId: string,
    @Request() req: any,
    @Body() body: { users: { email: string; role: string }[] },
  ): Promise<any> {
    const userIdFromOrganization = req.org?.userId;
    try {
      const { users } = body;

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      const results = {
        successful: [] as any[],
        failed: [] as any[],
        alreadyInvited: [] as any[],
      };

      const invitePromises = users.map(async (user) => {
        try {
          const existingInvite = await prisma.inviteUser.findFirst({
            where: {
              email: user.email,
              organizationId: organizationId,
              expiresIn: { gt: new Date() },
            },
          });

          if (existingInvite) {
            results.alreadyInvited.push({
              email: user.email,
              role: user.role,
              message: "User already has an active invitation",
            });
            return;
          }

          const tokencode = jwt.sign(
            { organizationId, email: user.email },
            process.env.BEARERAUTH_SECRET || "secret-key",
            { expiresIn: "24h" },
          );

          const inviteEntry = await prisma.inviteUser.create({
            data: {
              email: user.email,
              role: user.role,
              code: tokencode,
              organizationId: organizationId,
              sentById: userIdFromOrganization,
              expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });

          const emailSubject = `Invitation to join ${organization.organization_name} on GOYE Platform`;
          const inviteLink = `http://localhost:3000/auth/${tokencode}/accept_invite`;
          const emailText = `You have been invited to join "${organization.organization_name}". Accept here: ${inviteLink}`;

          await SendEmail(user.email, emailSubject, emailText);

          results.successful.push({
            email: user.email,
            role: user.role,
            inviteId: inviteEntry.id,
          });
        } catch (error: any) {
          results.failed.push({
            email: user.email,
            role: user.role,
            message: error.message || "Failed to send invitation",
          });
        }
      });

      await Promise.all(invitePromises);

      const hasSuccess = results.successful.length > 0;

      let statusCode = 200;
      let message = "";

      if (results.successful.length === users.length) {
        message = `Successfully invited ${results.successful.length} user(s)`;
        statusCode = 200;
      } else if (results.successful.length > 0) {
        message = `Invited ${results.successful.length} user(s). ${results.alreadyInvited.length} already invited, ${results.failed.length} failed.`;
        statusCode = 207;
      } else if (results.alreadyInvited.length === users.length) {
        message = `All ${results.alreadyInvited.length} user(s) already have active invitations`;
        statusCode = 409;
      } else {
        message = "Failed to send invitations";
        statusCode = 500;
      }

      this.setStatus(statusCode);
      return {
        success: hasSuccess,
        message: message,
        data: {
          totalProcessed: users.length,
          successful: results.successful,
          alreadyInvited: results.alreadyInvited,
          failed: results.failed,
        },
      };
    } catch (error: any) {
      console.error(error);
      this.setStatus(500);
      return {
        success: false,
        message: "Error processing bulk invitations",
        error: error.message,
      };
    }
  }

  @Get("/fetch-specific-invited-user-by-token/{token}")
  public async FetchInvitedUserByToken(@Path() token: string): Promise<any> {
    try {
      if (!token || token.trim() === "") {
        this.setStatus(400);
        return { success: false, message: "Token is required" };
      }

      let decodedToken: any;
      try {
        decodedToken = jwt.verify(
          token,
          process.env.BEARERAUTH_SECRET || "secret-key",
        );
      } catch (jwtError: any) {
        if (jwtError.name === "TokenExpiredError") {
          this.setStatus(410);
          return {
            success: false,
            message: "Invitation token has expired",
            error: "TokenExpiredError",
            expiredAt: jwtError.expiredAt,
          };
        }
        this.setStatus(401);
        return {
          success: false,
          message: "Invalid invitation token",
          error: jwtError.message,
        };
      }

      const invitation = await prisma.inviteUser.findFirst({
        where: { code: token },
        include: {
          organization: {
            select: {
              id: true,
              organization_name: true,
              organization_email: true,
              organization_image: true,
              organization_type: true,
              organization_description: true,
            },
          },
        },
      });

      if (!invitation) {
        this.setStatus(404);
        return {
          success: false,
          message:
            "Invitation not found. The invitation may have been revoked or never existed.",
        };
      }

      if (invitation.email !== decodedToken.email) {
        this.setStatus(403);
        return {
          success: false,
          message: "Token data does not match invitation record",
        };
      }

      if (invitation.organizationId !== decodedToken.organizationId) {
        this.setStatus(403);
        return { success: false, message: "Organization mismatch" };
      }

      const now = new Date();
      const isExpired = invitation.expiresIn < now;

      if (isExpired) {
        this.setStatus(410);
        return {
          success: false,
          message:
            "This invitation has expired. Please request a new one from the organization administrator.",
          data: {
            expiredAt: invitation.expiresIn,
            email: invitation.email,
            organizationName: invitation.organization?.organization_name,
            canResend: true,
          },
        };
      }

      // ✅ Check if user already accepted — use userType instead of `invited`
      const existingUser = await prisma.user.findFirst({
        where: {
          email_address: invitation.email,
          userType: "INVITED_MEMBER", // ✅ replaces `invited: true`
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email_address: true,
          role: true,
          userType: true,
          user_pic: true,
          createdAt: true,
        },
      });

      if (existingUser) {
        this.setStatus(409);
        return {
          success: false,
          message:
            "This invitation has already been accepted. Please login to continue.",
          data: {
            user: existingUser,
            redirectTo: "/login",
          },
        };
      }

      const remainingTime = invitation.expiresIn.getTime() - now.getTime();
      const remainingHours = Math.floor(remainingTime / (1000 * 60 * 60));
      const remainingMinutes = Math.floor(
        (remainingTime % (1000 * 60 * 60)) / (1000 * 60),
      );

      this.setStatus(200);
      return {
        success: true,
        message: "Invitation found successfully",
        data: {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            createdAt: invitation.createdAt,
            expiresIn: invitation.expiresIn,
            remainingTime: {
              hours: remainingHours,
              minutes: remainingMinutes,
              totalMs: remainingTime,
            },
          },
          organization: {
            id: invitation.organization?.id,
            name: invitation.organization?.organization_name,
            email: invitation.organization?.organization_email,
            image: invitation.organization?.organization_image,
            type: invitation.organization?.organization_type,
            description: invitation.organization?.organization_description,
          },
          token: { isValid: true, isExpired: false },
        },
      };
    } catch (error: any) {
      console.error("Error fetching invited user by token:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "An internal error occurred while fetching the invitation",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      };
    }
  }

  @Security("bearerAuth")
  @Post("/generate-new-token/{organizationId}/{invitedUserId}")
  public async GenerateNewTokenForInvitedUser(
    @Path() organizationId: string,
    @Path() invitedUserId: string,
    @Request() req: any,
  ): Promise<any> {
    try {
      const userIdFromOrganization = req.org?.userId;

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      const invitedUser = await prisma.inviteUser.findUnique({
        where: { id: invitedUserId },
        select: { id: true, email: true, role: true, invited: true },
      });

      if (!invitedUser) {
        this.setStatus(404);
        return { success: false, message: "Invited user not found" };
      }

      const tokencode = jwt.sign(
        {
          organizationId: organizationId,
          email: invitedUser.email,
          userId: invitedUser.id,
        },
        process.env.BEARERAUTH_SECRET || "secret-key",
        { expiresIn: "24h" },
      );

      const existingInvite = await prisma.inviteUser.findFirst({
        where: {
          email: invitedUser.email,
          organizationId: organizationId,
        },
      });

      let inviteEntry: any;

      if (existingInvite) {
        inviteEntry = await prisma.inviteUser.update({
          where: { id: existingInvite.id },
          data: {
            code: tokencode,
            role: invitedUser.role || "member",
            sentById: userIdFromOrganization,
            expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
          },
        });
      } else {
        inviteEntry = await prisma.inviteUser.create({
          data: {
            email: invitedUser.email,
            role: invitedUser.role || "member",
            code: tokencode,
            organizationId: organizationId,
            sentById: userIdFromOrganization,
            expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteLink = `${baseUrl}/auth/${tokencode}/accept_invite`;

      const emailSubject = `Invitation to join ${organization.organization_name} on GOYE Platform`;
      const userName = invitedUser.email;

      await SendEmail(
        invitedUser.email,
        emailSubject,
        inviteLink,
        "invitation",
        {
          organizationName: organization.organization_name,
          userName: userName || undefined,
        },
      );

      this.setStatus(200);
      return {
        success: true,
        message: existingInvite
          ? "Invitation has been renewed and sent successfully"
          : "New invitation generated and sent successfully",
        data: {
          inviteId: inviteEntry.id,
          email: invitedUser.email,
          role: invitedUser.role,
          expiresIn: inviteEntry.expiresIn,
          inviteLink: inviteLink,
          isRenewal: !!existingInvite,
        },
      };
    } catch (error: any) {
      console.error("Error generating new token:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Error generating new invitation token",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/invited-users/{organizationId}")
  public async GetInvitedUsers(
    @Path() organizationId: string,
    @Request() req: any,
  ): Promise<any> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { success: false, message: "Organization not found" };
      }

      const invitations = await prisma.inviteUser.findMany({
        where: { organizationId: organizationId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          expiresIn: true,
          createdAt: true,
          sentById: true,
        },
      });

      // ✅ Use userType instead of `invited: true`
      const acceptedUsers = await prisma.user.findMany({
        where: {
          userType: "INVITED_MEMBER",
          email_address: {
            in: invitations.map((i) => i.email),
          },
        },
        select: {
          id: true,
          email_address: true,
          first_name: true,
          last_name: true,
          role: true,
          userType: true, // ✅
          createdAt: true,
          // ✅ Also return their membership record
          organizationMemberships: {
            where: { organizationId },
            select: {
              joinedVia: true,
              joinedAt: true,
              isActive: true,
            },
          },
        },
      });

      this.setStatus(200);
      return {
        success: true,
        message: "Invited users fetched successfully",
        data: {
          pending: invitations.filter((i) => i.expiresIn > new Date()),
          expired: invitations.filter((i) => i.expiresIn <= new Date()),
          accepted: acceptedUsers,
        },
      };
    } catch (error: any) {
      console.error("Error fetching invited users:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Error fetching invited users",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Post("/resend-invitation/{invitationId}")
  public async ResendInvitation(
    @Path() invitationId: string,
    @Request() req: any,
  ): Promise<any> {
    try {
      const existingInvitation = await prisma.inviteUser.findUnique({
        where: { id: invitationId },
        include: { organization: true },
      });

      if (!existingInvitation) {
        this.setStatus(404);
        return { success: false, message: "Invitation not found" };
      }

      // ✅ Use userType to check if already accepted
      const existingUser = await prisma.user.findFirst({
        where: {
          email_address: existingInvitation.email,
          userType: "INVITED_MEMBER", // ✅ replaces `invited: true`
        },
      });

      if (existingUser) {
        this.setStatus(400);
        return {
          success: false,
          message: "User has already accepted the invitation",
        };
      }

      const newTokencode = jwt.sign(
        {
          organizationId: existingInvitation.organizationId,
          email: existingInvitation.email,
        },
        process.env.BEARERAUTH_SECRET || "secret-key",
        { expiresIn: "24h" },
      );

      const updatedInvitation = await prisma.inviteUser.update({
        where: { id: invitationId },
        data: {
          code: newTokencode,
          expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
          sentById: req.org?.userId || req.user?.id,
        },
      });

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteLink = `${baseUrl}/auth/${newTokencode}/accept_invite`;

      const emailSubject = `Resent: Invitation to join ${existingInvitation.organization?.organization_name} on GOYE Platform`;
      const emailText = `Your invitation to join "${existingInvitation.organization?.organization_name}" has been resent. Accept here: ${inviteLink}\n\nThis invitation will expire in 24 hours.`;

      await SendEmail(existingInvitation.email, emailSubject, emailText);

      this.setStatus(200);
      return {
        success: true,
        message: "Invitation resent successfully",
        data: {
          inviteLink: inviteLink,
          expiresIn: updatedInvitation.expiresIn,
        },
      };
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      this.setStatus(500);
      return {
        success: false,
        message: "Error resending invitation",
        error: error.message,
      };
    }
  }

  @Post("/invitations/check")
  public async CheckInvitation(@Body() body: { token?: string }): Promise<any> {
    try {
      const invitation = await prisma.inviteUser.findFirst({
        where: {
          code: body.token,
          expiresIn: { gt: new Date() },
        },
      });

      if (!invitation) {
        this.setStatus(404);
        return { exists: false, message: "Invitation not found or expired" };
      }

      return {
        exists: true,
        invitation: {
          role: invitation.role,
          expiresIn: invitation.expiresIn,
        },
      };
    } catch (error) {
      console.error(error);
      this.setStatus(500);
      return { exists: false, error: "Failed to check invitation" };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-invited-users/{organizationId}")
  public async FetchInviteUsers(@Path() organizationId: string) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return { message: "Organization not found" };
      }

      const fetchInviteusers = await prisma.inviteUser.findMany({
        where: { organizationId },
        select: {
          id: true,
          email: true,
          role: true,
          // ✅ Also surface whether the user has accepted and their userType
          members: {
            select: {
              userId: true,
              joinedVia: true,
              isActive: true,
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  userType: true,
                },
              },
            },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Invited users fetched successfully",
        data: fetchInviteusers,
      };
    } catch (error) {
      this.setStatus(500);
      return { message: "An error occurred" };
    }
  }

  @Security("bearerAuth")
@Get("/fetch-invited-users-with-access/{organizationId}")
public async FetchInvitedUsersWithAccess(
  @Path() organizationId: string,
  @Request() req: any,
): Promise<any> {
  try {
    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      this.setStatus(404);
      return { 
        success: false, 
        message: "Organization not found" 
      };
    }

    // Get all active members who accepted invitations
    const membersWithAccess = await prisma.organizationMember.findMany({
      where: {
        organizationId: organizationId,
        isActive: true,
        joinedVia: {
          in: ["INVITE", "CREATED"] // Include both invited users and creators
        }
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email_address: true,
            role: true,
            user_pic: true,
            userType: true,
            isOnline: true,
            lastActive: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    // Also get the organization owner (creator)
    const ownerMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: organizationId,
        role: "org_admin",
        joinedVia: "CREATED"
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email_address: true,
            role: true,
            user_pic: true,
            userType: true,
            isOnline: true,
            lastActive: true,
            createdAt: true,
          }
        }
      }
    });

    // Combine and deduplicate users
    const usersMap = new Map();
    
    // Add owner if exists
    if (ownerMember && ownerMember.user) {
      usersMap.set(ownerMember.user.id, {
        ...ownerMember.user,
        membershipRole: ownerMember.role,
        joinedAt: ownerMember.joinedAt,
        joinedVia: ownerMember.joinedVia,
        isActive: ownerMember.isActive,
        organizationMemberId: ownerMember.id
      });
    }

    // Add members
    membersWithAccess.forEach(member => {
      if (member.user && !usersMap.has(member.user.id)) {
        usersMap.set(member.user.id, {
          ...member.user,
          membershipRole: member.role,
          joinedAt: member.joinedAt,
          joinedVia: member.joinedVia,
          isActive: member.isActive,
          organizationMemberId: member.id
        });
      }
    });

    // Convert to array
    const usersWithAccess = Array.from(usersMap.values());

    // Get pending invitations count
    const pendingInvitations = await prisma.inviteUser.count({
      where: {
        organizationId: organizationId,
        expiresIn: { gt: new Date() },
        // Exclude those who already accepted
        NOT: {
          email: {
            in: usersWithAccess.map(u => u.email_address)
          }
        }
      }
    });

    // Get total members count
    const totalMembers = await prisma.organizationMember.count({
      where: {
        organizationId: organizationId,
        isActive: true
      }
    });

    this.setStatus(200);
    return {
      success: true,
      message: "Users with access fetched successfully",
      data: {
        users: usersWithAccess.map(user => ({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email_address: user.email_address,
          role: user.role,
          user_pic: user.user_pic,
          userType: user.userType,
          isOnline: user.isOnline,
          lastActive: user.lastActive,
          joinedAt: user.joinedAt,
          joinedVia: user.joinedVia,
          membershipRole: user.membershipRole,
          isActive: user.isActive,
          createdAt: user.createdAt,
        })),
        stats: {
          totalMembers: totalMembers,
          activeMembers: usersWithAccess.filter(u => u.isActive).length,
          pendingInvitations: pendingInvitations,
          organizationId: organizationId,
          organizationName: organization.organization_name,
        }
      }
    };

  } catch (error: any) {
    console.error("Error fetching users with access:", error);
    this.setStatus(500);
    return {
      success: false,
      message: "Error fetching users with access",
      error: error.message,
    };
  }
}

// Enhanced version of fetch-invited-users endpoint
@Security("bearerAuth")
@Get("/fetch-invited-users-enhanced/{organizationId}")
public async FetchInvitedUsersEnhanced(
  @Path() organizationId: string,
  @Request() req: any,
): Promise<any> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      this.setStatus(404);
      return { success: false, message: "Organization not found" };
    }

    // Get all invitations
    const invitations = await prisma.inviteUser.findMany({
      where: { 
        organizationId: organizationId,
        // Only include active invites that haven't been accepted
        expiresIn: { gt: new Date() }
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresIn: true,
        // Check if this user has already accepted
        members: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            userId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter out invitations that have been accepted
    const pendingInvitations = invitations.filter(
      invite => invite.members.length === 0
    );

    const formattedInvitations = pendingInvitations.map(invite => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      createdAt: invite.createdAt,
      expiresIn: invite.expiresIn,
      // Check if invitation is expiring soon (within 24 hours)
      isExpiringSoon: invite.expiresIn 
        ? new Date(invite.expiresIn).getTime() - Date.now() < 24 * 60 * 60 * 1000
        : false,
      // Time remaining in hours
      hoursRemaining: invite.expiresIn
        ? Math.floor((new Date(invite.expiresIn).getTime() - Date.now()) / (1000 * 60 * 60))
        : 0
    }));

    this.setStatus(200);
    return {
      success: true,
      message: "Pending invitations fetched successfully",
      data: formattedInvitations,
    };

  } catch (error: any) {
    console.error("Error fetching invited users:", error);
    this.setStatus(500);
    return {
      success: false,
      message: "Error fetching invited users",
      error: error.message,
    };
  }
}

  @Delete("/delete-organization/{id}")
  public async DeleteOrganization(@Path() id: string) {
    try {
      const deleteOrganization = await prisma.organization.delete({
        where: { id },
      });

      return {
        message: "Organization Deleted successfully",
        data: deleteOrganization,
      };
    } catch (error) {
      console.error(error);
    }
  }

  @Security("bearerAuth")
@Get("/get-courses-by-organization")
public async GetCoursesByOrganization(
  @Request() req: any,
): Promise<CourseResponse> {
  const userId = req.user?.id;
  const userLevel = req.user?.level;
  const language = req.user?.language;
  const languageCode = req.user?.languageCode;

  try {
    if (!userId) {
      this.setStatus(400);
      return { message: "User ID not found", data: null };
    }

    // ── Resolve organizationId ─────────────────────────────────────────────
    let organizationId = req.user?.organizationId ?? req.org?.id ?? null;

    if (!organizationId) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId, isActive: true },
        select: { organizationId: true },
        orderBy: { joinedAt: "desc" },
      });
      organizationId = membership?.organizationId ?? null;
    }

    if (!organizationId) {
      this.setStatus(404);
      return {
        message: "User is not associated with any organization",
        data: null,
      };
    }

    if (!userLevel) {
      this.setStatus(400);
      return { message: "User level not found", data: null };
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, organization_name: true },
    });

    if (!organization) {
      this.setStatus(404);
      return { message: "Organization not found", data: null };
    }

    const normalizedLevel = userLevel.toLowerCase();
    let levelCondition = {};

    if (normalizedLevel === "beginners" || normalizedLevel === "beginner") {
      levelCondition = { course_level: "Beginner" };
    } else if (normalizedLevel === "intermediate") {
      levelCondition = { course_level: "Intermediate" };
    } else if (normalizedLevel === "advanced") {
      levelCondition = { course_level: "Advanced" };
    }

    const organizationCourses = await prisma.course.findMany({
      where: {
        organizationId: organizationId,
        ...levelCondition,
      },
      orderBy: { createdAt: "desc" },
      include: {
        module: {
          select: {
            id: true,
            module_title: true,
            _count: { select: { lesson: true } },
            lesson: { 
              select: { 
                id: true,
                duration: true 
              } 
            },
          },
        },
        organization: {
          select: {
            organization_name: true,
            organization_type: true,
          },
        },
        enrollment: {
          where: { userId },
          select: {
            status: true,
            enrolledAt: true,
            completedAt: true,
          },
        },
        _count: { select: { enrollment: true } },
      },
    });

    const courseIds = organizationCourses.map((c) => c.id);
    let userEnrollments: any[] = [];

    if (courseIds.length > 0) {
      userEnrollments = await prisma.enrollment.findMany({
        where: { userId, courseId: { in: courseIds } },
        select: { courseId: true, status: true, enrolledAt: true },
      });
    }

    const enrollmentMap = new Map(
      userEnrollments.map((e) => [e.courseId, e]),
    );

    // ── Get completed lessons for progress calculation ────────────────────
    const completedLessons = await prisma.progress.findMany({
      where: {
        userId,
        progressBar: { gte: 100 },
        lesson: {
          module: {
            courseId: { in: courseIds }
          }
        }
      },
      select: {
        lessonId: true,
        lesson: {
          select: {
            module: {
              select: {
                courseId: true
              }
            }
          }
        }
      },
    });

    // Group completed lessons by courseId
    const completedLessonsByCourse = new Map<string, Set<string>>();
    completedLessons.forEach((progress) => {
      const courseId = progress.lesson?.module?.courseId;
      if (courseId) {
        if (!completedLessonsByCourse.has(courseId)) {
          completedLessonsByCourse.set(courseId, new Set());
        }
        completedLessonsByCourse.get(courseId)?.add(progress.lessonId);
      }
    });

    // ── Get video tracking progress for each lesson ───────────────────────
    const videoTrackers = await prisma.videoTracker.findMany({
      where: {
        lesson: {
          module: {
            courseId: { in: courseIds }
          }
        },
        progress: {
          userId: userId
        }
      },
      select: {
        lessonId: true,
        videoTrackTime: true,
        videoFinished: true,
        lesson: {
          select: {
            duration: true,
            module: {
              select: {
                courseId: true
              }
            }
          }
        }
      },
    });

    // Group video progress by courseId
    const videoProgressByCourse = new Map<string, { 
      totalWatched: number, 
      totalDuration: number,
      lessonsWithProgress: number 
    }>();
    
    videoTrackers.forEach((tracker) => {
      const courseId = tracker.lesson?.module?.courseId;
      if (courseId) {
        if (!videoProgressByCourse.has(courseId)) {
          videoProgressByCourse.set(courseId, { 
            totalWatched: 0, 
            totalDuration: 0,
            lessonsWithProgress: 0 
          });
        }
        const courseData = videoProgressByCourse.get(courseId)!;
        courseData.totalWatched += tracker.videoTrackTime || 0;
        courseData.totalDuration += tracker.lesson?.duration || 0;
        if (tracker.videoTrackTime > 0) {
          courseData.lessonsWithProgress += 1;
        }
      }
    });

    const formattedCourses = organizationCourses.map((course) => {
      const userEnrollment = enrollmentMap.get(course.id);
      const allLessons = course.module.flatMap(m => m.lesson);
      const totalLessons = allLessons.length;
      
      // Calculate lesson completion progress
      const completedLessonIds = completedLessonsByCourse.get(course.id) || new Set();
      const completedLessonsCount = completedLessonIds.size;
      
      // Calculate video progress
      const videoData = videoProgressByCourse.get(course.id) || { 
        totalWatched: 0, 
        totalDuration: 0,
        lessonsWithProgress: 0 
      };
      
      // Calculate overall progress percentage
      let progressPercentage = 0;
      if (totalLessons > 0) {
        // Weight: 70% lesson completion, 30% video progress
        const lessonProgress = (completedLessonsCount / totalLessons) * 70;
        const videoProgress = videoData.totalDuration > 0 
          ? Math.min((videoData.totalWatched / videoData.totalDuration) * 30, 30)
          : 0;
        progressPercentage = Math.round(lessonProgress + videoProgress);
      }

      // Get total duration in minutes
      const totalDurationMinutes = Math.round(
        course.module.reduce((acc, m) => {
          const durationSum = m.lesson.reduce(
            (sum, l) => sum + (l.duration || 0),
            0,
          );
          return acc + durationSum;
        }, 0) / 60
      );

      // Calculate average video progress per lesson
      const averageVideoProgress = videoData.lessonsWithProgress > 0
        ? Math.round((videoData.totalWatched / videoData.lessonsWithProgress) / 60)
        : 0;

      // Determine enrollment status with progress
      let enrollmentStatus = userEnrollment?.status || "NOT_ENROLLED";
      
      // Auto-update to IN_PROGRESS if they've started watching
      if (enrollmentStatus === "ENROLLED" && progressPercentage > 0 && progressPercentage < 100) {
        enrollmentStatus = "IN_PROGRESS";
      }
      
      // Auto-complete if all lessons are done
      if (enrollmentStatus !== "COMPLETED" && completedLessonsCount === totalLessons && totalLessons > 0) {
        enrollmentStatus = "COMPLETED";
      }

      return {
        id: course.id,
        course_title: course.course_title,
        course_short_description: course.course_short_description,
        course_description: course.course_description,
        course_level: course.course_level,
        course_image: course.course_image,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        moduleCount: course.module.length,
        lessonCount: totalLessons,
        totalDuration: totalDurationMinutes,
        enrollmentStatus: enrollmentStatus,
        isEnrolled: !!userEnrollment,
        totalEnrollments: course._count.enrollment,
        organizationName: course.organization?.organization_name,
        // ── New progress fields ──
        progress: {
          percentage: progressPercentage,
          completedLessons: completedLessonsCount,
          totalLessons: totalLessons,
          totalDurationMinutes: totalDurationMinutes,
          watchedDurationMinutes: Math.round(videoData.totalWatched / 60),
          averageVideoProgressPerLesson: averageVideoProgress,
          isCompleted: completedLessonsCount === totalLessons && totalLessons > 0,
        },
        lastAccessed: userEnrollment?.enrolledAt || null,
        completedAt: userEnrollment?.completedAt || null,
      };
    });

    // ── Calculate overall organization progress ────────────────────────────
    const totalCourses = formattedCourses.length;
    const enrolledCourses = formattedCourses.filter(c => c.isEnrolled);
    const completedCourses = formattedCourses.filter(c => c.progress.isCompleted);
    
    let overallProgress = 0;
    if (totalCourses > 0) {
      const totalProgress = formattedCourses.reduce((sum, c) => sum + c.progress.percentage, 0);
      overallProgress = Math.round(totalProgress / totalCourses);
    }

    let translatedText = null;
    if (formattedCourses.length > 0 && language && languageCode) {
      try {
        translatedText = await TranslateText(
          formattedCourses[0].course_description,
          language,
          languageCode,
        );
      } catch (translationError) {
        console.error("Translation error:", translationError);
      }
    }

    this.setStatus(200);
    return {
      message: "Organization courses fetched successfully",
      data: {
        courses: formattedCourses,
        organizationId,
        organizationName: organization.organization_name,
        level: userLevel,
        totalCourses: totalCourses,
        language: language ?? null,
        languageCode: languageCode ?? null,
        translatedText: translatedText ?? null,
        // ── Overall progress stats ──
        overallProgress: {
          percentage: overallProgress,
          enrolledCourses: enrolledCourses.length,
          completedCourses: completedCourses.length,
          totalCourses: totalCourses,
        },
      },
    };
  } catch (error: any) {
    console.error("Error in GetCoursesByOrganization:", error);
    this.setStatus(500);
    return {
      message: "Error fetching organization courses: " + error.message,
      data: null,
    };
  }
}

  @Security("bearerAuth")
  @Post("/logout")
  public async Logout(@Request() req: any): Promise<any> {
    const orgId = req.org?.id;

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        isOnline: false,
        lastActive: new Date(),
      },
    });

    if (req.res) {
      req.res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });
    }

    this.setStatus(200);
    return { message: "Logout successful" };
  }
}
