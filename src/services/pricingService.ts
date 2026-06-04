import crypto from "crypto";
import prisma from "../db";
import { response } from "express";
import { redisClient } from "../utils/redis";
import { IFlutterwaveTransferPayload } from "../interface/interfaces";
import { flw } from "../utils/flutterwave";
import { PLAN_CONFIG } from "../interface/plansDTO";
type Role = "INDIVIDUAL" | "ORGANIZATION" | "INVITED_INDIVIDUAL";
type PricingRoles = "student" | "tutor" | "organization";

interface PricingData {
  id: string;
  pricing_title: string;
  monthly_price: string;
  annually_price: string;
  pricing_description: string;
  pricing_offers: PricingOffers;
  section_roles: PricingRoles;
}

interface PricingOffers {
  list: string[];
}

export class PricingService {
  //Fetch pricing details
public static async FetchPricingDetails(): Promise<PricingData[]> {
  try {
    const data: PricingData[] = [
      // ==========================
      // STUDENT PLANS
      // ==========================
      {
        id: "student-1",
        pricing_title: "Free",
        monthly_price: "$0",
        annually_price: "",
        pricing_description:
          "Explore your faith, learn, connect, and grow at your own pace.",
        pricing_offers: {
          list: [
            "Enroll in up to 5 courses",
            "Join up to 4 groups",
            "Standard search and discovery",
            "Basic progress tracking",
            "Community discussions",
            "Course certificates",
          ],
        },
        section_roles: "student",
      },
      {
        id: "student-2",
        pricing_title: "Student Plus",
        monthly_price: "$10",
        annually_price: "$96",
        pricing_description:
          "For students who want personalized discipleship guidance and enhanced learning tools.",
        pricing_offers: {
          list: [
            "Enroll in up to 30 courses",
            "Join up to 20 groups",
            "AI-powered course recommendations",
            "Reflection journal",
            "Saved notes and bookmarks",
            "Downloadable course materials",
            "Priority access to new courses",
            "Enhanced progress tracking",
          ],
        },
        section_roles: "student",
      },
      {
        id: "student-3",
        pricing_title: "Student Unlimited",
        monthly_price: "$18",
        annually_price: "$180",
        pricing_description:
          "For dedicated disciples committed to continuous spiritual growth.",
        pricing_offers: {
          list: [
            "Unlimited course enrollments",
            "Unlimited group memberships",
            "AI lesson summaries and notes generation",
            "AI tutor matching",
            "Personalized learning pathways",
            "Certificate portfolio",
            "Full course history",
            "Early access to new courses",
            "Advanced learning insights",
          ],
        },
        section_roles: "student",
      },

      // ==========================
      // TUTOR PLANS
      // ==========================
      {
        id: "tutor-1",
        pricing_title: "Free",
        monthly_price: "$0",
        annually_price: "$0",
        pricing_description:
          "Start teaching and building your ministry presence.",
        pricing_offers: {
          list: [
            "Create up to 5 courses",
            "Create up to 10 groups",
            "Basic tutor profile",
            "Basic course analytics",
            "Student management tools",
          ],
        },
        section_roles: "tutor",
      },
      {
        id: "tutor-2",
        pricing_title: "Tutor Pro",
        monthly_price: "$20",
        annually_price: "$192",
        pricing_description:
          "For tutors ready to scale their impact and disciple more students.",
        pricing_offers: {
          list: [
            "Up to 25 courses",
            "Up to 50 groups",
            "Up to 200 students per course",
            "Advanced analytics dashboard",
            "AI course performance insights",
            "AI student engagement suggestions",
            "Priority course publishing",
          ],
        },
        section_roles: "tutor",
      },
      {
        id: "tutor-3",
        pricing_title: "Tutor Elite",
        monthly_price: "$40",
        annually_price: "$384",
        pricing_description:
          "For full-time Christian educators and ministry leaders.",
        pricing_offers: {
          list: [
            "Unlimited courses",
            "Unlimited groups",
            "Unlimited students",
            "AI lesson summaries",
            "AI tutor performance insights",
            "Advanced student analytics",
            "Course completion certificates",
            "Priority support",
          ],
        },
        section_roles: "tutor",
      },

      // ==========================
      // ORGANIZATION PLANS
      // ==========================
      {
        id: "org-1",
        pricing_title: "GOYE Pro",
        monthly_price: "$49",
        annually_price: "$490",
        pricing_description:
          "For growing churches, schools, ministries, and Christian organizations.",
        pricing_offers: {
          list: [
            "21-Day Free Trial",
            "Unlimited courses",
            "Unlimited groups",
            "Up to 500 members",
            "Advanced analytics",
            "Custom organization branding",
            "AI-powered course recommendations",
            "Certificate management",
            "Priority support",
            "Organization dashboard",
          ],
        },
        section_roles: "organization",
      },
      {
        id: "org-2",
        pricing_title: "GOYE Elite",
        monthly_price: "$149",
        annually_price: "$1490",
        pricing_description:
          "For large ministries, schools, and organizations operating at scale.",
        pricing_offers: {
          list: [
            "Everything in GOYE Pro",
            "Unlimited members",
            "AI tutor matching",
            "AI lesson summaries and notes generation",
            "Organization intelligence dashboard",
            "Advanced moderation tools",
            "Multiple administrators",
            "Advanced reporting",
            "Early access to new features",
            "WhatsApp AI Integration (Coming Soon)",
          ],
        },
        section_roles: "organization",
      },

      // ==========================
      // ENTERPRISE
      // ==========================
      {
        id: "org-3",
        pricing_title: "Enterprise",
        monthly_price: "Custom",
        annually_price: "Custom",
        pricing_description:
          "For denominations, national ministries, universities, and large Christian networks.",
        pricing_offers: {
          list: [
            "Everything in GOYE Elite",
            "Dedicated account manager",
            "Custom onboarding",
            "Custom integrations",
            "API access",
            "Advanced security controls",
            "Priority infrastructure",
            "Custom AI solutions",
            "Training and implementation support",
            "Service Level Agreement (SLA)",
          ],
        },
        section_roles: "organization",
      },
    ];

    return data;
  } catch (error: any) {
    console.error(error.message);
    return [];
  }
}
  // To generate code
  public static async GenerateNewPaymentForNewUser(data: {
    userId: string;
    type: Role;
    orgId: string;
  }): Promise<any> {
    try {
      if (data.type == "INDIVIDUAL" || data.type == "INVITED_INDIVIDUAL") {
        const user = await prisma.user.findUnique({
          where: {
            id: data.userId,
          },
        });

        if (!user) {
          return response.status(404).json({
            message: "This user does not exist",
          });
        }

        const createNewUserPricingHistory = await prisma.pricingHistory.create({
          data: {
            user: { connect: { id: data.userId } },
            type: data.type,
            amountPayed: 0,
            planDuration: "FREE_PLAN",
            plans:
              data.type == "INVITED_INDIVIDUAL"
                ? "INVITED_STUDENT_UNLIMITED"
                : "FREEMIUM_USER",
          },
          select: {
            id: true,
          },
        });

        return createNewUserPricingHistory;
      }
      if (data.type == "ORGANIZATION") {
        const org = await prisma.organization.findUnique({
          where: {
            id: data.orgId,
          },
        });

        if (!org) {
          return response.status(404).json({
            message: "This org does not exist",
          });
        }

        const createNewOrgPricingHistory = await prisma.pricingHistory.create({
          data: {
            type: data.type,
            amountPayed: 0,
            planDuration: "FREE_PLAN",
            plans: "FREEMIUM_USER",
            organization: { connect: { id: org.id } },
          },
        });

        return createNewOrgPricingHistory;
      }
    } catch (error) {
      console.error(error.message);
    }
  }

  public static async TestReciptMode(data: { email: string }): Promise<string> {
    const newCode = crypto.randomBytes(8).toString("hex");
    try {
      const user = await prisma.user.findUnique({
        where: {
          email_address: data.email,
        },
      });

      if (!user) {
        response.status(404).json({
          message: "This User does not exist",
        });
      }

      const updateUserCode = await prisma.user.update({
        where: {
          email_address: user.email_address,
        },
        data: {
          paymentCode: newCode,
        },
      });

      await redisClient.set(`user_${user.id}_PC`, newCode, {
        EX: 600,
      });

      return updateUserCode.paymentCode;
    } catch (error: any) {
      console.error(error.message);
    }
  }

  public static async Transfer(
    data: IFlutterwaveTransferPayload,
  ): Promise<any> {
    try {
      const response = await flw.Transfer.initiate(data);
      return response;
    } catch (error: any) {
      console.error(error.message);
    }
  }

  public static async TestPlans(): Promise<any> {
    try {
      const plans = PLAN_CONFIG;
      return plans;
    } catch (error) {
      console.error(error.message);
    }
  }
}
