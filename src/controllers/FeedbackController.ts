// feedback.controller.ts
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
    @Body() body: { message: string, type: FeedbackType },
    @Request() req: any,
  ) {
    try {
      // ✅ Get userId from multiple sources
      const userId = req.user?.id || req.decoded?.id || req.body?.userId;
      
      console.log("🔍 Feedback request:", {
        hasUser: !!req.user,
        hasDecoded: !!req.decoded,
        userId: userId,
        userRole: req.user?.role,
        path: req.path
      });

      if (!userId) {
        console.error("❌ No userId found in request:", {
          user: req.user,
          decoded: req.decoded,
          body: req.body
        });
        this.setStatus(401);
        return {
          success: false,
          message: "Authentication required. Please log in.",
        };
      }

      if (!body.message?.trim()) {
        this.setStatus(400);
        return { 
          success: false,
          message: "Feedback message is required" 
        };
      }

      // ✅ Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email_address: true, role: true }
      });

      if (!user) {
        console.error("❌ User not found:", userId);
        this.setStatus(404);
        return {
          success: false,
          message: "User not found",
        };
      }

      console.log(`✅ Creating feedback for user: ${user.email_address}`);

      // ✅ Create feedback
      const feedback = await prisma.feedback.create({
        data: {
          message: body.message.trim(),
          type: body.type,
          userId: user.id,
        },
      });

      console.log(`✅ Feedback created: ${feedback.id}`);

      this.setStatus(200);
      return {
        success: true,
        message: "Feedback sent successfully",
        data: feedback,
      };
    } catch (error: any) {
      console.error("[Feedback] submit error:", error.message);
      this.setStatus(500);
      return { 
        success: false,
        message: "Failed to send feedback. Please try again later." 
      };
    }
  }

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