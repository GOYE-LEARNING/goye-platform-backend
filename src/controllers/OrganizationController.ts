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
import { OrganizationDTO } from "../interface/interfaces";
import prisma from "../db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MediaService } from "../services/mediaServices";
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
    @Body() body: Omit<OrganizationDTO, "id">
  ): Promise<any> {
    const orgTypeMap: Record<string, "CHURCH" | "SCHOOL" | "CLUB"> = {
      church: "CHURCH",
      school: "SCHOOL",
      club: "CLUB",
    };

    const formTypeMap: Record<string, "ORGANIZATION" | "INDIVIDUAL"> = {
      organization: "ORGANIZATION",
      individual: "INDIVIDUAL",
    };    

    
    try {
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
              form_type: formTypeMap[body.organization_type],
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
                school_email: body.school.school_email_domain,
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
    @Body() credential: { org_email: string; org_password: string }
  ) {
    try {
      const orgnaization = await prisma.organization.findUnique({
        where: {
          organization_email: credential.org_email,
        },
      });

      if (!orgnaization) {
        this.setStatus(404);
        return {
          message: "Organization not found or invalid creditials",
        };
      }

      const unHashedPassword = await bcrypt.compare(
        credential.org_password,
        orgnaization.organization_password
      );

      if (!unHashedPassword) {
        this.setStatus(400);
        return {
          message: "Password is incorrect",
        };
      }

      const updateOrg = await prisma.organization.update({
        where: {
          id: orgnaization.id,
        },
        data: {
          isOnline: true,
          lastActive: new Date(),
        },
      });

      const token = jwt.sign(
        {
          id: updateOrg.id,
          org_name: orgnaization.organization_name,
          org_email: orgnaization.organization_email,
          updatedStatus: updateOrg.isOnline,
        },
        (process.env.BEARERAUTH_SECRET! as string) || "secret-key",
        { expiresIn: "7d" }
      );

      if (req.res) {
        req.res.cookie("token", token, {
          httpOnly: true,
          secure: true, // because you're on localhost
          sameSite: "none", // must be none for cross-port cookie sharing
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }
    } catch (error) {
      console.error(error);
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

      return {
        message: "Organization fetched successfully",
        data: fetchSpecificOrganization,
      };
    } catch (error) {
      console.error(error);
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
    }
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
        body.mimeType
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
    }
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
        body.mimeType
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
    }
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
        body.mimeType
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
    }
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
        body.mimeType
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
    @Body() body: Omit<OrganizationDTO, "id">
  ) {
    try {
      const updateOrganization = await prisma.organization.update({
        where: {
          id,
        },

        data: {
          organization_name: body.organization_name,
          organization_email: body.organization_email,
          organization_description: body.organization_description,
          organization_country: body.organization_country,
          organization_state: body.organization_state,
          organization_phone_number: body.organization_phone_number,
          organization_year: body.organization_year,
          organization_type: body.organization_type as any,
          Church: body.church && {
            upsert: {
              create: {
                church_min_name: body.church.church_ministry_name,
                church_ld_pastor: body.church.church_lead_pastor,
              },
              update: {
                church_ld_pastor: body.church.church_lead_pastor,
              },
            },
          },

          school: body.school && {
            upsert: {
              create: {
                school_name: body.school.school_name,
                school_type: body.school.school_type,
              },
              update: {
                school_type: body.school.school_type,
              },
            },
          },

          Club: body.club && {
            upsert: {
              create: {
                club_name: body.club.club_name,
                club_type: body.club.club_type,
              },
              update: {
                club_type: body.club.club_type,
              },
            },
          },
          user: {
            create: {
              first_name: body.user_first_name,
              last_name: body.user_last_name,
              email_address: body.user_email_address,
              country: body.user_country,
              state: body.user_state,
              phone_number: body.user_phone_number,
              role: body.user_role,
              form_type: body.user_form_type as any,
              level: "ORGANIZATION",
            },
          },
        },
      });

      return {
        message: "update done succefully",
        data: updateOrganization,
      };
    } catch (error) {
      console.error(error);
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
}
