import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Put,
  Request,
  Route,
  Security,
  Tags,
} from "tsoa";
import prisma from "../db";
import { Request as ExpressRequest } from "express";

@Tags("Video Tracking Controller")
@Route("video")
export class VideoTrackerController extends Controller {
  @Post("/track-video")
  @Security("bearerAuth")
  public async TrackVideo(
    @Body()
    body: {
      videoTrackTime: number;
      videoFinished: boolean;
      lessonId: string;
      courseId: string;
    },
    @Request() req: any
  ) {
    const progressId = req.progressId
    try {
      //check if course exist
      const course = await prisma.course.findUnique({
        where: {
          id: body.courseId,
        },
      });

      if (!course) {
        this.setStatus(404);
        return {
          message: "This course cannot be found.",
        };
      }

      if (body.videoTrackTime) {
        const setVideoTracker = await prisma.videoTracker.create({
          data: {
            videoFinished: body.videoFinished,
            videoTrackTime: body.videoTrackTime,
            basedTimeTracking: "FIRST_TIME_TRACKING",
            progress: {
              connect: {
                id: progressId,
              },
            },
            course: {
              connect: {
                id: body.courseId,
              },
            },
            lesson: {
              connect: {
                id: body.lessonId,
              },
            },
          },
        });

        this.setStatus(201);
        return {
          message: "Video tracked",
          data: setVideoTracker,
        };
      }

      return {
        message: "An error occured",
      };
    } catch (error) {
      console.error("Error in TrackVideo:", error);
      this.setStatus(500);
      return {
        message: "An error occured with tracking of the video",
      };
    }
  }

  @Put("/update-track-video/{videoTrackerId}")
  @Security("bearerAuth")
  public async UpdateTrackVideo(
    @Path() videoTrackerId: string,
    @Body()
    body: {
      videoTrackTime: number;
      videoFinished: boolean;
    },
  ) {
    try {
      // Check if the video tracker exists
      const existingVideo = await prisma.videoTracker.findUnique({
        where: {
          id: videoTrackerId,
        },
      });

      if (!existingVideo) {
        this.setStatus(404);
        return {
          message: "This video cannot be found.",
        };
      }

      if (body.videoTrackTime) {
        // OPTION 1: Update the existing record (recommended)
        const updatedVideoTracker = await prisma.videoTracker.update({
          where: {
            id: videoTrackerId,
          },
          data: {
            videoTrackTime: body.videoTrackTime,
            videoFinished: body.videoFinished,
            basedTimeTracking: "SECOND_TIME_TRACKING",
          },
        });

        this.setStatus(200);
        return {
          message: "Video tracked updated successfully",
          data: updatedVideoTracker,
        };

      }

      return {
        message: "An error occured",
      };
    } catch (error) {
      console.error("Error in UpdateTrackVideo:", error);
      this.setStatus(500);
      return {
        message: "An error occured with tracking of the video",
      };
    }
  }

  @Get("/fetch-track-video/{videoTrackerId}")
  public async FetchVideoTracking(@Path() videoTrackerId: string) {
    try {
      const videoTracker = await prisma.videoTracker.findUnique({
        where: {
          id: videoTrackerId,
        },
      });

      this.setStatus(200);

      return {
        message: "Your videos are here.",
        data: videoTracker,
      };
    } catch (error) {
      console.error("Error in FetchVideoTracking:", error);
      this.setStatus(500);
      return {
        message: "An error just occured here.",
      };
    }
  }

  @Get("/get-tracker-id/{lessonId}")
  @Security("bearerAuth")
  public async GetTrackerId(
    @Path() lessonId: string,
    @Request() req: any
  ) {

    const progressId = req.progressId
    try {
      const tracker = await prisma.videoTracker.findFirst({
        where: {
          lessonId: lessonId,
          progressId: progressId,
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      return {
        message: tracker ? "Tracker found" : "No tracker found",
        data: tracker
      };
    } catch (error) {
      console.error("Error in GetTrackerId:", error);
      this.setStatus(500);
      return {
        message: "Error finding tracker"
      };
    }
  }

  
}