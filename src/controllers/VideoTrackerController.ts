import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Put,
  Route,
  Security,
  Tags,
} from "tsoa";
import prisma from "../db";

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
      progressId: string;
    },
  ) {
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
                id: body.progressId,
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
      //check if course exist
      const video = await prisma.videoTracker.findUnique({
        where: {
          id: videoTrackerId,
        },
      });

      if (!video) {
        this.setStatus(404);
        return {
          message: "This video cannot be found.",
        };
      }

      if (body.videoTrackTime) {
        const setVideoTracker = await prisma.videoTracker.create({
          data: {
            videoFinished: body.videoFinished,
            videoTrackTime: body.videoTrackTime,
            basedTimeTracking: "SECOND_TIME_TRACKING",
          },
        });

        this.setStatus(200);
        return {
          message: "Video tracked updated successfully",
          data: setVideoTracker,
        };
      }

      return {
        message: "An error occured",
      };
    } catch (error) {
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
      this.setStatus(500);
      return {
        message: "An error just occured here.",
      };
    }
  }

  // Add this single endpoint to your backend
@Get("/get-tracker-id/{lessonId}/{progressId}")
@Security("bearerAuth")
public async GetTrackerId(
  @Path() lessonId: string,
  @Path() progressId: string
) {
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
    this.setStatus(500);
    return {
      message: "Error finding tracker"
    };
  }
}
}
