import { Plans } from "@prisma/client";
import prisma from "../db";

export async function Limitations(
  planId: string,
  userId?: string,
  orgId?: string,
) {
  try {
    const getPlans = await prisma.pricingHistory.findFirst({
      where: {
        id: planId,
        userId: userId ?? null,
        organizationId: orgId ?? null,
      },
    });
    const course = await prisma.course.count({
      where: {
        organizationId: orgId ?? null,
        createdUserId: userId ?? null,
      },
    });
    const group = await prisma.group.count({
      where: {
        userId: userId ?? null,
      },
    });
    const enrollCourses = await prisma.enrollment.count({
      where: {
        userId: userId ?? null,
        organizationId: orgId ?? null,
      },
    });
    const joinedGroup = await prisma.joinedGroup.count({
      where: {
        studentId: userId,
      },
    });

    if (getPlans.plans == "FREEMIUM_USER") {
      if (enrollCourses >= 2) {
        return {
          message: "You have exceeded your limit to enroll in a course.",
          status: "LIMIT_EXCEEDED",
        };
      }

      if (joinedGroup >= 2) {
        return {
          message: "You have exceeded your limit to join a group",
          status: "LIMIT_EXCEEDED",
        };
      }
    }
  } catch (error) {
    console.error(error);
  }
}
