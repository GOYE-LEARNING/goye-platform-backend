import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Route,
  Security,
  Tags,
} from "tsoa";
import prisma from "../db";
import { FeedbackType } from "@prisma/client";

@Tags("Feed back Controller")
@Route("feedback")
export class FeedbackController extends Controller {
  // Every endpoint here spans multiple users, so access is restricted to
  // platform admins — mirrors SuperAdminController.requireSuperAdmin, kept
  // local since this controller doesn't otherwise need that whole class.
  private async requireAdmin(req: any): Promise<boolean> {
    if (!req.user || req.user.role !== "goye_admin") {
      this.setStatus(403);
      return false;
    }
    return true;
  }

  @Security("bearerAuth")
  @Post("/feedback")
  public async Feedback(
    @Body() body: { message: string, type: FeedbackType},
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    const orgId = req.org?.id;
    try {
      // Only userId is actually required — req.org is only ever populated
      // for organization-context requests, so requiring BOTH meant a plain
      // individual student or tutor (the overwhelming majority of users)
      // could never submit feedback at all: this always 401'd for them.
      if (!userId) {
        this.setStatus(401);
        return {
          message: "This party is unauthorized",
        };
      }
      if (!body.message?.trim()) {
        this.setStatus(400);
        return { message: "Feedback message is required" };
      }
      await prisma.feedback.create({
        data: {
          message: body.message.trim(),
          type: body.type,
          userId,
          ...(orgId && { organizationId: orgId }),
        },
      });

      this.setStatus(200);
      return {
        message: "Feedback sent successfully",
      };
    } catch (error: any) {
      this.setStatus(500);
      console.error("[Feedback] submit error:", error.message);
      return { message: "Failed to send feedback" };
    }
  }

  // Platform-admin only — this used to only check the caller was logged in
  // (with an org context), meaning any authenticated org member could read
  // every user's feedback across the entire platform.
  @Security("bearerAuth")
  @Get("/fetch-feedbacks")
  public async FetchFeedback(@Request() req: any) {
    if (!(await this.requireAdmin(req))) {
      return { message: "Admin access required" };
    }

    try {
      const feedBacks = await prisma.feedback.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, email_address: true, role: true } },
          organization: { select: { id: true, organization_name: true } },
        },
      });

      this.setStatus(200);
      return {
        message: "Fetched successfully",
        data: feedBacks,
      };
    } catch (error: any) {
      this.setStatus(500);
      console.error("[Feedback] fetch error:", error.message);
      return { message: "Failed to fetch feedback" };
    }
  }

}
