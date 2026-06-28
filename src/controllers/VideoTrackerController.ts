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
    const userId = req.user?.id;

    try {
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: body.courseId },
      });

      if (!course) {
        this.setStatus(404);
        return { message: "This course cannot be found." };
      }

      // Check if lesson exists
      const lesson = await prisma.lesson.findUnique({
        where: { id: body.lessonId },
        include: { module: true },
      });

      if (!lesson) {
        this.setStatus(404);
        return { message: "This lesson cannot be found." };
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
        return { message: "You must be enrolled in this course to track videos." };
      }

      // Get or create progress record
      let progress = await prisma.progress.findFirst({
        where: { userId },
      });

      if (!progress) {
        progress = await prisma.progress.create({
          data: {
            userId,
            startedJourney: true,
            progressBar: 0,
          },
        });
      }

      // ── Upsert video tracker with P2002 fallback ───────────────────────────
      // The frontend in-flight guard reduces the chance of a race, but under
      // concurrent requests (e.g. onPause firing while onTimeUpdate is still
      // in-flight) two POSTs can still race to the DB simultaneously.
      // If the upsert loses the race (P2002 unique violation on lessonId +
      // progressId), we fall back to a plain update on the existing row.
      let setVideoTracker;
      try {
        setVideoTracker = await prisma.videoTracker.upsert({
          where: {
            lessonId_progressId: {
              lessonId: body.lessonId,
              progressId: progress.id,
            },
          },
          update: {
            videoTrackTime: body.videoTrackTime,
            videoFinished: body.videoFinished,
            basedTimeTracking: "SECOND_TIME_TRACKING",
            updatedAt: new Date(),
          },
          create: {
            videoFinished: body.videoFinished,
            videoTrackTime: body.videoTrackTime,
            basedTimeTracking: "FIRST_TIME_TRACKING",
            progress: { connect: { id: progress.id } },
            course: { connect: { id: body.courseId } },
            lesson: { connect: { id: body.lessonId } },
          },
        });
      } catch (e: any) {
        if (e.code === "P2002") {
          // Another concurrent request already created the row — update it
          setVideoTracker = await prisma.videoTracker.update({
            where: {
              lessonId_progressId: {
                lessonId: body.lessonId,
                progressId: progress.id,
              },
            },
            data: {
              videoTrackTime: body.videoTrackTime,
              videoFinished: body.videoFinished,
              basedTimeTracking: "SECOND_TIME_TRACKING",
              updatedAt: new Date(),
            },
          });
        } else {
          throw e;
        }
      }
      // ──────────────────────────────────────────────────────────────────────

      let gamificationResult = null;

      // If video is finished, award XP for lesson completion
      if (body.videoFinished) {
        // Check if lesson is already completed using unique constraint
        const existingLessonProgress = await prisma.progress.findFirst({
          where: {
            userId,
            lessonId: body.lessonId,
            progressBar: { gte: 100 },
          },
        });

        if (!existingLessonProgress) {
          // Use upsert for lesson progress to prevent duplicates
          await prisma.progress.upsert({
            where: {
              userId_lessonId: {
                userId: userId,
                lessonId: body.lessonId,
              },
            },
            update: {
              progressBar: 100,
              updatedAt: new Date(),
            },
            create: {
              userId,
              lessonId: body.lessonId,
              courses: { connect: { id: body.courseId } },
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

          // Use distinct count for completed lessons
          const completedLessonsCount = await prisma.progress.groupBy({
            by: ["lessonId"],
            where: {
              userId,
              lesson: { module: { courseId: body.courseId } },
              progressBar: { gte: 100 },
            },
          });

          const totalLessonsCount = await prisma.lesson.count({
            where: { module: { courseId: body.courseId } },
          });

          // If all lessons are completed and user hasn't completed course yet
          if (
            completedLessonsCount.length === totalLessonsCount &&
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
        message: body.videoFinished
          ? "Video completed! Lesson XP awarded!"
          : "Video tracked",
        data: setVideoTracker,
        gamification: gamificationResult
          ? {
              pointsEarned: gamificationResult.data?.pointsAdded,
              leveledUp: gamificationResult.data?.leveledUp,
              newLevel: gamificationResult.data?.newLevel,
              badgesEarned: gamificationResult.data?.badgesEarned,
            }
          : null,
      };
    } catch (error) {
      console.error("Error in TrackVideo:", error);
      this.setStatus(500);
      return {
        message: "An error occurred with tracking of the video",
        error: error instanceof Error ? error.message : String(error),
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
        return { message: "This video cannot be found." };
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
        // Get or create progress record
        let progress = await prisma.progress.findFirst({
          where: { userId },
        });

        if (!progress) {
          progress = await prisma.progress.create({
            data: {
              userId,
              startedJourney: true,
              progressBar: 0,
            },
          });
        }

        // Check if lesson is already completed using unique constraint
        const existingLessonProgress = await prisma.progress.findFirst({
          where: {
            userId,
            lessonId: existingVideo.lessonId,
            progressBar: { gte: 100 },
          },
        });

        if (!existingLessonProgress) {
          // Use upsert for lesson progress
          await prisma.progress.upsert({
            where: {
              userId_lessonId: {
                userId: userId,
                lessonId: existingVideo.lessonId,
              },
            },
            update: {
              progressBar: 100,
              updatedAt: new Date(),
            },
            create: {
              userId,
              lessonId: existingVideo.lessonId,
              courses: { connect: { id: existingVideo.courseId } },
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
              lessonId: existingVideo.lessonId,
            }
          );

          // Check enrollment status
          const enrollment = await prisma.enrollment.findFirst({
            where: {
              userId,
              courseId: existingVideo.courseId,
            },
          });

          // Use distinct count for completed lessons
          const completedLessonsCount = await prisma.progress.groupBy({
            by: ["lessonId"],
            where: {
              userId,
              lesson: { module: { courseId: existingVideo.courseId } },
              progressBar: { gte: 100 },
            },
          });

          const totalLessonsCount = await prisma.lesson.count({
            where: { module: { courseId: existingVideo.courseId } },
          });

          // If all lessons are completed and user hasn't completed course yet
          if (
            completedLessonsCount.length === totalLessonsCount &&
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
        gamification: gamificationResult
          ? {
              pointsEarned: gamificationResult.data?.pointsAdded,
              leveledUp: gamificationResult.data?.leveledUp,
              newLevel: gamificationResult.data?.newLevel,
              badgesEarned: gamificationResult.data?.badgesEarned,
            }
          : null,
      };
    } catch (error) {
      console.error("Error in UpdateTrackVideo:", error);
      this.setStatus(500);
      return {
        message: "An error occurred with tracking of the video",
        error: error instanceof Error ? error.message : String(error),
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
  public async GetTrackerId(@Path() lessonId: string, @Request() req: any) {
    const userId = req.user?.id;

    try {
      // Find progress by userId
      const progress = await prisma.progress.findFirst({
        where: { userId },
      });

      if (!progress) {
        return {
          message: "No progress found for user",
          data: null,
        };
      }

      const tracker = await prisma.videoTracker.findFirst({
        where: {
          lessonId: lessonId,
          progressId: progress.id,
        },
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          lesson: true,
        },
      });

      return {
        message: tracker ? "Tracker found" : "No tracker found",
        data: tracker,
      };
    } catch (error) {
      console.error("Error in GetTrackerId:", error);
      this.setStatus(500);
      return {
        message: "Error finding tracker",
      };
    }
  }
}