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
  @Security("bearerAuth")
  @Post("/feedback")
  public async Feedback(
    @Body() body: { message: string, type: FeedbackType},
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    const orgId = req.org?.id;
    try {
      if (!userId || !orgId) {
        this.setStatus(401);
        return {
          message: "This party is unauthorized",
        };
      }
      await prisma.feedback.create({
        data: {
          message: body.message,
          type: body.type,
          ...(userId && { userId }),
          ...(orgId && { organizationId: orgId }),
        },
      });

      return {
        message: "Feedback sent successfully",
      };
    } catch (error) {
      this.setStatus(500);
      console.error(error.message);
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-feedbacks")
  public async FetchFeedback(@Request() req: any) {
    const userId = req.user?.id;
    const orgId = req.org?.id;

    try {
      if (!userId || !orgId) {
        this.setStatus(401);
        return {
          message: "This party is unauthorized",
        };
      }

      const feedBacks = await prisma.feedback.findMany({
        include: {
          user: true,
          organization: true,
        },
      });

      return {
        message: "Fetched successfully",
        data: feedBacks,
      };
    } catch (error) {
      this.setStatus(500);
      console.error(error.message);
    }
  }

}
