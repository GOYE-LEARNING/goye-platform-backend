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
import {
  ActionType,
  GamificationService,
} from "../services/gamificationService";

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
    const progressId = req.progressId;
    const userId = req.user?.id;
    
    try {
      // Check if course exists
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

      // Check if lesson exists
      const lesson = await prisma.lesson.findUnique({
        where: {
          id: body.lessonId,
        },
        include: {
          module: true,
        },
      });

      if (!lesson) {
        this.setStatus(404);
        return {
          message: "This lesson cannot be found.",
        };
      }

      // Check if user is enrolled
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId,
          courseId: body.courseId,
        },
      });

      if (!enrollment) {
        this.setStatus(403);
        return {
          message: "You must be enrolled in this course to track videos.",
        };
      }

      // Check if video is already completed
      const existingTracker = await prisma.videoTracker.findFirst({
        where: {
          lessonId: body.lessonId,
          progressId: progressId,
          videoFinished: true,
        },
      });

      if (existingTracker) {
        return {
          message: "Video already completed",
          data: existingTracker,
        };
      }

      // Create video tracker
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

      let gamificationResult = null;

      // If video is finished, award XP for lesson completion
      if (body.videoFinished) {
        // Check if lesson is already completed in progress
        const existingProgress = await prisma.progress.findFirst({
          where: {
            userId,
            lessonId: body.lessonId,
            progressBar: { gte: 100 },
          },
        });

        if (!existingProgress) {
          // Create or update progress for this lesson
          const progress = await prisma.progress.upsert({
            where: {
              id: progressId || "",
            },
            update: {
              progressBar: { increment: 100 },
              updatedAt: new Date(),
            },
            create: {
              userId,
              lessonId: body.lessonId,
              courses: {
                connect: { id: body.courseId },
              },
              progressBar: 100,
              startedJourney: true,
            },
          });

          // Award XP for completing the lesson
          gamificationResult = await GamificationService.AddPointsWithGamification(
            userId,
            ActionType.LESSON_COMPLETE,
            { courseId: body.courseId, lessonId: body.lessonId }
          );

          // Check if all lessons in the course are completed
          const courseModules = await prisma.module.findMany({
            where: { courseId: body.courseId },
            include: { lesson: true },
          });

          const allLessons = courseModules.flatMap((m) => m.lesson);
          const completedLessons = await prisma.progress.findMany({
            where: {
              userId,
              lessonId: { in: allLessons.map((l) => l.id) },
              progressBar: { gte: 100 },
            },
            select: { lessonId: true },
          });

          // If all lessons are completed and user hasn't completed course yet
          if (
            completedLessons.length === allLessons.length &&
            enrollment.status !== "COMPLETED"
          ) {
            await GamificationService.AddPointsWithGamification(
              userId,
              ActionType.COURSE_COMPLETE,
              { courseId: body.courseId }
            );

            await prisma.enrollment.update({
              where: { id: enrollment.id },
              data: {
                status: "COMPLETED",
                completedAt: new Date(),
              },
            });
          }
        }
      }

      this.setStatus(201);
      return {
        message: body.videoFinished ? "Video completed! Lesson XP awarded!" : "Video tracked",
        data: setVideoTracker,
        gamification: gamificationResult ? {
          pointsEarned: gamificationResult.data?.pointsAdded,
          leveledUp: gamificationResult.data?.leveledUp,
          newLevel: gamificationResult.data?.newLevel,
          badgesEarned: gamificationResult.data?.badgesEarned,
        } : null,
      };
    } catch (error) {
      console.error("Error in TrackVideo:", error);
      this.setStatus(500);
      return {
        message: "An error occurred with tracking of the video",
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
    @Request() req: any
  ) {
    const userId = req.user?.id;
    const progressId = req.progressId;

    try {
      // Check if the video tracker exists
      const existingVideo = await prisma.videoTracker.findUnique({
        where: {
          id: videoTrackerId,
        },
        include: {
          lesson: true,
          course: true,
        },
      });

      if (!existingVideo) {
        this.setStatus(404);
        return {
          message: "This video cannot be found.",
        };
      }

      // Check if video is already finished
      if (existingVideo.videoFinished) {
        return {
          message: "Video already completed",
          data: existingVideo,
        };
      }

      // Update the video tracker
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

      let gamificationResult = null;

      // If video is now finished, award XP for lesson completion
      if (body.videoFinished && !existingVideo.videoFinished) {
        // Check if lesson is already completed in progress
        const existingProgress = await prisma.progress.findFirst({
          where: {
            userId,
            lessonId: existingVideo.lessonId,
            progressBar: { gte: 100 },
          },
        });

        if (!existingProgress) {
          // Create or update progress for this lesson
          const progress = await prisma.progress.upsert({
            where: {
              id: progressId || "",
            },
            update: {
              progressBar: { increment: 100 },
              updatedAt: new Date(),
            },
            create: {
              userId,
              lessonId: existingVideo.lessonId,
              courses: {
                connect: { id: existingVideo.courseId },
              },
              progressBar: 100,
              startedJourney: true,
            },
          });

          // Award XP for completing the lesson
          gamificationResult = await GamificationService.AddPointsWithGamification(
            userId,
            ActionType.LESSON_COMPLETE,
            { 
              courseId: existingVideo.courseId, 
              lessonId: existingVideo.lessonId 
            }
          );

          // Check enrollment status
          const enrollment = await prisma.enrollment.findFirst({
            where: {
              userId,
              courseId: existingVideo.courseId,
            },
          });

          // Check if all lessons in the course are completed
          const courseModules = await prisma.module.findMany({
            where: { courseId: existingVideo.courseId },
            include: { lesson: true },
          });

          const allLessons = courseModules.flatMap((m) => m.lesson);
          const completedLessons = await prisma.progress.findMany({
            where: {
              userId,
              lessonId: { in: allLessons.map((l) => l.id) },
              progressBar: { gte: 100 },
            },
            select: { lessonId: true },
          });

          // If all lessons are completed and user hasn't completed course yet
          if (
            completedLessons.length === allLessons.length &&
            enrollment &&
            enrollment.status !== "COMPLETED"
          ) {
            await GamificationService.AddPointsWithGamification(
              userId,
              ActionType.COURSE_COMPLETE,
              { courseId: existingVideo.courseId }
            );

            await prisma.enrollment.update({
              where: { id: enrollment.id },
              data: {
                status: "COMPLETED",
                completedAt: new Date(),
              },
            });
          }
        }
      }

      this.setStatus(200);
      return {
        message: body.videoFinished 
          ? "Video completed! Lesson XP awarded!" 
          : "Video tracked updated successfully",
        data: updatedVideoTracker,
        gamification: gamificationResult ? {
          pointsEarned: gamificationResult.data?.pointsAdded,
          leveledUp: gamificationResult.data?.leveledUp,
          newLevel: gamificationResult.data?.newLevel,
          badgesEarned: gamificationResult.data?.badgesEarned,
        } : null,
      };
    } catch (error) {
      console.error("Error in UpdateTrackVideo:", error);
      this.setStatus(500);
      return {
        message: "An error occurred with tracking of the video",
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
        include: {
          lesson: true,
          course: true,
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
        message: "An error just occurred here.",
      };
    }
  }

  @Get("/get-tracker-id/{lessonId}")
  @Security("bearerAuth")
  public async GetTrackerId(
    @Path() lessonId: string,
    @Request() req: any
  ) {
    const progressId = req.progressId;
    
    try {
      const tracker = await prisma.videoTracker.findFirst({
        where: {
          lessonId: lessonId,
          progressId: progressId,
        },
        orderBy: {
          updatedAt: 'desc'
        },
        include: {
          lesson: true,
        },
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