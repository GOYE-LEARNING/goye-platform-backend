import { Body, Controller, Get, Path, Post, Route, Security, Tags } from "tsoa";
import { OrganizationDTO } from "../interface/interfaces";
import prisma from "../db";
import bcrypt from "bcryptjs";

@Route("organizations")
@Tags("Organization Controllers")
export class OrganizationController extends Controller {
  @Security("bearerAuth")
  @Post("/create-organization")
  public async CreateOrganization(@Body() body: OrganizationDTO): Promise<any> {
    const hashedPassword = await bcrypt.hash(body.user_password, 10);
    try {
      const createOrganization = await prisma.organization.create({
        data: {
          organization_name: body.organization_name,
          organization_email: body.organization_email,
          organization_description: body.organzation_description,
          organization_country: body.organization_country,
          organization_state: body.organization_state,
          organization_phone_number: body.organization_phone_number,
          organization_year: body.organization_year,
          organization_type: body.organization_type as any,
          Church: {
            create: {
              church_min_name: body.church.church_ministry_name,
              church_ld_pastor: body.church.church_lead_pastor,
              church_role: body.church.church_leadership_role,
              church_address: body.church.churh_address,
              church_logo: body.church.church_logo,
              church_website: body.church.church_website,
              church_weekly_service: body.church.church_weekly_service,
            },
          },
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
              school_email_domain: body.school.school_email_domain,
              school_website: body.school.school_website,
            },
          },
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
          user: {
            create: {
              first_name: body.user_first_name,
              last_name: body.user_last_name,
              email_address: body.user_email_address,
              country: body.user_country,
              state: body.user_state,
              phone_number: body.user_phone_number,
              password: hashedPassword,
              role: body.user_role,
              form_type: body.user_form_type as any,
              level: "ORGANIZATION",
            },
          },
        },
      });

      return {
        message: "Perfecto organization created successfully.",
        data: createOrganization,
      };
    } catch (error: any) {
      console.error(error);
      return {
        message: "Error created successfully.",
        error: error.message,
      };
    }
  }

  @Get("/fetch-organizations")
  public async FetchOrganization() {}

  @Get("/fetch-specific-organization/{id}")
  public async FetchSpecificOrganization(@Path() id: string) {}
}
