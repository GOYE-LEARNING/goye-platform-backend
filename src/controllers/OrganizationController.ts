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
import { OrganizationDTO, User } from "../interface/interfaces";
import prisma from "../db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MediaService } from "../services/mediaServices";
import { SendEmail } from "../utils/sendmail";
import { PricingService } from "../services/pricingService";
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

          // ✅ USER (always exists)
          user: {
            create: {
              first_name: body.user_first_name,
              last_name: body.user_last_name,
              email_address: body.user_email_address,
              country: body.user_country,
              state: body.user_state,
              phone_number: body.user_phone_number,
              role: body.user_role,
              form_type: "ORGANIZATION",
              level: "ORGANIZATION",
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
      });

      //To automatically generate the settings for it
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
          message: "Organization not found or invalid creditials",
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

      // Session management is handled by middleware based on device/tab ID
      // No cleanup needed here - middleware will handle device conflicts

      // Create token with user ID and organization ID
      const token = jwt.sign(
        {
          type: "ORGANIZATION",
          id: organization.user.id, // The user's ID associated with this organization
          userId: organization.user.id, // Also include as userId for middleware compatibility
          organizationId: updateOrg.id, // The organization ID
          org_name: organization.organization_name,
          org_email: organization.organization_email,
          full_name: `${organization.user.first_name} ${organization.user.last_name}`,
          email: organization.user.email_address,
          updatedStatus: updateOrg.isOnline,
        },
        (process.env.BEARERAUTH_SECRET! as string) || "secret-key",
        { expiresIn: "7d" },
      );

      if (req.res) {
        req.res.cookie("token", token, {
          httpOnly: true,
          secure: true, // because you're on localhost
          sameSite: "none", // must be none for cross-port cookie sharing
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

  @Get("/fetch-organizations")
  public async FetchOrganization(): Promise<any> {
    try {
      const fetchOrganizationsType = await prisma.organization.findMany({
        include: {
          user: true,
          Church: true,
          school: true,
          Club: true,
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
        where: {
          id,
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
        where: {
          id: organizationId,
        },
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
        where: {
          id: organizationId,
        },
        data: {
          organization_image: url,
        },
      });

      this.setStatus(201);
      return {
        message: "Success uploading image",
        url: updateOrganization.organization_image,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "Error creating organization",
      };
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
        where: {
          id: organizationId,
        },
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
        where: {
          id: organizationId,
        },
        data: {
          Church: {
            update: {
              church_logo: url,
            },
          },
        },
        select: {
          Church: {
            select: {
              id: true,
              church_logo: true,
            },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Church image uploaded successfully",
        data: {
          organizationId: updateOrganizationChurch.Church.id,
        },
        url: updateOrganizationChurch.Church.church_logo,
      };
    } catch (error) {}
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
        where: {
          id: organizationId,
        },
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
        where: {
          id: organizationId,
        },
        data: {
          school: {
            update: {
              school_logo: url,
            },
          },
        },
        select: {
          school: {
            select: {
              id: true,
              school_logo: true,
            },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "School image uploaded successfully",
        data: {
          organizationId: updateOrganizationSchool.school.id,
        },
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
        where: {
          id: organizationId,
        },

        data: {
          school: {
            update: {
              school_document: url,
            },
          },
        },
        include: {
          school: {
            select: {
              id: true,
              school_document: true,
            },
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
        where: {
          id: organizationId,
        },

        data: {
          Club: {
            update: {
              club_document: url,
            },
          },
        },
        include: {
          Club: {
            select: {
              id: true,
              club_document: true,
            },
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
        where: {
          id,
        },
        include: {
          Church: true,
          school: true,
          Club: true,
          user: true,
        },
      });

      if (!findOrganization) {
        this.setStatus(404);
        return {
          message: "This organization does not exist.",
        };
      }

      const updateOrganization = await prisma.organization.update({
        where: {
          id,
        },
        data: {
          organization_name: body.organization_name,
          organization_description: body.organization_description,
          organization_country: body.organization_country,
          organization_state: body.organization_state,
          organization_phone_number: body.organization_phone_number,
          organization_year: body.organization_year,
          organization_type: body.organization_type as any,

          // Church update - assumes it exists
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

          // School update - assumes it exists
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

          // Club update - assumes it exists
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

          // User update - assumes user exists
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
        where: {
          id: organizationId,
        },
      });

      if (!organization) {
        this.setStatus(404);
        return {
          message: "Organization not found",
        };
      }

      await prisma.organization.update({
        where: {
          id: organizationId,
        },
        data: {
          user: {
            update: {
              password: hashedPassword as any,
            },
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
        user: true,
        Church: true ? true : null,
        school: true ? true : null,
        Club: true ? true : null,
      },
    });

    this.setStatus(200);
    return {
      message: "Profile fetched succfully",
      organization,
    };
  }

  @Post("/invite-user/signup")
  public async CreateUser(
    @Body() body: Omit<User, "id">,
    @Request() req: any,
  ): Promise<any> {
    try {
      const hashedPassword = await bcrypt.hash(body.password, 10);
      const invitation = await prisma.inviteUser.findFirst({
        where: {
          email: body.email_address,
        },
      });

      if (invitation) {
        //To store password in token
        const user = await prisma.user.create({
          data: {
            ...body,
            password: hashedPassword,
            invited: true,
            form_type: "INVITED",
            level: body.level || "Beginner",
          },
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

        //Let check if the User exist
        if (!user) {
          this.setStatus(401);
          return {
            messgae: "User already exist",
          };
        }

        if (body.password == "") {
          this.setStatus(400);
          return {
            message: "Password must be filled",
          };
        }

        const updateUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            isOnline: true,
            lastActive: new Date(),
          },
        });

        const token = jwt.sign(
          {
            id: updateUser.id,
            settingsId: createSettings.id,
            full_name: `${updateUser.first_name} ${updateUser.last_name}`,
            email: updateUser.email_address,
            role: updateUser.role,
            password: body.password,
            updateStatus: updateUser.isOnline,
          },
          (process.env.BEARERAUTH_SECRET as string) || "secret-key",
          { expiresIn: "7d" },
        );

        if (req.res) {
          req.res.cookie("token", token, {
            httpOnly: true,
            secure: true, // because you're on localhost
            sameSite: "none", // must be none for cross-port cookie sharing
            maxAge: 7 * 24 * 60 * 60 * 1000,
          });
        }

        this.setStatus(201);
        return {
          message: "Signup successfull",
          token,
          user: {
            id: updateUser.id,
            first_name: updateUser.first_name,
            last_name: updateUser.last_name,
            email_address: updateUser.email_address,
          },
        };
      } else {
        this.setStatus(400);
        return {
          message: "The code does not exist",
          status: 400,
        };
      }
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

      // Check if organization exists first
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.setStatus(404);
        return {
          success: false,
          message: "Organization not found",
        };
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

          // Generate a unique token
          const tokencode = jwt.sign(
            { organizationId, email: user.email },
            process.env.BEARERAUTH_SECRET || "secret-key",
            { expiresIn: "24h" },
          );

          // Create DB record
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

          // Send Email
          const emailSubject = `Invitation to join ${organization.organization_name} on GOYE Platform`;
          // NEW URL structure: token in the path instead of query param
          const inviteLink = `http://localhost:3000/auth/${tokencode}/accept-invite`;
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

      // Execute all invites
      await Promise.all(invitePromises);

      // Determine overall success status
      const hasSuccess = results.successful.length > 0;
      const hasPartialSuccess =
        hasSuccess &&
        (results.failed.length > 0 || results.alreadyInvited.length > 0);

      let statusCode = 200;
      let message = "";

      if (results.successful.length === users.length) {
        // All successful
        message = `Successfully invited ${results.successful.length} user(s)`;
        statusCode = 200;
      } else if (results.successful.length > 0) {
        // Partial success
        message = `Invited ${results.successful.length} user(s). ${results.alreadyInvited.length} already invited, ${results.failed.length} failed.`;
        statusCode = 207; // Multi-Status
      } else if (results.alreadyInvited.length === users.length) {
        // All already invited
        message = `All ${results.alreadyInvited.length} user(s) already have active invitations`;
        statusCode = 409; // Conflict
      } else {
        // All failed
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

// In your OrganizationController
// In your OrganizationController - Updated GenerateNewTokenForInvitedUser

// In your OrganizationController - Better version that updates existing invitation

@Security("bearerAuth")
@Post("/generate-new-token/{organizationId}/{invitedUserId}")
public async GenerateNewTokenForInvitedUser(
  @Path() organizationId: string,
  @Path() invitedUserId: string,
  @Request() req: any,
): Promise<any> {
  try {
    // Get the organization admin/user who is sending the invitation
    const userIdFromOrganization = req.org?.userId || req.user?.id;
    
    console.log(`🔄 Generating new token for invited user: ${invitedUserId}`);
    console.log(`📋 Organization ID: ${organizationId}`);

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      this.setStatus(404);
      return {
        success: false,
        message: "Organization not found",
      };
    }

    // Find the invited user by their user ID
    const invitedUser = await prisma.inviteUser.findUnique({
      where: { id: invitedUserId },
      select: {
        id: true,
        email: true,
        role: true,
        invited: true,
      },
    });

    if (!invitedUser) {
      this.setStatus(404);
      return {
        success: false,
        message: "Invited user not found",
      };
    }

    console.log(`✅ Found invited user: ${invitedUser.email}`);

    // Generate a new unique token
    const tokencode = jwt.sign(
      { 
        organizationId: organizationId, 
        email: invitedUser.email,
        userId: invitedUser.id
      },
      process.env.BEARERAUTH_SECRET || "secret-key",
      { expiresIn: "24h" }
    );

    // Check for existing invitation
    const existingInvite = await prisma.inviteUser.findFirst({
      where: {
        email: invitedUser.email,
        organizationId: organizationId,
      },
    });

    let inviteEntry;
    
    if (existingInvite) {
      // UPDATE existing invitation instead of deleting
      inviteEntry = await prisma.inviteUser.update({
        where: { id: existingInvite.id },
        data: {
          code: tokencode,
          role: invitedUser.role || "member",
          sentById: userIdFromOrganization,
          expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset to 24 hours
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Updated existing invitation for: ${invitedUser.email}`);
    } else {
      // CREATE new invitation if none exists
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
      console.log(`✅ Created new invitation for: ${invitedUser.email}`);
    }

    // Generate the invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/auth/${tokencode}/accept-invite`;
    
    // Send invitation email using your SendEmail function
    const emailSubject = `Invitation to join ${organization.organization_name} on GOYE Platform`;
    const userName = `${invitedUser.email || ''}`.trim();
    
    await SendEmail(
      invitedUser.email,
      emailSubject,
      inviteLink,
      "invitation",
      {
        organizationName: organization.organization_name,
        userName: userName || undefined,
      }
    );

    console.log(`📧 Invitation email sent to: ${invitedUser.email}`);

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
    console.error("❌ Error generating new token:", error);
    this.setStatus(500);
    return {
      success: false,
      message: "Error generating new invitation token",
      error: error.message,
    };
  }
}
// Also add an endpoint to get all invited users for an organization
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
      return {
        success: false,
        message: "Organization not found",
      };
    }

    // Get all invitations for this organization
    const invitations = await prisma.inviteUser.findMany({
      where: {
        organizationId: organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresIn: true,
        createdAt: true,
        sentById: true,
      },
    });

    // Also get users who have already accepted invitations
    const acceptedUsers = await prisma.user.findMany({
      where: {
        invited: true,
        email_address: {
          in: invitations.map(i => i.email),
        },
      },
      select: {
        id: true,
        email_address: true,
        first_name: true,
        last_name: true,
        role: true,
        createdAt: true,
      },
    });

    this.setStatus(200);
    return {
      success: true,
      message: "Invited users fetched successfully",
      data: {
        pending: invitations.filter(i => i.expiresIn > new Date()),
        expired: invitations.filter(i => i.expiresIn <= new Date()),
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

// Add an endpoint to resend invitation
@Security("bearerAuth")
@Post("/resend-invitation/{invitationId}")
public async ResendInvitation(
  @Path() invitationId: string,
  @Request() req: any,
): Promise<any> {
  try {
    // Find the existing invitation
    const existingInvitation = await prisma.inviteUser.findUnique({
      where: { id: invitationId },
      include: {
        organization: true,
      },
    });

    if (!existingInvitation) {
      this.setStatus(404);
      return {
        success: false,
        message: "Invitation not found",
      };
    }

    // Check if it's already accepted (no user associated yet)
    const existingUser = await prisma.user.findFirst({
      where: {
        email_address: existingInvitation.email,
        invited: true,
      },
    });

    if (existingUser) {
      this.setStatus(400);
      return {
        success: false,
        message: "User has already accepted the invitation",
      };
    }

    // Generate new token
    const newTokencode = jwt.sign(
      { 
        organizationId: existingInvitation.organizationId, 
        email: existingInvitation.email 
      },
      process.env.BEARERAUTH_SECRET || "secret-key",
      { expiresIn: "24h" }
    );

    // Update the invitation with new token and expiration
    const updatedInvitation = await prisma.inviteUser.update({
      where: { id: invitationId },
      data: {
        code: newTokencode,
        expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
        sentById: req.org?.userId || req.user?.id,
      },
    });

    // Send new email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/auth/${newTokencode}/accept-invite`;
    
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

  // Update your invitations/check endpoint to also verify the token
  @Post("/invitations/check")
  public async CheckInvitation(@Body() body: { token?: string }): Promise<any> {
    try {
      const invitation = await prisma.inviteUser.findFirst({
        where: {
          code: body.token, // Also check the token matches
          expiresIn: { gt: new Date() }, // Not expired
        },
      });

      if (!invitation) {
        this.setStatus(404);
        return {
          exists: false,
          message: "Invitation not found or expired",
        };
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
      return {
        exists: false,
        error: "Failed to check invitation",
      };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-invited-users/{organizationId}")
  public async FetchInviteUsers(@Path() organizationId: string) {
    try {
      const organization = await prisma.organization.findUnique({
        where: {
          id: organizationId,
        },
      });

      if (!organization) {
        this.setStatus(404);
        return {
          message: "Organization not found",
        };
      }

      const fetchInviteusers = await prisma.organization.findMany({
        where: {
          user: {
            invited: true,
          },
        },

        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
              email_address: true,
              role: true,
              user_pic: true,
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
      return {
        message: "An error occured",
      };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-invited-users-with-access/{organizationId}")
  public async FetchInviteUsersWithAccess(@Path() organizationId: string) {
    try {
      const organization = await prisma.organization.findUnique({
        where: {
          id: organizationId,
        },
      });

      if (!organization) {
        this.setStatus(404);
        return {
          message: "Organization not found",
        };
      }

      const fetchInviteusers = await prisma.organization.findMany({
        where: {
          user: {
            invited: true,
            role: "admin",
          },
        },

        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
              email_address: true,
              role: true,
              user_pic: true,
            },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Invited users with access fetched successfully",
        data: fetchInviteusers,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "An error occured",
      };
    }
  }

  @Delete("/delete-organization/{id}")
  public async DeleteOrganization(@Path() id: string) {
    try {
      const deleteOrganization = await prisma.organization.delete({
        where: {
          id,
        },
      });

      return {
        message: "Organization Deleted succesfully",
        data: deleteOrganization,
      };
    } catch (error) {
      console.error(error);
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
    return {
      message: "Logout successful",
    };
  }
}
