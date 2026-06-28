import prisma from "../db";
import { generateCertificate } from "./bannerService";

/**
 * Auto-generates a certificate when a course is completed.
 * Safe to call multiple times — returns existing certificate if already issued.
 */
export async function awardCertificateIfCompleted(
  userId: string,
  courseId: string,
  enrollmentId: string,
): Promise<{ certificateUrl: string | null; isNew: boolean }> {
  try {
    // Guard: only issue for genuinely completed enrollments
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, userId, courseId, status: "COMPLETED" },
      include: {
        user: { select: { first_name: true, last_name: true } },
        course: { select: { course_title: true } },
      },
    });

    if (!enrollment) {
      return { certificateUrl: null, isNew: false };
    }

    // Idempotency check — never issue twice
    const existing = await prisma.certificate.findFirst({
      where: { enrollmentId, courseId, userId },
    });

    if (existing) {
      return { certificateUrl: existing.certificateImageURL, isNew: false };
    }

    const completionDate = enrollment.completedAt ?? new Date();
    const formattedDate = completionDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const certificateUrl = await generateCertificate({
      user_name: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
      date_completed: formattedDate,
      task_completed: "Course Completion",
      course_title: enrollment.course.course_title,
    });

    await prisma.certificate.create({
      data: {
        certificateType: "COURSE",
        certificateImageURL: certificateUrl,
        courseId,
        userId,
        enrollmentId,
      },
    });

    return { certificateUrl, isNew: true };
  } catch (error) {
    // Certificate failure must never crash the main flow
    console.error("Certificate generation failed silently:", error);
    return { certificateUrl: null, isNew: false };
  }
}