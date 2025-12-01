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

    // FIX 1: Check userId FIRST before checking enrollment
    if (!userId) {
      this.setStatus(400);
      return {
        message: "This enrollment cannot be made by this user",
      };
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      this.setStatus(404);
      return {
        message: "Course not found",
      };
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      this.setStatus(400); // FIX 2: Changed from 401 to 400 (Bad Request)
      return {
        message: "You have already enrolled in this course",
        status: 400,
      };
    }

    const studentEnroll = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        startedAt: new Date(),
        status: "ENROLLED", // FIX 3: Set initial status
      },
      select: {
        id: true, // FIX 4: Include enrollment ID
        enrolledAt: true,
        status: true,
        startedAt: true,
        progress: true,
      },
    });

    this.setStatus(201); // FIX 5: Use 201 for resource creation
    return {
      message: "Enrollment successful", // FIX 6: Fixed spelling
      data: studentEnroll,
    };
  }

  @Security("bearerAuth")
  @Get("/get-courses-enrolled-by-student")
  public async GetCoursesEnrolledByStudent(@Request() req: any) {
    const userId = req.user?.id;

    // FIX 7: Check userId FIRST
    if (!userId) {
      this.setStatus(401); // FIX 8: Changed to 401 (Unauthorized)
      return {
        message: "User not authenticated",
      };
    }

    const studentEnrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        status: {
          in: ["ENROLLED", "IN_PROGRESS", "COMPLETED"], // FIX 9: Include all statuses
        },
      },
      select: {
        id: true, // FIX 10: Include enrollment ID
        status: true,
        progress: true,
        enrolledAt: true,
        startedAt: true,
        completedAt: true,
        course: {
          select: {
            id: true, // FIX 11: Include course ID
            course_title: true,
            course_description: true,
            course_short_description: true,
            course_image: true,
            course_level: true,
            material: {
              select: {
                id: true,
                material_title: true,
                material_description: true,
                material_document: true,
                material_pages: true,
              },
            },
            module: {
              select: {
                id: true,
                module_title: true,
                module_description: true,
                module_duration: true,
                lesson: {
                  select: {
                    id: true,
                    lesson_title: true,
                    lesson_video: true,
                  },
                },
                _count: {
                  select: {
                    lesson: true,
                  },
                },
              },
            },
            quiz: {
              select: {
                id: true,
                title: true,
                description: true,
                _count: {
                  select: {
                    questions: true,
                  },
                },
              },
            },
            objectives: {
              select: {
                id: true,
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

    if (studentEnrollments.length === 0) {
      this.setStatus(200);
      return {
        message: "No courses enrolled yet",
        data: [],
      };
    }

    // FIX 12: Better response structure
    const courses = studentEnrollments.map(enrollment => ({
      enrollment_id: enrollment.id,
      enrollment_status: enrollment.status,
      progress: enrollment.progress,
      enrollment_date: enrollment.enrolledAt,
      started_at: enrollment.startedAt,
      completed_at: enrollment.completedAt,
      course: {
        ...enrollment.course,
        total_materials: enrollment.course.material.length,
        total_modules: enrollment.course.module.length,
        total_lessons: enrollment.course.module.reduce(
          (acc, module) => acc + module._count.lesson,
          0
        ),
        total_quizzes: enrollment.course.quiz.length,
      },
    }));

    this.setStatus(200);
    return {
      message: "Student courses fetched successfully", // FIX 13: Fixed spelling
      data: {
        total_courses: studentEnrollments.length,
        completed_courses: studentEnrollments.filter(e => e.status === "COMPLETED").length,
        in_progress_courses: studentEnrollments.filter(e => 
          e.status === "IN_PROGRESS" || e.status === "ENROLLED"
        ).length,
        courses: courses,
      },
    };
  }

  @Security("bearerAuth")
  @Get("/fetch-all-students")
  public async GetAllStudents(@Request() req: any): Promise<any> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== "instructor") {
        this.setStatus(401);
        return {
          message: "Only instructors can view enrolled students",
          data: null,
        };
      }

      const enrollments = await prisma.enrollment.findMany({
        where: {
          course: {
            createdUserId: userId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email_address: true,
              user_pic: true,
              level: true,
              isOnline: true,
              createdAt: true,
              lastActive: true,
            },
          },
          course: {
            select: {
              id: true,
              course_title: true,
              course_image: true,
              course_level: true,
            },
          },
        },
        orderBy: {
          enrolledAt: "desc",
        },
      });

      const studentsMap = new Map();

      enrollments.forEach((enrollment) => {
        const studentId = enrollment.user.id;

        if (!studentsMap.has(studentId)) {
          studentsMap.set(studentId, {
            student_id: enrollment.user.id,
            full_name: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
            first_name: enrollment.user.first_name,
            last_name: enrollment.user.last_name,
            email: enrollment.user.email_address,
            profile_picture: enrollment.user.user_pic,
            level: enrollment.user.level,
            is_online: enrollment.user.isOnline,
            joined_date: enrollment.user.createdAt,
            last_active: enrollment.user.lastActive,
            total_courses_enrolled: 0,
            total_completed_courses: 0,
            total_in_progress_courses: 0,
            courses: [],
          });
        }

        const student = studentsMap.get(studentId);
        student.total_courses_enrolled += 1;
        
        if (enrollment.status === "COMPLETED") {
          student.total_completed_courses += 1;
        } else if (enrollment.status === "IN_PROGRESS" || enrollment.status === "ENROLLED") {
          student.total_in_progress_courses += 1;
        }

        student.courses.push({
          course_id: enrollment.course.id,
          course_title: enrollment.course.course_title,
          course_image: enrollment.course.course_image,
          course_level: enrollment.course.course_level,
          enrollment_id: enrollment.id,
          enrollment_date: enrollment.enrolledAt,
          enrollment_status: enrollment.status,
          progress: enrollment.progress,
          started_at: enrollment.startedAt,
          completed_at: enrollment.completedAt,
        });
      });

      const students = Array.from(studentsMap.values());

      this.setStatus(200);
      return {
        message: "Students fetched successfully",
        data: {
          total_students: students.length,
          total_enrollments: enrollments.length,
          students: students,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Error fetching students: " + error.message,
        data: null,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-student-details/{studentId}")
  public async GetAllStudentsById(
    @Request() req: any,
    @Path() studentId: string
  ): Promise<any> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== "instructor") {
        this.setStatus(401);
        return {
          message: "Only instructors can view enrolled students",
          data: null,
        };
      }

      const enrollments = await prisma.enrollment.findMany({
        where: {
          userId: studentId,
          course: {
            createdUserId: userId, // FIX 14: Only show courses by this tutor
          },
          status: {
            in: ["ENROLLED", "IN_PROGRESS", "COMPLETED"],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email_address: true,
              user_pic: true,
              level: true,
              createdAt: true,
              lastActive: true,
              isOnline: true,
            },
          },
          course: {
            select: {
              id: true,
              course_title: true,
              course_image: true,
              course_level: true,
              course_description: true,
              course_short_description: true,
            },
          },
        },
        orderBy: {
          enrolledAt: "desc",
        },
      });

      if (enrollments.length === 0) {
        this.setStatus(404);
        return {
          message: "No enrollments found for this student",
          data: null,
        };
      }

      const student = enrollments[0].user;
      const totalEnrollments = enrollments.length;
      const completedEnrollments = enrollments.filter(e => e.status === "COMPLETED").length;
      const inProgressEnrollments = enrollments.filter(e => 
        e.status === "IN_PROGRESS" || e.status === "ENROLLED"
      ).length;
      const averageProgress = enrollments.length > 0
        ? enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length
        : 0;

      this.setStatus(200);
      return {
        message: "Student details fetched successfully",
        data: {
          student: {
            id: student.id,
            full_name: `${student.first_name} ${student.last_name}`,
            email: student.email_address,
            profile_picture: student.user_pic,
            level: student.level,
            is_online: student.isOnline,
            joined_date: student.createdAt,
            last_active: student.lastActive,
          },
          enrollment_stats: {
            total_enrollments: totalEnrollments,
            completed_enrollments: completedEnrollments,
            in_progress_enrollments: inProgressEnrollments,
            completion_rate: totalEnrollments > 0 
              ? Math.round((completedEnrollments / totalEnrollments) * 100)
              : 0,
            average_progress: Math.round(averageProgress),
          },
          enrollments: enrollments.map(enrollment => ({
            enrollment_id: enrollment.id,
            course_id: enrollment.course.id,
            course_title: enrollment.course.course_title,
            course_image: enrollment.course.course_image,
            enrollment_status: enrollment.status,
            progress: enrollment.progress,
            enrollment_date: enrollment.enrolledAt,
            started_at: enrollment.startedAt,
            completed_at: enrollment.completedAt,
          })),
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Error fetching student: " + error.message,
        data: null,
      };
    }
  }
}