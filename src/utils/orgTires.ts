export const ORG_TIERS = {
  STARTER: {
    members: 200,
    courses: 20,
    groups: 30,
    studentsPerCourse: 100,
  },
  GROWTH: {
    members: 500,
    courses: 50,
    groups: "UNLIMITED" as const,
    studentsPerCourse: 300,
  },

  CHURCH_STARTER: {
    members: 250,
    courses: 30,
    groups: 40,
    studentsPerCourse: 100,
  },
  CHURCH_GROWTH: {
    members: 550,
    courses: 20,
    groups: "UNLIMITED" as const,
    studentsPerCourse: 350,
  },

  ENTERPRISE: {
    members: "UNLIMITED" as const,
    courses: "UNLIMITED" as const,
    groups: "UNLIMITED" as const,
    studentsPerCourse: "UNLIMITED" as const,
  },
};
