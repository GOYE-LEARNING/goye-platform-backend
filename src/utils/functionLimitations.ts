import prisma from "../db";
import { PLAN_CONFIG } from "../interface/plansDTO";

export async function Limitations(
  planId: string,
  courseId?: string,
  groupId?: string,
  userId?: string,
  orgId?: string,
) {
  const getPlans = await prisma.pricingHistory.findFirst({
    where: { id: planId },
  });

  if (!getPlans) {
    throw new Error("Plan not found");
  }

  const planConfig = PLAN_CONFIG[getPlans.plans];

  const enrollCourses = await prisma.enrollment.count({
    where: { userId, },
  });

  const joinedGroup = await prisma.joinedGroup.count({
    where: { studentId: userId },
  });

  if (!userId) {
  return {
    status: "ERROR",
    message: "Invalid user",
  };
}

  // ✅ Enrolled Courses
  const enrollLimit = planConfig.limits.enrolledCourses;
  if (courseId && enrollLimit !== "UNLIMITED" && enrollLimit !== undefined) {
    if (enrollCourses >= enrollLimit) {
      return {
        message: "You have exceeded your limit to enroll in courses",
        status: "LIMIT_EXCEEDED",
      };
    }
  }

  // ✅ Joined Groups
  const groupLimit = planConfig.limits.joinedGroups;
  if (groupId && groupLimit !== "UNLIMITED" && groupLimit !== undefined) {
    if (joinedGroup >= groupLimit) {
      return {
        message: "You have exceeded your limit to join groups",
        status: "LIMIT_EXCEEDED",
      };
    }
  }

  return { status: "OK" };
}
