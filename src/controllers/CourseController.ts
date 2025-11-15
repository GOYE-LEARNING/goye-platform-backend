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
  Query,
} from "tsoa";
import prisma from "../db.js";
import { CourseResponse, Module } from "../interface/interfaces.js";
import {
  CreateCourseDTO,
  UpdateCourseWithRelationsDTO,
} from "../dto/course.dto.js";
import { MediaService } from "../services/mediaServices.js";

@Route("course")
@Tags("Course Control APIs")
export class CourseController extends Controller {
  //create Course

  @Security("bearerAuth")
  @Post("/create-course")
  public async CreateCourse(
    @Body() body: CreateCourseDTO,
    @Request() req: any
  ): Promise<CourseResponse> {
    const tutorName = req.user?.full_name
    const tutorId = req.user?.id
    try {
      const course = await prisma.course.create({
        data: {
          createdBy: tutorName,
          createdUserId: tutorId,
          course_title: body.course_title,
          course_short_description: body.course_short_description,
          course_description: body.course_description,
          course_level: body.course_level,
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
    @Body() body: UpdateCourseWithRelationsDTO
  ): Promise<CourseResponse> {
    try {
      // First, check if course exists
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

      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          ...(body.course_title && { course_title: body.course_title }),
          ...(body.course_short_description && {
            course_short_description: body.course_short_description,
          }),
          ...(body.course_description && {
            course_description: body.course_description,
          }),
          ...(body.course_level && { course_level: body.course_level }),
          ...(body.course_image && { course_image: body.course_image }),
        },
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
      this.setStatus(500);
      return {
        message: "Error updating course: " + error.message,
        data: null,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/get-all-courses")
  public async GetAllCourses(): Promise<CourseResponse> {
    try {
      const getAllCourses = await prisma.course.findMany();
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

  @Get("/get-course/{courseId}")
  public async GetCourseById(
    @Path() courseId: string
  ): Promise<CourseResponse> {
    try {
      const course = await prisma.course.findUnique({
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
    }
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
        body.mimeType
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
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    }
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

      const fileBuffer = Buffer.from(body.file, "base64");

      const { url, error } = await MediaService.uploadLessonVideo(
        courseId,
        moduleId,
        fileBuffer,
        body.fileName,
        body.mimeType
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

  @Post("/upload-course-material/{courseId}")
  @Security("bearerAuth")
  public async UploadCourseMaterial(
    @Path() courseId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    }
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

      const { url, error } = await MediaService.uploadCourseMaterial(
        courseId,
        fileBuffer,
        body.fileName,
        body.mimeType
      );

      if (error) {
        this.setStatus(500);
        return { message: "Upload failed", error };
      }

      const newMaterial = await prisma.material.create({
        data: {
          material_document: url,
          courseId: courseId,
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

      this.setStatus(201);
      return {
        message: "Course material uploaded successfully",
        data: newMaterial,
      };
    } catch (error: any) {
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

  @Post("/create-module")
  @Security("bearerAuth")
  public async CreateModule(
    @Body() body: Omit<Module, "id">,
    @Request() req: any
  ): Promise<any> {
    const createModule = await prisma.module.create({
      data: {
        ...(body as any),
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
    @Path() moduleId: string
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
    }
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
  @Post("/create-quiz")
  public async CreateQuiz(
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
    }
  ): Promise<any> {
    try {
      const newQuiz = await prisma.quiz.create({
        data: {
          title: body.title,
          description: body.description,
          courseId: body.courseId,
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
}
