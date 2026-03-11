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
  FormField,
} from "tsoa";
import prisma from "../db";
import { CourseResponse, Module } from "../interface/interfaces";
import {
  CreateCourseDTO,
  UpdateCourseWithRelationsDTO,
} from "../dto/course.dto";
import { MediaService } from "../services/mediaServices";
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
    const tutorName = req.user?.full_name;
    const tutorId = req.user?.id;
    const orgId = req.org?.id;
    const orgName = req.org?.organization_name;
    try {
      // Use organizationId if exists, otherwise use createdUserId
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

      this.setStatus(201);
      return {
        message: "Course created successfully",
        data: course,
      };
    } catch (error: any) {
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
      if (userLevel == "beginner" || userLevel == "Beginner") {
        const getAllCourses = await prisma.course.findMany({
          where: {
            course_level: levels[userLevel],
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
      } else if (userLevel == "intermediate" || userLevel == "Intermediate") {
        const getAllCourses = await prisma.course.findMany({
          where: {
            course_level: levels[userLevel],
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
      }
    } catch (error: any) {
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
    @FormField() fileName?: string,
    @FormField() mimeType?: string,
  ): Promise<any> {
    try {
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

      const newLesson = await prisma.lesson.create({
        data: {
          lesson_video: url,
          moduleId: moduleId,
        },
        include: {
          module: {
            select: {
              id: true,
              module_title: true,
              course: {
                select: {
                  id: true,
                  course_title: true,
                },
              },
            },
          },
        },
      });

      this.setStatus(201);
      return {
        message: "Lesson video uploaded successfully",
        data: newLesson,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to upload lesson video",
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

  // ... REST OF YOUR EXISTING METHODS (modules, quizzes, etc.) ...

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

  // ... YOUR QUIZ METHODS (they remain the same) ...
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

  // ... REST OF YOUR QUIZ METHODS ...
  @Security("bearerAuth")
  @Post("/save-course/{courseId}")
  public async SaveCourse(@Request() req: any, @Path() courseId: string) {
    const userId = req.user?.id;
    if (!userId) {
      return {
        message: "User is unauthorized",
      };
    }

    try {
      const course = await prisma.course.update({
        where: {
          id: courseId,
        },

        data: {
          saved: true,
        },
      });

      this.setStatus(200);
      return {
        message: "Course saved successfully",
        data: course,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "Error saving course",
      };
    }
  }

  @Security("bearerAuth")
  @Post("/unsave-course/{courseId}")
  public async UnSaveCourse(@Request() req: any, @Path() courseId: string) {
    const userId = req.user?.id;
    if (!userId) {
      return {
        message: "User is unauthorized",
      };
    }

    try {
      const course = await prisma.course.update({
        where: {
          id: courseId,
        },

        data: {
          saved: false,
        },
      });

      this.setStatus(200);
      return {
        message: "Course unsaved successfully",
        data: course,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "Error saving course",
      };
    }
  }

  @Security("bearerAuth")
  @Post("/check-saved-course/{courseId}")
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
      const course = await prisma.course.findUnique({
        where: {
          id: courseId,
        },
      });

      this.setStatus(200);
      return {
        message: "Check if it saved successfully",
        data: course,
        isSaved: course.saved,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "Error fetching course",
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

      if (
        role !== "instructor"
      ) {
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
              user: {
                id: tutorId,
                role,
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
      const course = await prisma.course.findMany({
        where: {
          saved: true,
        },
      });

      this.setStatus(200);
      return {
        message: "Saved courses fetched successfully",
        data: course,
      };
    } catch (error) {
      this.setStatus(500);
      return {
        message: "Error fetching course",
      };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-student_spiritual-growth")
  public async FetchStudentSpiritualGrowth(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      return {
        message: "User is unathorized for this action",
      };
    }
  }
}
