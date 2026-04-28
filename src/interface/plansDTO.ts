import { Plans, PlanDuration } from "@prisma/client";
import { usdToNaira } from "../utils/currency";
import { ORG_TIERS } from "../utils/orgTires";
type Role =
  | "invited_student"
  | "tutor"
  | "student"
  | "church"
  | "school"
  | "club";
type PlanDTO = {
  name: string;
  price_USD: number;
  price_NGN: number;
  type: Role;
  duration_plan: PlanDuration;
  limits: {
    courses?: number | "UNLIMITED";
    groups?: number | "UNLIMITED";
    enrolledCourses?: number | "UNLIMITED";
    joinedGroups?: number | "UNLIMITED";
    members?: number | "UNLIMITED";
    studentsPerCourse?: number | "UNLIMITED";
  };
};

// 🔒 Prevent NaN issues
function getEnvNumber(value: string | undefined, fallback = 0): number {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

function createPlan(
  name: string,
  type: Role,
  duration_plan: PlanDuration,
  price_USD: number,
  limits: PlanDTO["limits"],
): PlanDTO {
  return {
    name,
    type,
    duration_plan,
    price_USD,
    price_NGN: usdToNaira(price_USD),
    limits,
  };
}

export const PLAN_CONFIG: Record<Plans, PlanDTO> = {
  // =====================
  // FREE (STUDENT)
  // =====================
  FREEMIUM_USER: createPlan("Free Plan", "student", PlanDuration.FREE_PLAN, 0, {
    enrolledCourses: 5,
    joinedGroups: 10,
  }),

  // =====================
  // STUDENTS
  // =====================
  STUDENT_PLUS: createPlan(
    "Student Plus",
    "student",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.STUDENT_PLUS_MONTHLY),
    {
      enrolledCourses: 30,
      joinedGroups: 20,
    },
  ),

  STUDENT_UNLIMITED: createPlan(
    "Student Unlimited",
    "student",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.STUDENT_UNLIMITED_MONTHLY),
    {
      enrolledCourses: "UNLIMITED",
      joinedGroups: "UNLIMITED",
    },
  ),

  INVITED_STUDENT_UNLIMITED: createPlan(
    "Invited Student Unlimited",
    "invited_student",
    PlanDuration.FREE_PLAN,
    0,
    {
      enrolledCourses: "UNLIMITED",
      joinedGroups: "UNLIMITED",
    },
  ),

  // =====================
  // TUTORS
  // =====================
  TUTOR_PRO: createPlan(
    "Tutor Pro",
    "tutor",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.TUTOR_PRO_MONTHLY),
    {
      courses: 25,
      groups: 50,
      studentsPerCourse: 200,
    },
  ),

  TUTOR_ELITE: createPlan(
    "Tutor Elite",
    "tutor",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.TUTOR_ELITE_MONTHLY),
    {
      courses: "UNLIMITED",
      groups: "UNLIMITED",
      studentsPerCourse: "UNLIMITED",
    },
  ),

  // =====================
  // CHURCH
  // =====================
  CHURCH_STARTER: createPlan(
    "Church Starter",
    "church",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.CHURCH_STARTER),
    ORG_TIERS.CHURCH_STARTER,
  ),

  CHURCH_GROWTH: createPlan(
    "Church Growth",
    "church",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.CHURCH_GROWTH),
    ORG_TIERS.CHURCH_GROWTH,
  ),

  CHURCH_ENTERPRISE: createPlan(
    "Church Enterprise",
    "church",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.CHURCH_ENTERPRISE),
    ORG_TIERS.ENTERPRISE,
  ),

  // =====================
  // SCHOOL
  // =====================
  SCHOOL_STARTER: createPlan(
    "School Starter",
    "school",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.SCHOOL_STARTER),
    ORG_TIERS.STARTER,
  ),

  SCHOOL_GROWTH: createPlan(
    "School Growth",
    "school",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.SCHOOL_GROWTH),
    ORG_TIERS.GROWTH,
  ),

  SCHOOL_ENTERPRISE: createPlan(
    "School Enterprise",
    "school",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.SCHOOL_ENTERPRISE),
    ORG_TIERS.ENTERPRISE,
  ),

  // =====================
  // CLUB / NGO
  // =====================
  CLUB_STARTER: createPlan(
    "Club Starter",
    "club",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.CLUB_STARTER),
    ORG_TIERS.STARTER,
  ),

  CLUB_GROWTH: createPlan(
    "Club Growth",
    "club",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.CLUB_GROWTH),
    ORG_TIERS.GROWTH,
  ),

  CLUB_ENTERPRISE: createPlan(
    "Club Enterprise",
    "club",
    PlanDuration.MONTHLY_PLAN,
    getEnvNumber(process.env.CLUB_ENTERPRISE),
    ORG_TIERS.ENTERPRISE,
  ),
};
