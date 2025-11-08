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
} from "tsoa";
import prisma from "../db.js";
import { Course, CourseResponse, Module } from "../interface/interfaces.js";
import { UpdateCourseWithRelationsDTO } from "../dto/course.dto.js";
import { MediaService } from "../services/mediaServices.js";

@Route("course")
@Tags("Course Control APIs")
export class CourseController extends Controller {
  //create Course
  @Security("bearerAuth")
  @Post("/create-course")
  public async CreateCourse(
    @Body() body: Omit<Course, "id">
  ): Promise<CourseResponse> {
    const course = await prisma.course.create({ data: { ...(body as any) } });
    this.setStatus(201);
    return {
      message: "Course created successfully",
      data: course,
    };
  }

  @Get("/get-courses")
  public async GetCourse(@Request() req: any): Promise<any> {
    const course = await prisma.course.findMany({
      include: {
        _count: {
          select: {
            module: true,
            material: true,
            quiz: true,
            enrollment: true
          }
        }
      }
    });
    this.setStatus(200);
    return {
      message: "Course Fetched Successfully",
      course,
    };
  }

  @Get("/get-courses/{id}")
  public async GetCourseById(@Path() id: string) {
    const getCourseById = await prisma.course.findUnique({
      where: { id: id },
      include: {
        module: {
          include: {
            lesson: true
          }
        },
        material: true,
        objectives: true,
        quiz: {
          include: {
            questions: {
              select: {
                id: true,
                question: true,
                options: true,
                order: true,
                points: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollment: true,
            module: true
          }
        }
      }
    });

    if (!getCourseById) {
      this.setStatus(404);
      return { message: "Course not found" };
    }

    this.setStatus(200);
    return {
      message: "Course fetched successfully",
      data: getCourseById,
    };
  }

  @Security("bearerAuth")
  @Put("update-course/{id}")
  public async UpdateCourse(
    @Path() id: string,
    @Body() data: UpdateCourseWithRelationsDTO
  ): Promise<any> {
    const updateCourse = await prisma.course.update({
      where: { id },
      data: {
        course_title: data.course_title,
        course_short_description: data.course_short_description,
        course_description: data.course_description,
        course_level: data.course_level,
        course_image: data.course_image,
        module: {
          upsert:
            data.modules?.map((m) => ({
              where: { id: m.id || "" },
              update: {
                module_title: m.module_title,
                module_description: m.module_description,
                module_duration: m.module_duration,
                lesson: {
                  upsert:
                    m.lessons?.map((l) => ({
                      where: { id: l.id || "" },
                      update: {
                        lesson_title: l.lesson_title,
                        lesson_video: l.lesson_video,
                      },
                      create: {
                        lesson_title: l.lesson_title!,
                        lesson_video: l.lesson_video!,
                      },
                    })) || [],
                },
              },
              create: {
                module_title: m.module_title!,
                module_description: m.module_description!,
                module_duration: m.module_duration!,
              },
            })) || [],
        },

        material: {
          upsert:
            data.materials?.map((mat) => ({
              where: { id: mat.id || "" },
              update: { ...mat },
              create: { ...mat },
            })) as any,
        },

        objectives: {
          upsert:
            data.objectives?.map((obj) => ({
              where: { id: obj.id || "" },
              update: { ...obj },
              create: { ...obj },
            })) as any,
        },

        quiz: {
          upsert:
            data.quiz?.map((q) => ({
              where: { id: q.id || "" },
              update: {
                title: q.quiz_title,
                description: q.quiz_description,
                duration: q.quiz_duration,
                passingScore: q.quiz_score,
                questions: {
                  upsert:
                    q.questions?.map((ques) => ({
                      where: { id: ques.id || "" },
                      update: { 
                        question: ques.question_name,
                        options: [],
                        correctAnswer: "",
                        points: 1,
                        order: 0
                      },
                      create: { 
                        question: ques.question_name!,
                        options: [],
                        correctAnswer: "",
                        points: 1,
                        order: 0
                      },
                    })) || [],
                },
              },
              create: {
                title: q.quiz_title!,
                description: q.quiz_description!,
                duration: q.quiz_duration!,
                passingScore: q.quiz_score!,
                courseId: id,
              },
            })) || [],
        },
      },
      include: {
        module: {
          include: {
            lesson: true
          }
        },
        material: true,
        quiz: {
          include: {
            questions: true
          }
        }
      }
    });

    return {
      message: "Course and relations updated successfully",
      data: updateCourse,
    };
  }

  @Security("bearerAuth")
  @Delete("delete-course/{id}")
  public async DeleteCourse(@Path() id: string) {
    const deleteCourse = await prisma.course.delete({
      where: { id },
    });

    this.setStatus(200);
    return {
      message: "Course deleted successfully",
      data: deleteCourse,
    };
  }

  // FILE UPLOAD ENDPOINTS

  @Post("/upload-course-image/{courseId}")
  @Security("bearerAuth")
  public async UploadCourseImage(
    @Path() courseId: string,
    @Body() body: { 
      file: string;
      fileName: string;
      mimeType: string;
    }
  ): Promise<any> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });

