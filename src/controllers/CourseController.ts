import {
  Route,
  Controller,
  Tags,
  Get,
  Post,
  Path,
  Body,
  Put,
  Security,
  Request,
  Delete,
  UploadedFile,
} from "tsoa";
import prisma from "../db";
import { CourseResponse, Module } from "../interface/interfaces";
import {
  CreateCourseDTO,
  UpdateCourseWithRelationsDTO,
} from "../dto/course.dto";
import { MediaService } from "../services/mediaServices";
import {
  ActionType,
  GamificationService,
} from "../services/gamificationService";
import { Limitations } from "../utils/functionLimitations";
import { NotificationService, Role } from "../services/notificationServices";

//To determine levels
const levels: Record<string, string> = {
  beginner: "Beginner",
  Beginner: "Beginner",
  intermediate: "Intermediate",
  Intermediate: "Intermediate",
};

@Route("course")
@Tags("Course Control APIs")
export class CourseController extends Controller {
  //create Course

  @Security("bearerAuth")
  @Post("/create-course")
  public async CreateCourse(
    @Body() body: CreateCourseDTO,
    @Request() req: any,
  ): Promise<CourseResponse> {
    const tutorId = req.user?.id;
    const planId = req.user?.planId;
    const orgId = req.org?.id;
    const orgName = req.org?.organization_name;

    try {
      // Use organizationId if exists, otherwise use createdUserId
      Limitations(planId, tutorId, orgId);

      // Fetch the tutor's name from the database using their ID
      const tutor = await prisma.user.findUnique({
        where: { id: tutorId },
        select: {
          first_name: true,
          last_name: true,
          email_address: true,
        },
      });

      if (!tutor) {
        this.setStatus(404);
        return {
          message: "Tutor not found",
          data: null,
        };
      }

      // Construct the full name from first_name and last_name
      const tutorFullName = `${tutor.first_name} ${tutor.last_name}`.trim();
      const tutorName =
        tutorFullName || tutor.email_address || "Unknown Instructor";

      console.log("📝 Creating course with tutor:", {
        id: tutorId,
        name: tutorName,
        email: tutor.email_address,
      });

      const course = await prisma.course.create({
        data: {
          organizationId: orgId ?? null,
          organizationName: orgId ? orgName : null,
          createdBy: tutorName,
          createdUserId: tutorId,
          course_title: body.course_title,
          course_short_description: body.course_short_description,
          course_description: body.course_description,
          course_level: levels[body.course_level],
          course_image: body.course_image,

          // Handle modules with lessons
          ...(body.module && {
            module: {
              create: body.module.map((module, index) => ({
                module_title: module.module_title,
                module_description: module.module_description,
                module_duration: module.module_duration,
                order: module.order || index,
                ...(module.lessons && {
                  lesson: {
                    create: module.lessons.map((lesson, lessonIndex) => ({
                      lesson_title: lesson.lesson_title,
                      lesson_video: lesson.lesson_video,
                      order: lesson.order || lessonIndex,
                      duration: lesson.duration,
                    })),
                  },
                }),
              })),
            },
          }),

          // Handle materials
          ...(body.material && {
            material: {
              create: body.material.map((material) => ({
                material_title: material.material_title,
                material_description: material.material_description,
                material_pages: material.material_pages,
                material_document: material.material_document,
              })),
            },
          }),

          // Handle objectives
          ...(body.objectives && {
            objectives: {
              create: body.objectives.map((objective) => ({
                objective_title1: objective.objective_title1,
                objective_title2: objective.objective_title2,
                objective_title3: objective.objective_title3,
                objective_title4: objective.objective_title4,
                objective_title5: objective.objective_title5,
              })),
            },
          }),

          // Handle quizzes with questions
          ...(body.quiz && {
            quiz: {
              create: body.quiz.map((quiz) => ({
                title: quiz.title,
                description: quiz.description,
                duration: quiz.duration,
                passingScore: quiz.passingScore,
                maxAttempts: quiz.maxAttempts,
                ...(quiz.questions && {
                  questions: {
                    create: quiz.questions.map((question, qIndex) => ({
                      question: question.question,
                      options: question.options,
                      correctAnswer: question.correctAnswer,
                      explanation: question.explanation,
                      order: question.order || qIndex,
                    })),
                  },
                }),
              })),
            },
          }),
        },
        include: {
          module: {
            include: {
              lesson: true,
            },
            orderBy: {
              order: "asc",
            },
          },
          material: true,
          objectives: true,
          quiz: {
            include: {
              questions: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      });

      await NotificationService.createSystemAnnouncement(
        `${course.course_title}`,
        "Course Update",
        Role.STUDENT,
        "course",
      );

      this.setStatus(201);
      return {
        message: "Course created successfully",
        data: course,
      };
    } catch (error: any) {
      console.error("❌ Error creating course:", error);
      this.setStatus(500);
      return {
        message: "Error creating course: " + error.message,
        data: null,
      };
    }
  }

  @Security("bearerAuth")
  @Put("/update-course/{courseId}")
  public async UpdateCourse(
    @Path() courseId: string,
    @Body() body: UpdateCourseWithRelationsDTO,
  ): Promise<CourseResponse> {
    try {
      // First, check if course exists
      const existingCourse = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          module: {
            include: {
              lesson: true,
            },
          },
          material: true,
          objectives: true,
          quiz: {
            include: {
              questions: true,
            },
          },
        },
      });

      if (!existingCourse) {
        this.setStatus(404);
        return {
          message: "Course not found",
          data: null,
        };
      }

      // Update course fields
      await prisma.course.update({
        where: { id: courseId },
        data: {
          ...(body.course_title && { course_title: body.course_title }),
          ...(body.course_short_description && {
            course_short_description: body.course_short_description,
          }),
          ...(body.course_description && {
            course_description: body.course_description,
          }),
          ...(body.course_level && { course_level: levels[body.course_level] }),
          ...(body.course_image && { course_image: body.course_image }),
        },
      });

      // Handle modules update
      if (body.modules) {
        // Get existing module IDs for this course
        const existingModuleIds = existingCourse.module.map((m) => m.id);

        for (const moduleData of body.modules) {
          if (moduleData.id && existingModuleIds.includes(moduleData.id)) {
            // Update existing module
            await prisma.module.update({
              where: { id: moduleData.id },
              data: {
                ...(moduleData.module_title && {
                  module_title: moduleData.module_title,
                }),
                ...(moduleData.module_description && {
                  module_description: moduleData.module_description,
                }),
                ...(moduleData.module_duration && {
                  module_duration: moduleData.module_duration,
                }),
              },
            });

            // Handle lessons for this module
            if (moduleData.lessons) {
              // Get existing lesson IDs for this module
              const existingModule = existingCourse.module.find(
                (m) => m.id === moduleData.id,
              );
              const existingLessonIds =
                existingModule?.lesson.map((l) => l.id) || [];

              // Track processed lesson IDs
              const processedLessonIds = new Set();

              for (const lessonData of moduleData.lessons) {
                if (
                  lessonData.id &&
                  existingLessonIds.includes(lessonData.id)
                ) {
                  // Update existing lesson
                  await prisma.lesson.update({
                    where: { id: lessonData.id },
                    data: {
                      ...(lessonData.lesson_title && {
                        lesson_title: lessonData.lesson_title,
                      }),
                      ...(lessonData.lesson_video && {
                        lesson_video: lessonData.lesson_video,
                      }),
                    },
                  });
                  processedLessonIds.add(lessonData.id);
                } else {
                  // Create new lesson
                  await prisma.lesson.create({
                    data: {
                      lesson_title: lessonData.lesson_title || "",
                      lesson_video: lessonData.lesson_video || "",
                      moduleId: moduleData.id,
                      order: lessonData.order || 0,
                      duration: lessonData.duration || 0,
                    },
                  });
                }
              }

              // Delete lessons that were in the database but not in the update payload
              const lessonsToDelete = existingLessonIds.filter(
                (id) => !processedLessonIds.has(id),
              );
              if (lessonsToDelete.length > 0) {
                await prisma.lesson.deleteMany({
                  where: {
                    id: { in: lessonsToDelete },
                  },
                });
              }
            }
          } else {
            // Create new module with its lessons
            await prisma.module.create({
              data: {
                module_title: moduleData.module_title || "",
                module_description: moduleData.module_description || "",
                module_duration: moduleData.module_duration || "0",
                courseId: courseId,
                order: moduleData.order || 0,
                ...(moduleData.lessons && {
                  lesson: {
                    create: moduleData.lessons.map((lesson, index) => ({
                      lesson_title: lesson.lesson_title || "",
                      lesson_video: lesson.lesson_video || "",
                      order: lesson.order || index,
                      duration: lesson.duration || 0,
                    })),
                  },
                }),
              },
            });
          }
        }

        // Delete modules that were in the database but not in the update payload
        const updatedModuleIds = body.modules
          .filter((m) => m.id)
          .map((m) => m.id as string);

        const modulesToDelete = existingModuleIds.filter(
          (id) => !updatedModuleIds.includes(id),
        );
        if (modulesToDelete.length > 0) {
          await prisma.module.deleteMany({
            where: {
              id: { in: modulesToDelete },
            },
          });
        }
      }

      // Handle materials update (similar pattern)
      if (body.materials) {
        const existingMaterialIds = existingCourse.material.map((m) => m.id);
        const processedMaterialIds = new Set();

        for (const materialData of body.materials) {
          if (
            materialData.id &&
            existingMaterialIds.includes(materialData.id)
          ) {
            // Update existing material
            await prisma.material.update({
              where: { id: materialData.id },
              data: {
                ...(materialData.material_title && {
                  material_title: materialData.material_title,
                }),
                ...(materialData.material_description && {
                  material_description: materialData.material_description,
                }),
                ...(materialData.material_pages && {
                  material_pages: materialData.material_pages,
                }),
                ...(materialData.material_document && {
                  material_document: materialData.material_document,
                }),
              },
            });
            processedMaterialIds.add(materialData.id);
          } else {
            // Create new material
            await prisma.material.create({
              data: {
                material_title: materialData.material_title || "",
                material_description: materialData.material_description || "",
                material_pages: materialData.material_pages || 0,
                material_document: materialData.material_document || "",
                courseId: courseId,
              },
            });
          }
        }

        // Delete materials not in update
        const materialsToDelete = existingMaterialIds.filter(
          (id) => !processedMaterialIds.has(id),
        );
        if (materialsToDelete.length > 0) {
          await prisma.material.deleteMany({
            where: {
              id: { in: materialsToDelete },
            },
          });
        }
      }

      // Handle objectives update (similar pattern)
      if (body.objectives) {
        // For simplicity, assuming you want to replace objectives
        await prisma.objectives.deleteMany({
          where: { courseId: courseId },
        });

        if (body.objectives.length > 0) {
          await prisma.objectives.createMany({
            data: body.objectives.map((obj) => ({
              objective_title1: obj.objective_title1 || "",
              objective_title2: obj.objective_title2 || "",
              objective_title3: obj.objective_title3 || "",
              objective_title4: obj.objective_title4 || "",
              objective_title5: obj.objective_title5 || "",
              courseId: courseId,
            })),
          });
        }
      }

      // Handle quiz update (similar pattern with questions)
      if (body.quiz) {
        const existingQuizIds = existingCourse.quiz.map((q) => q.id);
        const processedQuizIds = new Set();

        for (const quizData of body.quiz) {
          if (quizData.id && existingQuizIds.includes(quizData.id)) {
            // Update existing quiz
            await prisma.quiz.update({
              where: { id: quizData.id },
              data: {
                ...(quizData.quiz_title && { title: quizData.quiz_title }),
                ...(quizData.quiz_description && {
                  description: quizData.quiz_description,
                }),
                ...(quizData.quiz_duration && {
                  duration: quizData.quiz_duration,
                }),
                ...(quizData.quiz_score && {
                  passingScore: quizData.quiz_score,
                }),
              },
            });

            // Handle questions
            if (quizData.questions) {
              const existingQuiz = existingCourse.quiz.find(
                (q) => q.id === quizData.id,
              );
              const existingQuestionIds =
                existingQuiz?.questions.map((q) => q.id) || [];
              const processedQuestionIds = new Set();

              for (const questionData of quizData.questions) {
                if (
                  questionData.id &&
                  existingQuestionIds.includes(questionData.id)
                ) {
                  // Update existing question
                  await prisma.question.update({
                    where: { id: questionData.id },
                    data: {
                      ...(questionData.question_name && {
                        question: questionData.question_name,
                      }),
                      ...(questionData.options && {
                        options: questionData.options,
                      }),
                      ...(questionData.correctAnswer && {
                        correctAnswer: questionData.correctAnswer,
                      }),
                    },
                  });
                  processedQuestionIds.add(questionData.id);
                } else {
                  // Create new question
                  await prisma.question.create({
                    data: {
                      question: questionData.question_name || "",
                      options: questionData.options || [],
                      correctAnswer: questionData.correctAnswer || "",
                      quizId: quizData.id,
                    },
                  });
                }
              }

              // Delete questions not in update
              const questionsToDelete = existingQuestionIds.filter(
                (id) => !processedQuestionIds.has(id),
              );
              if (questionsToDelete.length > 0) {
                await prisma.question.deleteMany({
                  where: {
                    id: { in: questionsToDelete },
                  },
                });
              }
            }
            processedQuizIds.add(quizData.id);
          } else {
            // Create new quiz with questions
            await prisma.quiz.create({
              data: {
                title: quizData.quiz_title || "",
                description: quizData.quiz_description || "",
                duration: quizData.quiz_duration || 30,
                passingScore: quizData.quiz_score || 70,
                courseId: courseId,
                ...(quizData.questions && {
                  questions: {
                    create: quizData.questions.map((q) => ({
                      question: q.question_name || "",
                      options: q.options || [],
                      correctAnswer: q.correctAnswer || "",
                    })),
                  },
                }),
              },
            });
          }
        }

        // Delete quizzes not in update
        const quizzesToDelete = existingQuizIds.filter(
          (id) => !processedQuizIds.has(id),
        );
        if (quizzesToDelete.length > 0) {
          await prisma.quiz.deleteMany({
            where: {
              id: { in: quizzesToDelete },
            },
          });
        }
      }

      // Return the fully updated course with all relations
      const updatedCourse = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          module: {
            include: { lesson: true },
            orderBy: { order: "asc" },
          },
          material: true,
          objectives: true,
          quiz: {
            include: {
              questions: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Course updated successfully",
        data: updatedCourse,
      };
    } catch (error: any) {
      console.error("Error updating course:", error);
      this.setStatus(500);
      return {
        message: "Error updating course: " + error.message,
        data: null,
      };
    }
  }

  @Get("/get-all-courses")
  public async GetAllCourses(): Promise<CourseResponse> {
    try {
      const getAllCourses = await prisma.course.findMany({
        orderBy: {
          createdAt: "desc",
        },

        include: {
          module: {
            select: {
              _count: {
                select: {
                  lesson: true,
                },
              },
              lesson: {
                select: {
                  duration: true,
                },
              },
            },
          },
        },
      });
      this.setStatus(200);
      return {
        message: "Courses fetched successfully",
        data: {
          getAllCourses,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Error fetching courses: " + error.message,
        data: null,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/get-all-courses-level")
  public async GetAllCoursesByLevel(
    @Request() req: any,
  ): Promise<CourseResponse> {
    const userLevel = req.user?.level;

    try {
      // Validate user level
      if (!userLevel) {
        this.setStatus(400);
        return {
          message: "User level not found",
          data: null,
        };
      }

      // Normalize level to proper case
      const normalizedLevel = userLevel.toLowerCase();

      if (normalizedLevel === "beginners") {
        const getAllCourses = await prisma.course.findMany({
          where: {
            course_level: "Beginner",
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            module: {
              select: {
                _count: {
                  select: {
                    lesson: true,
                  },
                },
                lesson: {
                  select: {
                    duration: true,
                  },
                },
              },
            },
          },
        });

        this.setStatus(200);
        return {
          message: "Courses fetched successfully",
          data: {
            getAllCourses,
          },
        };
      } else if (normalizedLevel === "intermediate") {
        const getAllCourses = await prisma.course.findMany({
          where: {
            course_level: "Intermediate",
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            module: {
              select: {
                _count: {
                  select: {
                    lesson: true,
                  },
                },
                lesson: {
                  select: {
                    duration: true,
                  },
                },
              },
            },
          },
        });

        this.setStatus(200);
        return {
          message: "Courses fetched successfully",
          data: {
            getAllCourses,
          },
        };
      } else {
        // Handle any other level values
        this.setStatus(400);
        return {
          message: `Invalid user level: ${userLevel}. Valid levels are: beginner, intermediate`,
          data: null,
        };
      }
    } catch (error: any) {
      console.error("Error fetching courses by level:", error);
      this.setStatus(500);
      return {
        message: "Error fetching courses: " + error.message,
        data: null,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/get-courses-by-tutor")
  public async GetUserCourse(@Request() req: any) {
    const userId = req.user?.id;
    try {
      if (!userId) {
        this.setStatus(401);
        return {
          message: "User unauthorized",
        };
      }

      const userCourses = await prisma.user.findMany({
        where: { id: userId },
        select: {
          Courses: {
            include: {
              enrollment: true,
              material: true,
              module: true,
              objectives: true,
              quiz: {
                include: {
                  questions: true,
                },
              },
              _count: {
                select: {
                  post: true,
                },
              },
            },

            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Courses fetched successfully",
        data: userCourses,
        progress: 0,
      };
    } catch (error) {
      this.setStatus(500);
      console.error(error);
    }
  }

  @Get("/get-course/{courseId}")
  public async GetCourseById(@Path() courseId: string): Promise<any> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          createdByDetails: {
            select: {
              user_pic: true,
            },
          },
          module: {
            include: {
              lesson: true,
              _count: {
                select: {
                  lesson: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
          material: true,
          objectives: true,
          quiz: {
            include: {
              questions: {
                orderBy: { order: "asc" },
              },
              QuizAttempt: true,
            },
          },

          enrollment: {
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email_address: true,
                },
              },
            },
          },
          _count: {
            select: {
              post: true,
              enrollment: true,
              quizAttempt: true,
            },
          },
        },
      });

      if (!course) {
        this.setStatus(404);
        return {
          message: "Course not found",
          data: null,
        };
      }

      this.setStatus(200);
      return {
        message: "Course fetched successfully",
        data: course,
        progress: 0,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Error fetching course: " + error.message,
        data: null,
      };
    }
  }

  @Get("/fetch-quizzes/{courseId}")
  public async FetchQuizzes(@Request() req: any, @Path() courseId: string) {
    try {
      //Fetch Quiz
      const quiz = await prisma.quiz.findMany({
        where: {
          courseId,
        },
        include: {
          questions: {
            orderBy: { order: "asc" },
          },
          QuizAttempt: {
            include: {
              quiz: true,
            },
          },
        },
      });

      const quizzes = quiz.map((q) => {
        const quizAttempted = Number(
          q.QuizAttempt.filter((f) => f.completed).length,
        );
        const totalQuizAttempted = Number(q.QuizAttempt.length);
        const quizProgress = (quizAttempted / totalQuizAttempted) * 100;

        return {
          ...q,
          quizAttempted,
          totalQuizAttempted,
          quizProgress: quizProgress || null,
        };
      });

      this.setStatus(200);
      return {
        message: "Quiz fetched successfully",
        quiz: quizzes,
      };
    } catch (error) {
      this.setStatus(500);
      console.error(error);
    }
  }

  @Security("bearerAuth")
  @Delete("/delete-course/{courseId}")
  public async DeleteCourse(@Path() courseId: string): Promise<CourseResponse> {
    try {
      // Check if course exists
      const existingCourse = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!existingCourse) {
        this.setStatus(404);
        return {
          message: "Course not found",
          data: null,
        };
      }

      // Delete course (cascade will handle related records)
      await prisma.course.delete({
        where: { id: courseId },
      });

      this.setStatus(200);
      return {
        message: "Course deleted successfully",
        data: null,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Error deleting course: " + error.message,
        data: null,
      };
    }
  }

  // FILE UPLOAD ENDPOINTS
  @Post("/upload-course-image/{courseId}")
  @Security("bearerAuth")
  public async UploadCourseImage(
    @Path() courseId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        this.setStatus(404);
        return { message: "Course not found" };
      }

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.uploadCourseImage(
        courseId,
        fileBuffer,
        body.fileName,
        body.mimeType,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { course_image: url },
      });

      this.setStatus(200);
      return {
        message: "Course image uploaded successfully",
        data: {
          courseId: updatedCourse.id,
          imageUrl: updatedCourse.course_image,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to upload course image",
        error: error.message,
      };
    }
  }

  @Post("/upload-lesson-video/{courseId}/{moduleId}")
  @Security("bearerAuth")
  public async UploadLessonVideo(
    @Path() courseId: string,
    @Path() moduleId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    try {
      // Log file details for debugging
      console.log("🎥 UploadLessonVideo called with file:", {
        name: file?.originalname,
        size: file?.size
          ? `${(file.size / 1024 / 1024).toFixed(2)}MB`
          : "unknown",
        mimetype: file?.mimetype,
        courseId,
        moduleId,
      });

      if (!file) {
        this.setStatus(400);
        return { message: "No file uploaded" };
      }

      // Check file size manually as a backup
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        this.setStatus(413);
        return {
          message: `File too large. Maximum size is 500MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        };
      }

      const module = await prisma.module.findFirst({
        where: {
          id: moduleId,
          courseId: courseId,
        },
      });

      if (!module) {
        this.setStatus(404);
        return { message: "Module not found in this course" };
      }

      const { url, error } = await MediaService.uploadLessonVideo(
        courseId,
        moduleId,
        file.buffer,
        file.originalname,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      this.setStatus(200);
      return {
        message: "Lesson video uploaded successfully",
        data: {
          url: url,
          moduleId: moduleId,
          courseId: courseId,
        },
      };
    } catch (error: any) {
      console.error("❌ Error in UploadLessonVideo:", error);

      // Check if it's a multer error
      if (error.code === "LIMIT_FILE_SIZE") {
        this.setStatus(413);
        return { message: "File too large. Maximum size is 500MB." };
      }

      this.setStatus(500);
      return {
        message: "Failed to upload lesson video",
        error: error.message,
      };
    }
  }

  @Put("/update-lesson/{lessonId}")
  @Security("bearerAuth")
  public async UpdateLesson(
    @Path() lessonId: string,
    @Body()
    body: {
      lesson_video: string;
      lesson_title?: string;
      duration?: number; // Add this field
    },
  ): Promise<any> {
    try {
      // Check if lesson exists
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
      });

      if (!lesson) {
        this.setStatus(404);
        return { message: "Lesson not found" };
      }

      // Prepare update data
      const updateData: any = {
        lesson_video: body.lesson_video,
      };

      // Only include optional fields if provided
      if (body.lesson_title !== undefined) {
        updateData.lesson_title = body.lesson_title;
      }

      if (body.duration !== undefined) {
        updateData.duration = body.duration; // Add duration to update
      }

      // Update the lesson with video URL and duration
      const updatedLesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: updateData,
      });

      this.setStatus(200);
      return {
        message: "Lesson updated successfully",
        data: updatedLesson,
      };
    } catch (error: any) {
      console.error("Error updating lesson:", error);
      this.setStatus(500);
      return {
        message: "Failed to update lesson",
        error: error.message,
      };
    }
  }

  @Post("/upload-course-material/{courseId}/{materialId}")
  @Security("bearerAuth")
  public async UploadCourseMaterial(
    @Path() courseId: string,
    @Path() materialId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    try {
      // Verify the material exists and belongs to this course
      const material = await prisma.material.findFirst({
        where: {
          id: materialId,
          courseId: courseId,
        },
      });

      if (!material) {
        this.setStatus(404);
        return {
          message: "Material not found in this course",
        };
      }

      // Upload to Cloudinary
      const { url, error } = await MediaService.uploadCourseMaterial(
        courseId,
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      // Update the material with the new document URL
      const updatedMaterial = await prisma.material.update({
        where: { id: materialId },
        data: {
          material_document: url,
        },
        include: {
          course: {
            select: {
              id: true,
              course_title: true,
            },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Course material uploaded successfully",
        data: {
          id: updatedMaterial.id,
          material_document: updatedMaterial.material_document,
          material_title: updatedMaterial.material_title,
          courseId: updatedMaterial.courseId,
        },
      };
    } catch (error: any) {
      console.error("Error uploading course material:", error);
      this.setStatus(500);
      return {
        message: "Failed to upload course material",
        error: error.message,
      };
    }
  }

  @Get("/get-course-materials/{courseId}")
  public async GetCourseMaterials(@Path() courseId: string): Promise<any> {
    const materials = await prisma.material.findMany({
      where: { courseId: courseId },
      include: {
        course: {
          select: {
            id: true,
            course_title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    this.setStatus(200);
    return {
      message: "Course materials fetched successfully",
      data: materials,
      count: materials.length,
    };
  }

  @Post("/create-module/{courseId}")
  @Security("bearerAuth")
  public async CreateModule(
    @Body() body: Omit<Module, "id">,
    @Path() courseId: string,
  ): Promise<any> {
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      this.setStatus(404);
      return {
        message: "Module not found",
      };
    }

    const createModule = await prisma.module.create({
      data: {
        module_title: body.module_title,
        module_description: body.module_description,
        module_duration: body.module_duration,
        courseId: courseId,
        ...((body.lesson as any) && {
          lesson: {
            create: body.lesson.map((l) => ({
              lesson_video: l.lesson_video,
              lesson_title: l.lesson_video,
            })),
          },
        }),
      },
    });
    this.setStatus(201);
    return {
      message: "Module created successfully",
      data: createModule,
    };
  }

  @Get("/get-modules")
  public async GetModules(): Promise<any> {
    const modules = await prisma.module.findMany({
      include: {
        course: {
          select: {
            id: true,
            course_title: true,
          },
        },
        lesson: true,
        _count: {
          select: {
            lesson: true,
          },
        },
      },
    });
    this.setStatus(200);
    return {
      message: "Modules fetched successfully",
      data: modules,
    };
  }

  @Get("/get-module/{courseId}/{moduleId}")
  public async GetModuleById(
    @Path() courseId: string,
    @Path() moduleId: string,
  ): Promise<any> {
    const getModuleById = await prisma.module.findFirst({
      where: { id: moduleId, courseId: courseId },
      include: {
        lesson: {
          orderBy: {
            order: "asc",
          },
        },
        course: {
          select: {
            id: true,
            course_title: true,
          },
        },
      },
    });

    if (!getModuleById) {
      this.setStatus(404);
      return { message: "Module not found" };
    }

    this.setStatus(200);
    return {
      message: "Module fetched successfully",
      data: getModuleById,
    };
  }

  @Put("/update-module/{id}")
  @Security("bearerAuth")
  public async UpdateModule(
    @Path() id: string,
    @Body()
    body: {
      module_title?: string;
      module_description?: string;
      module_duration?: string;
    },
  ): Promise<any> {
    const updateModule = await prisma.module.update({
      where: { id: id },
      data: body,
    });

    this.setStatus(200);
    return {
      message: "Module updated successfully",
      data: updateModule,
    };
  }

  @Delete("/delete-module/{id}")
  @Security("bearerAuth")
  public async DeleteModule(@Path() id: string) {
    const deleteModule = await prisma.module.delete({
      where: { id },
    });

    this.setStatus(200);
    return {
      message: "Module deleted successfully",
      data: deleteModule,
    };
  }

  @Post("/create-quiz/{courseId}")
  public async CreateQuiz(
    @Path() courseId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      courseId: string;
      duration?: number;
      passingScore?: number;
      maxAttempts?: number;
      questions: Array<{
        question: string;
        options: string[];
        correctAnswer: string;
        explanation?: string;
        points?: number;
        order: number;
      }>;
    },
  ): Promise<any> {
    try {
      const course = await prisma.course.findUnique({
        where: {
          id: courseId,
        },
      });

      if (!course) {
        this.setStatus(404);
        return {
          message: "Course not found",
        };
      }
      const newQuiz = await prisma.quiz.create({
        data: {
          title: body.title,
          description: body.description,
          courseId: courseId,
          duration: body.duration,
          passingScore: body.passingScore || 70,
          maxAttempts: body.maxAttempts || 3,
          questions: {
            create: body.questions.map((question) => ({
              question: question.question,
              options: question.options,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              points: question.points || 1,
              order: question.order,
            })),
          },
        },
        include: {
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              question: true,
              options: true,
              order: true,
              points: true,
            },
          },
          course: {
            select: {
              id: true,
              course_title: true,
            },
          },
        },
      });

      this.setStatus(201);
      return {
        message: "Quiz created successfully",
        data: newQuiz,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to create quiz",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Post("/save-course/{courseId}")
  public async SaveCourse(@Request() req: any, @Path() courseId: string) {
    const userId = req.user?.id;
    if (!userId) {
      this.setStatus(400);
      return {
        message: "User is unauthorized",
      };
    }

    try {
      const saveCourse = await prisma.savedCourses.create({
        data: {
          userId,
          courseId,
        },
      });

      this.setStatus(200);
      return {
        message: "Course saved successfully",
        data: saveCourse,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "Error saving course",
      };
    }
  }

  @Security("bearerAuth")
@Delete("/unsave-course/{courseId}")
public async UnSaveCourse(@Request() req: any, @Path() courseId: string) {
  const userId = req.user?.id;
  if (!userId) {
    return {
      message: "User is unauthorized",
    };
  }

  try {
    // ✅ FIX: Delete using both userId and courseId, not just courseId
    const unsaveCourse = await prisma.savedCourses.deleteMany({
      where: {
        userId: userId,
        courseId: courseId,
      },
    });

    if (unsaveCourse.count === 0) {
      this.setStatus(404);
      return {
        message: "Saved course not found",
      };
    }

    this.setStatus(200);
    return {
      message: "Course unsaved successfully",
      data: unsaveCourse,
    };
  } catch (error) {
    console.error("Error unsaving course:", error);
    this.setStatus(500);
    return {
      message: "Error unsaving course",
    };
  }
}

  @Security("bearerAuth")
  @Get("/check-saved-course/{courseId}")
  public async CheckedSaveCourse(
    @Request() req: any,
    @Path() courseId: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return {
        message: "User is unauthorized",
      };
    }

    try {
      const savedCourses = await prisma.savedCourses.count({
        where: {
          courseId,
        },
      });

      this.setStatus(200);
      return {
        message: "Check if it saved successfully",
        isSaved: savedCourses > 0,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "Error fetching course",
      };
    }
  }

  @Security("bearerAuth")
  @Post("/submit-quiz/{courseId}/{quizId}")
  public async SubmitQuiz(
    @Path() courseId: string,
    @Path() quizId: string,
    @Request() req: any,
    @Body()
    quiz: {
      totalPoint: number;
      completed: boolean;
      passingScore: number;
      timeFinished: number;
      answers: {
        questionId: string;
        answer: string;
        correct: boolean;
        point: number;
      }[];
    },
  ) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        this.setStatus(404);
        return { message: "Course not found" };
      }

      const quizData = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { passingScore: true, title: true },
      });

      if (!quizData) {
        this.setStatus(404);
        return { message: "Quiz not found" };
      }

      // Get or create progress
      let userProgress = await prisma.progress.findFirst({
        where: { userId },
      });

      if (!userProgress) {
        userProgress = await prisma.progress.create({
          data: {
            userId,
            startedJourney: true,
            progressBar: 0,
          },
        });
      }

      // Calculate score
      let sumOfPoint = 0;
      for (const answer of quiz.answers) {
        sumOfPoint += answer.point;
      }
      const quizScorePercentage = (sumOfPoint / quiz.totalPoint) * 100;

      // Check if quiz already attempted and passed
      const existingAttempt = await prisma.quizAttempt.findFirst({
        where: {
          userId,
          quizId,
          completed: true,
        },
      });

      if (existingAttempt) {
        return {
          message: "Quiz already completed",
          data: existingAttempt,
          alreadyCompleted: true,
        };
      }

      // Create quiz attempt
      const quizAttempt = await prisma.quizAttempt.create({
        data: {
          user: { connect: { id: userId } },
          course: { connect: { id: courseId } },
          quiz: { connect: { id: quizId } },
          progress: { connect: { id: userProgress.id } },
          score: quizScorePercentage,
          answers: quiz.answers,
          completed: quiz.completed,
          timeFinished: quiz.timeFinished,
        },
      });

      let quizPassed = false;
      // Award XP if passed
      if (quizScorePercentage >= quizData.passingScore) {
        quizPassed = true;
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.QUIZ_PASS,
          {
            courseId,
            quizScore: quizScorePercentage,
            quizAttemptId: quizAttempt.id,
          },
        );
      }

      // Check all quizzes completion
      const allQuizzes = await prisma.quiz.findMany({
        where: { courseId },
        select: { id: true },
      });

      const completedQuizzes = await prisma.quizAttempt.findMany({
        where: {
          userId,
          courseId,
          completed: true,
          quizId: { in: allQuizzes.map((q) => q.id) },
        },
        select: { quizId: true },
      });

      const allQuizzesCompleted = completedQuizzes.length === allQuizzes.length;

      // Check all lessons completion
      const courseModules = await prisma.module.findMany({
        where: { courseId },
        include: { lesson: { select: { id: true } } },
      });

      const allLessons = courseModules.flatMap((m) => m.lesson);
      const allLessonIds = allLessons.map((l) => l.id);

      const completedLessons = await prisma.progress.findMany({
        where: {
          userId,
          lessonId: { in: allLessonIds },
          progressBar: { gte: 100 },
        },
        select: { lessonId: true },
      });

      const allLessonsCompleted = completedLessons.length === allLessons.length;

      // Mark course as completed if both conditions are met
      let courseCompleted = false;
      if (allLessonsCompleted && allQuizzesCompleted) {
        const enrollment = await prisma.enrollment.findFirst({
          where: { userId, courseId },
        });

        if (enrollment && enrollment.status !== "COMPLETED") {
          await GamificationService.AddPointsWithGamification(
            userId,
            ActionType.COURSE_COMPLETE,
            { courseId },
          );

          await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
            },
          });
          courseCompleted = true;
        }
      }

      this.setStatus(200);
      return {
        message: quizPassed ? "Quiz passed! XP awarded!" : "Quiz submitted",
        data: quizAttempt,
        passed: quizPassed,
        score: quizScorePercentage,
        passingScore: quizData.passingScore,
        courseCompleted,
        progress: {
          lessonsCompleted: completedLessons.length,
          totalLessons: allLessons.length,
          quizzesCompleted: completedQuizzes.length,
          totalQuizzes: allQuizzes.length,
          allLessonsDone: allLessonsCompleted,
          allQuizzesDone: allQuizzesCompleted,
        },
      };
    } catch (error: any) {
      console.error("Error submitting quiz:", error);
      this.setStatus(500);
      return { message: "Error submitting quiz", error: error.message };
    }
  }
  @Get("/fetch-quiz-answers/{quizId}")
  public async FetchQuizAnswers(@Path() quizId: string) {
    try {
      const checkQuiz = await prisma.quiz.findUnique({
        where: {
          id: quizId,
        },
      });

      if (!checkQuiz) {
        this.setStatus(404);
        return {
          message: "This quiz does not exist.",
        };
      }

      const getQuizQuestions = await prisma.quiz.findUnique({
        where: {
          id: checkQuiz.id,
        },
        include: {
          QuizAttempt: true,
          questions: true,
        },
      });

      this.setStatus(200);
      return {
        message: "Quiz fetched successfully",
        data: getQuizQuestions,
      };
    } catch (error) {
      this.setStatus(500);
      console.error(error);
    }
  }
  @Security("bearerAuth")
  @Post("/complete-lesson/{courseId}/{lessonId}")
  public async CompleteLesson(
    @Path() courseId: string,
    @Path() lessonId: string,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      // Check if lesson exists
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { module: true },
      });

      if (!lesson) {
        this.setStatus(404);
        return { message: "Lesson not found" };
      }

      // Check if user is enrolled
      const enrollment = await prisma.enrollment.findFirst({
        where: { userId, courseId },
      });

      if (!enrollment) {
        this.setStatus(403);
        return { message: "You must be enrolled in this course" };
      }

      // Get or create user progress
      let userProgress = await prisma.progress.findFirst({
        where: { userId },
      });

      if (!userProgress) {
        userProgress = await prisma.progress.create({
          data: {
            userId,
            startedJourney: true,
            progressBar: 0,
          },
        });
      }

      // ✅ FIX: Check VideoTracker first to see if video was watched enough
      const videoTracker = await prisma.videoTracker.findFirst({
        where: {
          lessonId: lessonId,
          progressId: userProgress.id,
          videoFinished: true,
        },
      });

      // If video wasn't watched enough (95%+), don't mark as complete
      if (!videoTracker) {
        return {
          message:
            "Video not completed yet. Please watch at least 95% of the video.",
          completed: false,
          requiresMoreWatching: true,
        };
      }

      // ✅ FIX: Check if lesson is already completed (using unique constraint)
      const existingProgress = await prisma.progress.findFirst({
        where: {
          userId,
          lessonId: lessonId,
          progressBar: { gte: 100 },
        },
      });

      if (existingProgress) {
        return {
          message: "Lesson already completed",
          alreadyCompleted: true,
          data: { lessonId, completed: true },
        };
      }

      // ✅ FIX: Create lesson progress record (prevent duplicates by checking first)
      const lessonProgress = await prisma.progress.create({
        data: {
          userId,
          lessonId: lessonId,
          progressBar: 100,
          startedJourney: true,
          courses: {
            connect: { id: courseId },
          },
        },
      });

      // Award XP for lesson completion
      const gamificationResult =
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.LESSON_COMPLETE,
          { courseId, lessonId },
        );

      // Count unique completed lessons (using DISTINCT)
      const completedLessons = await prisma.progress.groupBy({
        by: ["lessonId"],
        where: {
          userId,
          lessonId: {
            in: (
              await prisma.lesson.findMany({
                where: { module: { courseId } },
                select: { id: true },
              })
            ).map((l) => l.id),
          },
          progressBar: { gte: 100 },
        },
      });

      const allLessons = await prisma.lesson.count({
        where: { module: { courseId } },
      });

      const allLessonsCompleted = completedLessons.length === allLessons;

      // Check all quizzes completion
      const allQuizzes = await prisma.quiz.findMany({
        where: { courseId },
        select: { id: true },
      });

      let allQuizzesCompleted = true;
      if (allQuizzes.length > 0) {
        const completedQuizzes = await prisma.quizAttempt.groupBy({
          by: ["quizId"],
          where: {
            userId,
            courseId,
            completed: true,
            quizId: { in: allQuizzes.map((q) => q.id) },
          },
        });
        allQuizzesCompleted = completedQuizzes.length === allQuizzes.length;
      }

      // Mark course as completed if both conditions are met
      let courseCompleted = false;
      if (
        allLessonsCompleted &&
        allQuizzesCompleted &&
        enrollment.status !== "COMPLETED"
      ) {
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.COURSE_COMPLETE,
          { courseId },
        );

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        courseCompleted = true;
      }

      this.setStatus(200);
      return {
        message: "Lesson completed successfully",
        data: {
          lessonProgress,
          courseCompleted,
          lessonsCompleted: completedLessons.length,
          totalLessons: allLessons,
          quizzesCompleted: allQuizzesCompleted ? allQuizzes.length : 0,
          totalQuizzes: allQuizzes.length,
        },
        gamification: {
          pointsEarned: gamificationResult.data?.pointsAdded,
          leveledUp: gamificationResult.data?.leveledUp,
          newLevel: gamificationResult.data?.newLevel,
          badgesEarned: gamificationResult.data?.badgesEarned,
        },
      };
    } catch (error: any) {
      console.error("Error completing lesson:", error);
      this.setStatus(500);
      return { message: "Failed to complete lesson", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Post("/enroll-course/{courseId}")
  public async EnrollCourse(
    @Path() courseId: string,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        this.setStatus(404);
        return { message: "Course not found" };
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          userId,
          courseId,
        },
      });

      if (existingEnrollment) {
        this.setStatus(400);
        return { message: "Already enrolled in this course" };
      }

      // Create enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: "ENROLLED",
          startedAt: new Date(),
          score: 0,
        },
      });

      // Award XP for course enrollment
      const gamificationResult =
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.COURSE_ENROLLMENT,
          { courseId },
        );

      this.setStatus(201);
      return {
        message: "Successfully enrolled in course",
        data: enrollment,
        gamification: {
          pointsEarned: gamificationResult.data?.pointsAdded,
          leveledUp: gamificationResult.data?.leveledUp,
          newLevel: gamificationResult.data?.newLevel,
          badgesEarned: gamificationResult.data?.badgesEarned,
        },
      };
    } catch (error: any) {
      console.error("Error enrolling in course:", error);
      this.setStatus(500);
      return { message: "Failed to enroll in course", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/get-user-course-progress/{courseId}")
  public async GetUserCourseProgress(
    @Path() courseId: string,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { course_title: true },
      });

      // Get enrollment status
      const enrollment = await prisma.enrollment.findFirst({
        where: { userId, courseId },
      });

      if (!enrollment) {
        this.setStatus(404);
        return { message: "User not enrolled in this course" };
      }

      // ✅ Check if course is completed via enrollment.status
      const isCompleted = enrollment.status === "COMPLETED";

      // Get all lessons in the course
      const courseModules = await prisma.module.findMany({
        where: { courseId },
        include: {
          course: {
            select: {
              course_title: true,
            },
          },
          lesson: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      });

      const allLessons = courseModules.flatMap((m) => m.lesson);
      const totalLessons = allLessons.length;

      // Get completed lessons
      const completedProgress = await prisma.progress.findMany({
        where: {
          userId,
          lessonId: { in: allLessons.map((l) => l.id) },
          progressBar: { gte: 100 },
        },
        select: { lessonId: true },
      });

      const completedLessons = completedProgress.length;
      const progressPercentage =
        totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      // Get user's gamification data
      const gamificationData =
        await GamificationService.getUserDashboard(userId);

      this.setStatus(200);
      return {
        message: "Course progress fetched successfully",
        data: {
          courseId,
          courseTitle: course.course_title,
          isCompleted, // ✅ Now using enrollment.status
          enrollment: {
            status: enrollment.status,
            startedAt: enrollment.startedAt,
            completedAt: enrollment.completedAt,
            score: enrollment.score,
          },
          progress: {
            completedLessons,
            totalLessons,
            percentage: progressPercentage,
          },
          modules: courseModules.map((module) => ({
            id: module.id,
            title: module.module_title,
            totalLessons: module.lesson.length,
            completedLessons: module.lesson.filter((l) =>
              completedProgress.some((p) => p.lessonId === l.id),
            ).length,
            lessons: module.lesson.map((lesson) => ({
              id: lesson.id,
              title: lesson.lesson_title,
              duration: lesson.duration,
              completed: completedProgress.some(
                (p) => p.lessonId === lesson.id,
              ),
            })),
          })),
          gamification: gamificationData.data?.gamification,
        },
      };
    } catch (error: any) {
      console.error("Error fetching course progress:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch course progress",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-activities/{courseId}")
  public async FetchActivites(
    @Request() req: any,
    @Path() courseId: string,
  ): Promise<any> {
    const tutorId = req.user?.id; //Id for user
    const role = req.user?.role; //Role for user
    const orgId = req.org?.id; //Role for Organization Id

    try {
      //For User
      const user = await prisma.user.findUnique({
        where: {
          id: tutorId,
          role,
        },
      });

      if (role !== "instructor") {
        this.setStatus(401);
        return {
          message: "This Role is invalid",
        };
      }

      if (user) {
        const course = await prisma.course.findUnique({
          where: {
            id: courseId,
          },
        });

        if (!course) {
          this.setStatus(404);
          return {
            message: "This course does not exist",
          };
        }

        const getActivitiesFromNotification =
          await prisma.notification.findMany({
            where: {
              courseId,
            },
            take: 30,
          });

        this.setStatus(200);
        return {
          message: "Activities Fetched Successfully",
          data: getActivitiesFromNotification || null,
        };
      }

      //For organization
      const org = await prisma.organization.findUnique({
        where: {
          id: orgId,
        },
      });
      if (org) {
        const course = await prisma.course.findUnique({
          where: {
            id: courseId,
          },
        });

        if (!course) {
          this.setStatus(404);
          return {
            message: "This course does not exist",
          };
        }

        const getActivitiesFromNotification =
          await prisma.notification.findMany({
            where: {
              courseId,
              organization: {
                form_type: "ORGANIZATION",
              },
            },
            take: 30,
          });

        this.setStatus(200);
        return {
          message: "Activities Fetched Successfully",
          data: getActivitiesFromNotification,
        };
      }

      this.setStatus(400);
      return {
        message: "An error occured while fetching the activities.",
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "An error occured while fetching the activities",
        error: error.message,
      };
    }
  }

  // In your CourseController.ts, update the fetch-saved-courses endpoint
  @Security("bearerAuth")
  @Get("/fetch-saved-courses")
  public async FetchSavedCourse(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return {
        message: "User is unauthorized",
      };
    }

    try {
      const savedCourses = await prisma.savedCourses.findMany({
        where: {
          userId,
          courses: {
            isNot: null, // ✅ Only get saved courses that still exist
          },
        },
        include: {
          courses: true,
        },
      });

      // Filter out any records where courses is null (just in case)
      const validSavedCourses = savedCourses.filter(
        (item) => item.courses !== null,
      );

      this.setStatus(200);
      return {
        message: "Saved courses fetched successfully",
        data: validSavedCourses,
      };
    } catch (error) {
      console.error("Error fetching saved courses:", error);
      this.setStatus(500);
      return {
        message: "Error fetching saved courses",
        data: [],
      };
    }
  }
  @Security("bearerAuth")
  @Get("/tutor-overview")
  public async GetTutorOverview(@Request() req: any): Promise<any> {
    const tutorId = req.user?.id;
    const orgId = req.org?.id;

    try {
      // Step 1 — Fetch all courses belonging to this tutor/org
      const allCourses = await prisma.course.findMany({
        where: orgId ? { organizationId: orgId } : { createdUserId: tutorId },
        select: {
          id: true,
          course_title: true,
          course_short_description: true,
          course_image: true,
          course_level: true,
          _count: {
            select: { enrollment: true },
          },
        },
      });

      const totalPublishedCourses = allCourses.length;

      if (totalPublishedCourses === 0) {
        this.setStatus(200);
        return {
          message: "No courses found",
          data: {
            topCourse: null,
            totalPublishedCourses: 0,
            avgCompletionPercentage: 0,
          },
        };
      }

      // Step 2 — Pick the course with the most enrollments
      const topCourse = allCourses.reduce((prev, curr) =>
        curr._count.enrollment > prev._count.enrollment ? curr : prev,
      );

      // Step 3 — Compute completion % across all tutor's courses
      const courseIds = allCourses.map((c) => c.id);

      const [totalEnrollments, completedEnrollments] = await Promise.all([
        prisma.enrollment.count({
          where: { courseId: { in: courseIds } },
        }),
        prisma.enrollment.count({
          where: {
            courseId: { in: courseIds },
            status: "COMPLETED",
          },
        }),
      ]);

      const avgCompletionPercentage =
        totalEnrollments > 0
          ? Math.round((completedEnrollments / totalEnrollments) * 100)
          : 0;

      this.setStatus(200);
      return {
        message: "Tutor overview fetched successfully",
        data: {
          topCourse: {
            id: topCourse.id,
            course_title: topCourse.course_title,
            course_short_description: topCourse.course_short_description,
            course_image: topCourse.course_image,
            course_level: topCourse.course_level,
            totalStudents: topCourse._count.enrollment,
          },
          totalPublishedCourses,
          avgCompletionPercentage,
        },
      };
    } catch (error: any) {
      console.error("Error fetching tutor overview:", error);
      this.setStatus(500);
      return {
        message: "Error fetching tutor overview: " + error.message,
        data: null,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-student_spiritual-growth")
  public async FetchStudentSpiritualGrowth(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      return {
        message: "User is unauthorized for this action",
      };
    }
  }

  // Add to CourseController.ts
  @Security("bearerAuth")
  @Get("/debug-course-state/{courseId}")
  public async DebugCourseState(
    @Path() courseId: string,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      // 1. Get enrollment status
      const enrollment = await prisma.enrollment.findFirst({
        where: { userId, courseId },
        select: { status: true, completedAt: true },
      });

      // 2. Get all lessons
      const modules = await prisma.module.findMany({
        where: { courseId },
        include: {
          lesson: {
            select: { id: true, lesson_title: true },
          },
        },
      });

      const allLessons = modules.flatMap((m) => m.lesson);

      // 3. Get lesson completion from Progress table
      const completedLessons = await prisma.progress.findMany({
        where: {
          userId,
          lessonId: { in: allLessons.map((l) => l.id) },
          progressBar: { gte: 100 },
        },
        select: { lessonId: true, progressBar: true },
      });

      // 4. Get all quizzes
      const quizzes = await prisma.quiz.findMany({
        where: { courseId },
        select: { id: true, title: true, passingScore: true },
      });

      // 5. Get quiz completion
      const completedQuizzes = await prisma.quizAttempt.findMany({
        where: {
          userId,
          courseId,
          completed: true,
        },
        select: { quizId: true, score: true, completed: true },
      });

      return {
        message: "Course state debug",
        data: {
          enrollmentStatus: enrollment?.status || "NOT_ENROLLED",
          courseCompletion: {
            totalLessons: allLessons.length,
            completedLessonsCount: completedLessons.length,
            completedLessons: completedLessons.map((c) => ({
              lessonId: c.lessonId,
              progressBar: c.progressBar,
            })),
            missingLessons: allLessons
              .filter(
                (l) => !completedLessons.some((cl) => cl.lessonId === l.id),
              )
              .map((l) => ({ id: l.id, title: l.lesson_title })),
          },
          quizCompletion: {
            totalQuizzes: quizzes.length,
            completedQuizzesCount: completedQuizzes.length,
            completedQuizzes: completedQuizzes.map((q) => ({
              quizId: q.quizId,
              score: q.score,
              completed: q.completed,
            })),
            missingQuizzes: quizzes
              .filter((q) => !completedQuizzes.some((cq) => cq.quizId === q.id))
              .map((q) => ({ id: q.id, title: q.title })),
          },
          shouldBeCompleted: {
            allLessonsDone: completedLessons.length === allLessons.length,
            allQuizzesDone: completedQuizzes.length === quizzes.length,
            bothDone:
              completedLessons.length === allLessons.length &&
              completedQuizzes.length === quizzes.length,
          },
        },
      };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}
