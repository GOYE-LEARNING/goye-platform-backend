import {
  Controller,
  Get,
  Path,
  Post,
  Request,
  Route,
  Security,
  Tags,
} from "tsoa";
import prisma from "../db";
import { GrowthService } from "../services/growthService";

@Tags("Levels and Badges Controller")
@Route("growth")
export class LevelSystem extends Controller {
  @Security("bearerAuth")
  @Post("/start-journey")
  public async StartJourney(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    try {
      if (!userId) {
        this.setStatus(401);
        return {
          message: "User Not authorized.",
        };
      }

      // Now let the user start his journey
      const startJourney = await prisma.progress.create({
        data: {
          userId,
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
        userId,
        badge: "CADET_BADGE",
        progressId: startJourney.id,
      });

      // Check if achievement was created successfully
      if (achievementResult.error) {
        console.error("Achievement creation failed:", achievementResult.error);
        // Still return success for journey but with achievement error
        this.setStatus(200);
        return {
          message:
            "Journey created successfully, but achievement creation failed",
          data: startJourney,
          achievementError: achievementResult.error,
        };
      }

      this.setStatus(200);
      return {
        message: "Journey created successfully",
        data: startJourney,
        achievementMessage: achievementResult.data || achievementResult,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "An error occurred while starting your journey",
        error: error instanceof Error ? error.message : error,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/check-journey-status/{progressId}")
  public async CheckJourneyStatus(
    @Request() req: any,
    @Path() progressId: string,
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      if (!userId) {
        this.setStatus(401);
        return {
          message: "User Not authorized.",
        };
      }

      const checkJourney = await prisma.progress.findUnique({
        where: {
          id: progressId,
          userId,
        },
      });

      this.setStatus(200);
      return {
        message: "Status Fetched Successfully",
        user: checkJourney,
        satus: checkJourney.startedJourney,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "An error occured while fetching the status",
      };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-achivement")
  public async FetchAchivement(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    try {
      if (!userId) {
        this.setStatus(401);
        return {
          message: "User is unathorizeed",
        };
      }

      const achivement = await prisma.achievement.findMany({
        where: {
          userId,
        },
        include: {
          badge: true,
          badges_and_levels: true,
          progress: true,
        },
      });

      this.setStatus(200);
      return {
        message: "Fetched successfully",
        data: achivement
      };
    } catch (error) {
      this.setStatus(500);
      console.error(error);
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-growth-user/{progressId}")
  public async FetchGrowth(
    @Request() req: any,
    @Path() progressId: string,
  ): Promise<any> {
    const userId = req.user?.id;
    try {
      if (!userId) {
        this.setStatus(401);
        return {
          message: "User Not authorized.",
        };
      }

      const fetchGrowth = await prisma.progress.findUnique({
        where: {
          id: progressId,
          userId,
        },

        include: {
          badges_and_levels: {
            select: {
              badges: true,
            },
          },
        },
      });

      const growth = [];
      const badgesLength = fetchGrowth.badges_and_levels.map(
        (b) => b.badges.length,
      );
      const data = growth.push({
        achivement: 0,
        certificate: 0,
        badges: badgesLength,
      });

      this.setStatus(200);
      return {
        message: "Fetched Successfuly",
        data: data,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "An error occured while fetching user spiritual growth",
        error: error,
      };
    }
  }
}
