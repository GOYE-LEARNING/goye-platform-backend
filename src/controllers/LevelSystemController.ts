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
import { GrowthServive } from "../services/growthService";

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

      //Now let the user start his journey
      const startJourney = await prisma.progress.create({
        data: {
          userId,
          startedJourney: true,
          progressBar: 0,
          badges_and_levels: {
            create: {
              level: "LEVEL1_SEEKER",
            },
          },
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

      //Let drop a message for achiement
      const startAchiementMessage = GrowthServive.AchivementMessage({
        message_title: "Christian Cadet",
        message_content: `${startJourney.user.first_name} you just joined the rest of the soldiers to join the army`,
        point: 10,
        progress_message: "",
        userId,
      });

      const achiementData = (await startAchiementMessage).data

      this.setStatus(200);
      return {
        message: "Journey created successfully",
        data: startJourney,
        achivementMessage: achiementData,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "An error occured while starting your journey",
        error: error,
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
