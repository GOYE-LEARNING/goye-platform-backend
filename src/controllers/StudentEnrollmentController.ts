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
import { NotificationService, Role } from "../services/notificationServices";
import {
  ActionType,
  GamificationService,
  XP_CONFIG,
} from "../services/gamificationService";
import { Limitations } from "../utils/functionLimitations";

@Route("enroll")
@Tags("Student Enrollment Course APIs")
export class StudentEnrollmentController extends Controller {
  @Security("bearerAuth")
  @Post("/student-enroll/{courseId}")
  public async StudentEnroll(
    @Request() req: any,
    @Path() courseId: string,
  ): Promise<any> {
    const userId = req.user?.id;
    const planId = req.user?.planId;
    if (!userId) {
      this.setStatus(400);
      return {
        message: "This enrollment cannot be made by this user",
      };
    }
    // Check userId FIRST before checking enrollment
    const limitations = await Limitations(planId, courseId, null, userId, null); //Limitations On Enrollment
    if (!limitations || limitations.status !== "OK") {
      this.setStatus(400);
      return (
        limitations || {
          message: "Something went wrong with plan validation",
          status: "ERROR",
        }
      );
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        createdByDetails: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
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
        status: {
          in: ["COMPLETED", "ENROLLED", "IN_PROGRESS"],
        },
      },
    });

    const checkIfDropped = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
        status: {
          in: ["DROPPED"],
        },
      },
    });

    if (checkIfDropped) {
      this.setStatus(400);
      return {
        message:
          "You have dropped this course, To continue you have to please report to us, before we grant you access. It will take about 24hrs.",
        status: 400,
      };
    }

    if (existingEnrollment) {
      this.setStatus(400);
      return {
        message: "You have already enrolled in this course",
        status: 400,
      };
    }

    // Create enrollment
    const studentEnroll = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        startedAt: new Date(),
        status: "ENROLLED",
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email_address: true,
          },
        },
        course: {
          select: {
            id: true,
            course_title: true,
            course_description: true,
          },
        },
      },
    });

    // Award XP for course enrollment
    const gamificationResult =
      await GamificationService.AddPointsWithGamification(
        userId,
        ActionType.COURSE_ENROLLMENT,
        { courseId },
      );

    // Send notification to instructor
    await NotificationService.createNotification({
      message: `${studentEnroll.user.first_name} ${studentEnroll.user.last_name} just joined your course, ${studentEnroll.course.course_title}.`,
      title: `New Enrollment`,
      type: "enrollment",
      role: Role.INSTRUCTOR,
      to: Role.STUDENT,
      userId,
      courseId,
    });

    // Send notification to student
    await NotificationService.createNotification({
      message: `You have successfully enrolled in ${studentEnroll.course.course_title}. Start your learning journey now!`,
      title: `Enrollment Successful`,
      type: "enrollment",
      role: Role.STUDENT,
      to: Role.STUDENT,
      userId,
      courseId,
    });

    this.setStatus(201);
    return {
      message: "Enrollment successful! 🎉",
      data: studentEnroll,
      gamification: {
        pointsEarned: gamificationResult.data?.pointsAdded,
        leveledUp: gamificationResult.data?.leveledUp,
        newLevel: gamificationResult.data?.newLevel,
        badgesEarned: gamificationResult.data?.badgesEarned,
      },
    };
  }

  @Security("bearerAuth")
  @Get("/get-courses-enrolled-by-student")
  public async GetCoursesEnrolledByStudent(@Request() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return {
        message: "User not authenticated",
      };
    }

    const studentEnrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        status: {
          in: ["ENROLLED", "IN_PROGRESS", "COMPLETED"],
        },
      },
      select: {
        id: true,
        status: true,
        enrolledAt: true,
        startedAt: true,
        completedAt: true,
        score: true,
        course: {
          select: {
            id: true,
            course_title: true,
            course_description: true,
            course_short_description: true,
            course_image: true,
            course_level: true,
            point: true,
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
                    duration: true,
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
                passingScore: true,
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
      orderBy: {
        enrolledAt: "desc",
      },
    });

    // Get completed lessons for progress calculation
    const completedLessons = await prisma.progress.findMany({
      where: {
        userId,
        progressBar: { gte: 100 },
      },
      select: {
        lessonId: true,
      },
    });

    const completedLessonIds = new Set(completedLessons.map((l) => l.lessonId));

    // Calculate progress for each course
    const coursesWithProgress = studentEnrollments.map((enrollment) => {
      const allLessons = enrollment.course.module.flatMap((m) => m.lesson);
      const totalLessons = allLessons.length;
      const completedInCourse = allLessons.filter((l) =>
        completedLessonIds.has(l.id),
      ).length;

      const progressPercentage =
        totalLessons > 0 ? (completedInCourse / totalLessons) * 100 : 0;

      return {
        enrollment_id: enrollment.id,
        enrollment_status: enrollment.status,
        enrollment_date: enrollment.enrolledAt,
        started_at: enrollment.startedAt,
        completed_at: enrollment.completedAt,
        course_score: enrollment.score,
        course_progress: {
          percentage: Math.round(progressPercentage),
          completed_lessons: completedInCourse,
          total_lessons: totalLessons,
        },
        course: {
          ...enrollment.course,
          total_materials: enrollment.course.material.length,
          total_modules: enrollment.course.module.length,
          total_lessons: totalLessons,
          total_quizzes: enrollment.course.quiz.length,
        },
      };
    });

    // Get user's total XP
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { point: true, level: true },
    });

    const levelInfo = GamificationService.calculateLevel(user?.point || 0);

    this.setStatus(200);
    return {
      message: "Student courses fetched successfully",
      data: {
        user_stats: {
          total_xp: user?.point || 0,
          current_level: user?.level || levelInfo.name,
          level_number: levelInfo.level,
          next_level_xp: levelInfo.nextLevelXP,
          progress_to_next_level: levelInfo.progressToNext,
        },
        total_courses: studentEnrollments.length,
        completed_courses: studentEnrollments.filter(
          (e) => e.status === "COMPLETED",
        ).length,
        in_progress_courses: studentEnrollments.filter(
          (e) => e.status === "IN_PROGRESS" || e.status === "ENROLLED",
        ).length,
        courses: coursesWithProgress,
      },
    };
  }

  @Security("bearerAuth")
  @Post("/exit-course/{courseId}")
  public async ExitCourse(@Path() courseId: string, @Request() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return {
        message: "User not authenticated",
      };
    }

    try {
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, course_title: true },
      });

      if (!course) {
        this.setStatus(404);
        return {
          message: "Course not found",
        };
      }

      // Check if user is enrolled in the course
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId,
          courseId,
        },
      });

      if (!enrollment) {
        this.setStatus(404);
        return {
          message: "You are not enrolled in this course",
        };
      }

      // Check if course is already completed
      if (enrollment.status === "COMPLETED") {
        this.setStatus(400);
        return {
          message:
            "Cannot exit a completed course. The course has already been finished.",
        };
      }

      // Check if already dropped
      if (enrollment.status === "DROPPED") {
        this.setStatus(400);
        return {
          message: "You have already exited this course",
        };
      }

      // Calculate current progress before exiting
      const allLessons = await prisma.lesson.findMany({
        where: {
          module: {
            courseId: courseId,
          },
        },
        select: { id: true },
      });

      const completedLessons = await prisma.progress.findMany({
        where: {
          userId,
          lessonId: { in: allLessons.map((l) => l.id) },
          progressBar: { gte: 100 },
        },
        select: { lessonId: true },
      });

      const totalLessons = allLessons.length;
      const completedCount = completedLessons.length;
      const progressPercentage =
        totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

      // Update enrollment status to DROPPED
      const updatedEnrollment = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "DROPPED",
        },
        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      // Optional: Keep progress records for re-enrollment analytics
      // Comment this out if you want to keep progress data
      // const lessonIds = allLessons.map(l => l.id);
      // await prisma.progress.deleteMany({
      //   where: {
      //     userId,
      //     lessonId: { in: lessonIds },
      //   },
      // });

      await GamificationService.DeductPoints(
        userId,
        XP_CONFIG.COURSE_ENROLLMENT,
        `Points was deducted from ${updatedEnrollment.user.first_name} ${updatedEnrollment.user.last_name} because he exited a course enrollent.`,
      );

      this.setStatus(200);
      return {
        message: `Successfully exited from course: ${course.course_title}`,
        data: {
          enrollment_id: enrollment.id,
          course_id: courseId,
          course_title: course.course_title,
          status: "DROPPED",
          exited_at: new Date().toISOString(),
          enrolled_at: enrollment.enrolledAt,
          progress_at_exit: {
            percentage: Math.round(progressPercentage),
            completed_lessons: completedCount,
            total_lessons: totalLessons,
          },
        },
      };
    } catch (error: any) {
      console.error("Error exiting course:", error);
      this.setStatus(500);
      return {
        message: "Failed to exit course",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-all-students")
  public async GetAllStudents(@Request() req: any): Promise<any> {
    try {
      const userId = req.user?.id;
      const orgId = req.org?.id;
      const orgRole = req.org?.organization_role;
      const userRole = req.user?.role;

      // Check authorization - allow both instructors and org admins
      if (!userId) {
        this.setStatus(401);
        return {
          message: "Authentication required",
          data: null,
        };
      }

      // Determine if user is authorized (instructor OR org admin)
      const isInstructor =
        userRole === "instructor" || userRole == "INSTRUCTOR";
      const isOrgAdmin =
        orgRole === "admin" ||
        orgRole === "owner" ||
        orgRole == "Administrator";

      if (!isInstructor && !isOrgAdmin) {
        this.setStatus(401);
        return {
          message:
            "Only instructors or organization admins can view enrolled students",
          data: null,
        };
      }

      // Build the where clause based on user type
      let whereClause: any = {};

      if (orgId && isOrgAdmin) {
        // Organization admin - fetch all students from organization's courses
        whereClause = {
          course: {
            organizationId: orgId,
          },
        };
      } else {
        // Individual instructor - fetch only their own courses' students
        whereClause = {
          course: {
            createdUserId: userId,
          },
        };
      }

      const enrollments = await prisma.enrollment.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email_address: true,
              user_pic: true,
              level: true,
              point: true,
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
              createdUserId: true,
              organizationId: true,
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
          const levelInfo = GamificationService.calculateLevel(
            enrollment.user.point || 0,
          );

          studentsMap.set(studentId, {
            student_id: enrollment.user.id,
            full_name: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
            first_name: enrollment.user.first_name,
            last_name: enrollment.user.last_name,
            email: enrollment.user.email_address,
            profile_picture: enrollment.user.user_pic,
            level: enrollment.user.level || levelInfo.name,
            level_number: levelInfo.level,
            total_xp: enrollment.user.point || 0,
            is_online: enrollment.user.isOnline,
            joined_date: enrollment.user.createdAt,
            last_active: enrollment.user.lastActive,
            total_courses_enrolled: 0,
            total_completed_courses: 0,
            total_in_progress_courses: 0,
            total_organizations: 0,
            organizations: [],
            courses: [],
          });
        }

        const student = studentsMap.get(studentId);
        student.total_courses_enrolled += 1;

        if (enrollment.status === "COMPLETED") {
          student.total_completed_courses += 1;
        } else if (
          enrollment.status === "IN_PROGRESS" ||
          enrollment.status === "ENROLLED"
        ) {
          student.total_in_progress_courses += 1;
        }

        // Track organization info if available
        if (enrollment.course.organizationId) {
          student.total_organizations += 1;
          if (
            !student.organizations.includes(enrollment.course.organizationId)
          ) {
            student.organizations.push(enrollment.course.organizationId);
          }
        }

        student.courses.push({
          course_id: enrollment.course.id,
          course_title: enrollment.course.course_title,
          course_image: enrollment.course.course_image,
          course_level: enrollment.course.course_level,
          enrollment_id: enrollment.id,
          enrollment_date: enrollment.enrolledAt,
          enrollment_status: enrollment.status,
          started_at: enrollment.startedAt,
          completed_at: enrollment.completedAt,
          organization_id: enrollment.course.organizationId,
          instructor_id: enrollment.course.createdUserId,
        });
      });

      const students = Array.from(studentsMap.values());

      // Calculate overall stats
      const totalXP = students.reduce((sum, s) => sum + (s.total_xp || 0), 0);
      const totalCoursesCompleted = students.reduce(
        (sum, s) => sum + s.total_completed_courses,
        0,
      );

      // Add context about who is viewing
      const viewContext =
        orgId && isOrgAdmin
          ? { view_type: "organization", organization_id: orgId }
          : { view_type: "individual", instructor_id: userId };

      this.setStatus(200);
      return {
        message: "Students fetched successfully",
        data: {
          ...viewContext,
          stats: {
            total_students: students.length,
            total_enrollments: enrollments.length,
            total_xp_earned: totalXP,
            total_courses_completed: totalCoursesCompleted,
            average_xp_per_student:
              students.length > 0 ? Math.round(totalXP / students.length) : 0,
          },
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
    @Path() studentId: string,
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
            createdUserId: userId,
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
              point: true,
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
              point: true,
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

      // Get completed lessons for this student
      const allLessonsInCourses = await prisma.lesson.findMany({
        where: {
          module: {
            courseId: {
              in: enrollments.map((e) => e.courseId),
            },
          },
        },
        select: { id: true, module: { select: { courseId: true } } },
      });

      const completedLessons = await prisma.progress.findMany({
        where: {
          userId: studentId,
          lessonId: { in: allLessonsInCourses.map((l) => l.id) },
          progressBar: { gte: 100 },
        },
        select: { lessonId: true },
      });

      const completedLessonIds = new Set(
        completedLessons.map((l) => l.lessonId),
      );

      // Calculate progress per course
      const enrollmentsWithProgress = enrollments.map((enrollment) => {
        const courseLessons = allLessonsInCourses.filter(
          (l) => l.module.courseId === enrollment.courseId,
        );
        const completedInCourse = courseLessons.filter((l) =>
          completedLessonIds.has(l.id),
        ).length;

        const progressPercentage =
          courseLessons.length > 0
            ? (completedInCourse / courseLessons.length) * 100
            : 0;

        return {
          ...enrollment,
          progress_percentage: Math.round(progressPercentage),
          completed_lessons: completedInCourse,
          total_lessons: courseLessons.length,
        };
      });

      const student = enrollments[0].user;
      const levelInfo = GamificationService.calculateLevel(student.point || 0);
      const totalEnrollments = enrollments.length;
      const completedEnrollments = enrollments.filter(
        (e) => e.status === "COMPLETED",
      ).length;
      const inProgressEnrollments = enrollments.filter(
        (e) => e.status === "IN_PROGRESS" || e.status === "ENROLLED",
      ).length;

      // Get groups the student joined
      const groups = await prisma.group.findMany({
        where: {
          member: {
            some: {
              studentId,
            },
          },
        },
        include: {
          member: {
            where: { studentId },
            select: {
              joinedAt: true,
              point: true,
            },
          },
          _count: {
            select: { member: true },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Student details fetched successfully",
        data: {
          student: {
            id: student.id,
            full_name: `${student.first_name} ${student.last_name}`,
            email: student.email_address,
            profile_picture: student.user_pic,
            level: student.level || levelInfo.name,
            level_number: levelInfo.level,
            total_xp: student.point || 0,
            next_level_xp: levelInfo.nextLevelXP,
            progress_to_next_level: levelInfo.progressToNext,
            is_online: student.isOnline,
            joined_date: student.createdAt,
            last_active: student.lastActive,
          },
          enrollment_stats: {
            total_enrollments: totalEnrollments,
            completed_enrollments: completedEnrollments,
            in_progress_enrollments: inProgressEnrollments,
            completion_rate:
              totalEnrollments > 0
                ? Math.round((completedEnrollments / totalEnrollments) * 100)
                : 0,
          },
          enrollments: enrollmentsWithProgress.map((enrollment) => ({
            enrollment_id: enrollment.id,
            course_id: enrollment.course.id,
            course_title: enrollment.course.course_title,
            course_image: enrollment.course.course_image,
            course_level: enrollment.course.course_level,
            enrollment_status: enrollment.status,
            enrollment_date: enrollment.enrolledAt,
            started_at: enrollment.startedAt,
            completed_at: enrollment.completedAt,
            course_score: enrollment.score,
            progress_percentage: enrollment.progress_percentage,
            completed_lessons: enrollment.completed_lessons,
            total_lessons: enrollment.total_lessons,
          })),
          groups: groups.map((group) => ({
            id: group.id,
            group_title: group.group_title,
            group_image: group.group_image,
            joined_at: group.member[0]?.joinedAt,
            group_points: group.member[0]?.point || 0,
            total_members: group._count.member,
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

  @Security("bearerAuth")
  @Get("/check-if-enrolled/{courseId}")
  public async FetchCheckIfStudentEnrolled(
    @Request() req: any,
    @Path() courseId: string,
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      if (!userId) {
        this.setStatus(401);
        return {
          message: "This user is unauthorized",
        };
      }

      const courseExists = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      });

      if (!courseExists) {
        this.setStatus(404);
        return {
          message: "This course cannot be found",
        };
      }

      // Return just a boolean
      const enrollmentCount = await prisma.enrollment.count({
        where: {
          courseId: courseId,
          userId: userId,
          status: {
            in: ["COMPLETED", "ENROLLED", "IN_PROGRESS"],
          },
        },
      });

      // Also get user's progress in the course
      let progress = null;
      if (enrollmentCount > 0) {
        const completedLessons = await prisma.progress.count({
          where: {
            userId,
            courses: {
              some: { id: courseId },
            },
            progressBar: { gte: 100 },
          },
        });

        const totalLessons = await prisma.lesson.count({
          where: {
            module: {
              courseId,
            },
          },
        });

        progress = {
          completed_lessons: completedLessons,
          total_lessons: totalLessons,
          percentage:
            totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
        };
      }

      this.setStatus(200);
      return {
        message: "Fetched Successfully",
        data: {
          is_enrolled: enrollmentCount > 0,
          progress: progress,
        },
      };
    } catch (error) {
      console.error(error);
      this.setStatus(500);
      return {
        message: "An error occurred while checking enrollment status",
      };
    }
  }
}
