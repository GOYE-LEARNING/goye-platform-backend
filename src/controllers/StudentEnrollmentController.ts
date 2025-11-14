import {
  Controller,
  Post,
  Request,
  Route,
  Security,
  Tags,
  Path,
  Get,
} from "tsoa";
import prisma from "../db";
@Route("enroll")
@Tags("Student Enrollment Course APIs")
export class StudentEnrollmentController extends Controller {
  @Security("bearerAuth")
  @Post("/student-enroll/{courseId}")
  public async StudentEnroll(
    @Request() req: any,
    @Path() courseId: string
  ): Promise<any> {
    const userId = req.user?.id;
    const existingRole = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingRole) {
      this.setStatus(401);
      return {
        message: "You have enrolled already",
        status: 401,
      };
    }

    const studentEnroll = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        startedAt: new Date(),
      },

      select: {
        enrolledAt: true,
        status: true,
        startedAt: true,
        createdAt: true,
      },
    });

    if (!userId) {
      this.setStatus(400);
      return {
        message: "This enrollment cannot be made by this user",
      };
    }

    this.setStatus(200);
    return {
      message: "Enrollment succefull",
      data: studentEnroll,
    };
  }

  @Security("bearerAuth")
  @Get("/get-courses-enrolled-by-student")
  public async GetCoursesEnrolledByStudent(@Request() req: any) {
    const userId = req.user?.id;
    const studentEnrollments = await prisma.enrollment.findMany({
      where: {
        userId,
      },
      select: {
        course: {
          select: {
            course_title: true,
            course_description: true,
            course_short_description: true,
            course_image: true,
            course_level: true,
            material: {
              select: {
                material_title: true,
                material_description: true,
                material_document: true,
                material_pages: true,
                courseId: true,
              },
            },
            module: {
              select: {
                module_title: true,
                module_description: true,
                module_duration: true,
                courseId: true,
                _count: {
                  select: {
                    lesson: true,
                  },
                },
              },
            },
            _count: {
              select: {
                quiz: true,
              },
            },
            objectives: {
              select: {
                objective_title1: true,
                objective_title2: true,
                objective_title3: true,
                objective_title4: true,
                objective_title5: true,
              },
            },
          },
        },
      },
    });

    if (!userId) {
      this.setStatus(400);
      return {
        message: "This enrollment cannot be made by this user",
      };
    }

    if (studentEnrollments.length === 0) {
      this.setStatus(200);
      return {
        message: "No courses enrolled yet",
        data: [],
      };
    }

    this.setStatus(200);
    return {
      message: "Student Courses fetched succfully",
      studentEnrollments,
    };
  }
}
