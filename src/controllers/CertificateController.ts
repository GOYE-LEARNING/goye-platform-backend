// controllers/CertificateController.ts
import {
  Controller,
  Post,
  Get,
  Path,
  Request,
  Security,
  Tags,
  Body,
  Route,
} from "tsoa";
import prisma from "../db";
import { generateCertificate } from "../services/bannerService";
import {
  CacheKeys,
  TTL,
  invalidateKeys,
  updateDataWithRedis,
  useCacheAside,
} from "../utils/redis";

interface GenerateCertificateBody {
  enrollmentId: string;
  courseId: string;
}

@Tags("Certificate")
@Route("certificate")
export class CertificateController extends Controller {
  
  /**
   * Generate a certificate for a completed course
   */
  @Security("bearerAuth")
  @Post("/generate")
  public async generateCertificate(
    @Body() body: GenerateCertificateBody,
    @Request() req: any
  ) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { error: "Unauthorized" };
    }

    try {
      const { enrollmentId, courseId } = body;

      // Check if enrollment exists and is completed
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          id: enrollmentId,
          userId: userId,
          courseId: courseId,
          status: "COMPLETED",
        },
        include: {
          course: true,
          user: true,
        },
      });

      if (!enrollment) {
        this.setStatus(404);
        return {
          error: "Course not completed or enrollment not found",
        };
      }

      // Check if certificate already exists
      const existingCertificate = await prisma.certificate.findFirst({
        where: {
          enrollmentId: enrollment.id,
          courseId: enrollment.courseId,
          userId: enrollment.userId,
        },
      });

      if (existingCertificate) {
        this.setStatus(200);
        return {
          success: true,
          certificateUrl: existingCertificate.certificateImageURL,
          certificateId: existingCertificate.id,
          message: "Certificate already exists",
        };
      }

      // Format date
      const completionDate = enrollment.completedAt || new Date();
      const formattedDate = completionDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Generate certificate using Bannerbear
      const certificateUrl = await generateCertificate({
        user_name: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
        date_completed: formattedDate,
        task_completed: "Course Completion",
        course_title: enrollment.course.course_title,
      });

      // Save certificate to database
      const certificate = await prisma.certificate.create({
        data: {
          certificateType: "COURSE",
          certificateImageURL: certificateUrl,
          courseId: enrollment.courseId,
          userId: enrollment.userId,
          enrollmentId: enrollment.id,
        },
      });

      // A new certificate changes both the user's list and the per-course
      // "do I have one?" answer, so clear them together — leaving the check
      // cached is what makes the UI keep offering "Generate" after it's done.
      await updateDataWithRedis(userId, ["certificates"]);
      await invalidateKeys(
        CacheKeys.userCertificateForCourse(userId, enrollment.courseId),
      );

      this.setStatus(201);
      return {
        success: true,
        certificateUrl: certificate.certificateImageURL,
        certificateId: certificate.id,
        message: "Certificate generated successfully",
      };
    } catch (error) {
      console.error("Certificate generation error:", error);
      this.setStatus(500);
      return {
        error: "Failed to generate certificate",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get certificate by ID
   */
  @Security("bearerAuth")
  @Get("fetch-certificate-by-id/{certificateId}")
  public async getCertificate(
    @Path() certificateId: string,
    @Request() req: any
  ) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { error: "Unauthorized" };
    }

    try {
      const certificate = await prisma.certificate.findFirst({
        where: {
          id: certificateId,
          userId: userId,
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

      if (!certificate) {
        this.setStatus(404);
        return { error: "Certificate not found" };
      }

      this.setStatus(200);
      return {
        success: true,
        data: certificate,
      };
    } catch (error) {
      console.error("Error fetching certificate:", error);
      this.setStatus(500);
      return {
        error: "Failed to fetch certificate",
      };
    }
  }

  /**
   * Get all certificates for the current user
   */
  @Security("bearerAuth")
  @Get("/user/certificates")
  public async getUserCertificates(@Request() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { error: "Unauthorized" };
    }

    try {
      // Certificates are immutable once issued and only ever appended to, so
      // this tolerates a long TTL — and the one write path above clears it.
      const certificates = await useCacheAside(
        CacheKeys.userCertificates(userId),
        TTL.hour,
        () =>
          prisma.certificate.findMany({
            where: {
              userId: userId,
            },
            include: {
              course: {
                select: {
                  id: true,
                  course_title: true,
                  course_image: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          }),
      );

      this.setStatus(200);
      return {
        success: true,
        data: certificates,
        count: certificates.length,
      };
    } catch (error) {
      console.error("Error fetching user certificates:", error);
      this.setStatus(500);
      return {
        error: "Failed to fetch certificates",
      };
    }
  }

  /**
   * Check if a certificate exists for a specific course
   */
  @Security("bearerAuth")
  @Get("/check/{courseId}")
  public async checkCertificate(
    @Path() courseId: string,
    @Request() req: any
  ) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { error: "Unauthorized" };
    }

    try {
      // Polled by the course page on every visit to decide whether to show
      // the download or the generate button.
      //
      // Wrapped in an object on purpose: "no certificate yet" is the common
      // answer here, and useCacheAside declines to cache a bare null — so
      // returning the row directly would leave the hot path uncached and save
      // nothing. The wrapper makes the negative answer cacheable too, and the
      // generate path above clears this exact key.
      const { certificate } = await useCacheAside(
        CacheKeys.userCertificateForCourse(userId, courseId),
        TTL.hour,
        async () => ({
          certificate: await prisma.certificate.findFirst({
            where: {
              userId: userId,
              courseId: courseId,
            },
          }),
        }),
      );

      this.setStatus(200);
      return {
        success: true,
        hasCertificate: !!certificate,
        certificate: certificate || null,
      };
    } catch (error) {
      console.error("Error checking certificate:", error);
      this.setStatus(500);
      return {
        error: "Failed to check certificate",
      };
    }
  }
}