      if (!course) {
        this.setStatus(404);
        return { message: "Course not found" };
      }

      const fileBuffer = Buffer.from(body.file, 'base64');

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
        data: { course_image: url }
      });

      this.setStatus(200);
      return {
        message: "Course image uploaded successfully",
        data: {
          courseId: updatedCourse.id,
          imageUrl: updatedCourse.course_image
        }
      };

    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to upload course image",
        error: error.message
      };
    }
  }

  @Post("/upload-lesson-video/{courseId}/{moduleId}")
  @Security("bearerAuth")
  public async UploadLessonVideo(
    @Path() courseId: string,
    @Path() moduleId: string,
    @Body() body: {
      file: string;
      fileName: string;
      mimeType: string;
      lessonTitle: string;
      duration?: number;
    }
  ): Promise<any> {
    try {
      const module = await prisma.module.findFirst({
        where: { 
          id: moduleId,
          courseId: courseId 
        }
      });

      if (!module) {
        this.setStatus(404);
        return { message: "Module not found in this course" };
      }

      const fileBuffer = Buffer.from(body.file, 'base64');

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
          lesson_title: body.lessonTitle,
          lesson_video: url,
          moduleId: moduleId,
          duration: body.duration || 0
        },
        include: {
          module: {
            select: {
              id: true,
              module_title: true,
              course: {
                select: {
                  id: true,
                  course_title: true
                }
              }
            }
          }
        }
      });

      this.setStatus(201);
      return {
        message: "Lesson video uploaded successfully",
        data: newLesson
      };

    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to upload lesson video",
        error: error.message
      };
    }
  }

  @Post("/upload-course-material/{courseId}")
  @Security("bearerAuth")
  public async UploadCourseMaterial(
    @Path() courseId: string,
    @Body() body: {
      file: string;
      fileName: string;
      mimeType: string;
      materialTitle: string;
      materialDescription?: string;
      pages?: number;
    }
  ): Promise<any> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });

      if (!course) {
        this.setStatus(404);
        return { message: "Course not found" };
      }

      const fileBuffer = Buffer.from(body.file, 'base64');

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
          material_title: body.materialTitle,
          material_description: body.materialDescription as string,
          material_pages: body.pages || 0,
          material_document: url,
          courseId: courseId
        },
        include: {
          course: {
            select: {
              id: true,
              course_title: true
            }
          }
        }
      });

      this.setStatus(201);
      return {
        message: "Course material uploaded successfully",
        data: newMaterial
      };

    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to upload course material",
        error: error.message
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
            course_title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    this.setStatus(200);
    return {
      message: "Course materials fetched successfully",
      data: materials,
      count: materials.length
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
        ...body as any
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
            course_title: true
          }
        },
        lesson: true,
        _count: {
          select: {
            lesson: true
          }
        }
      }
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
            order: 'asc'
          }
        },
        course: {
          select: {
            id: true,
            course_title: true
          }
        }
      }
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
    @Body() body: {
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
    @Body() body: {
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
            create: body.questions.map(question => ({
              question: question.question,
              options: question.options,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              points: question.points || 1,
              order: question.order,
            }))
          }
        },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              question: true,
              options: true,
              order: true,
              points: true
            }
          },
          course: {
            select: {
              id: true,
              course_title: true
            }
          }
        }
      });

      this.setStatus(201);
      return {
        message: "Quiz created successfully",
        data: newQuiz
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to create quiz",
        error: error.message
      };
    }
  }

  // ... REST OF YOUR QUIZ METHODS ...
}