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
        // Student plans
        {
          id: "student-1",
          pricing_title: "Free",
          monthly_price: "$0",
          annually_price: "",
          pricing_description: "Explore your faith. Learn and connect.",
          pricing_offers: {
            list: [
              "Enroll in up to 5 courses",
              "Join up to 4 groups",
              "Standard search and discovery",
            ],
          },
          section_roles: "student",
        },
        {
          id: "student-2",
          pricing_title: "Student Plus",
          monthly_price: "$10",
          annually_price: "$110",
          pricing_description: "For the committed disciple who wants more.",
          pricing_offers: {
            list: [
              "Enroll in up to 30 courses",
              "Join up to 20 groups",
              "Priority access to new courses",
              "Downloadable course materials (where enabled)",
            ],
          },
          section_roles: "student",
        },
        {
          id: "student-3",
          pricing_title: "Student Unlimited",
          monthly_price: "$18",
          annually_price: "$200",
          pricing_description:
            "For the dedicated student with an insatiable hunger to grow.",
          pricing_offers: {
            list: [
              "Unlimited course enrollments",
              "Unlimited group memberships",
              "Early enrollment in new courses",
              "Full course history and portfolio",
              "Certificate display on profile",
            ],
          },
          section_roles: "student",
        },
        // Tutor plans
        {
          id: "tutor-1",
          pricing_title: "Free",
          monthly_price: "$0",
          annually_price: "$0",
          pricing_description: "Start teaching. Build your presence.",
          pricing_offers: {
            list: [
              "Create up to 5 courses",
              "Create up to 10 groups",
              "Basic profile page",
              "Course analytics (basic)",
            ],
          },
          section_roles: "tutor",
        },
        {
          id: "tutor-2",
          pricing_title: "Tutor Pro",
          monthly_price: "$20",
          annually_price: "$210",
          pricing_description: "For tutors ready to scale their ministry.",
          pricing_offers: {
            list: [
              "Up to 25 courses",
              "Up to 50 groups",
              "Up to 200 students per course",
              "•	Advanced analytics dashboard",
            ],
          },
          section_roles: "tutor",
        },
        {
          id: "tutor-3",
          pricing_title: "Tutor Elite",
          monthly_price: "$40",
          annually_price: "$400",
          pricing_description:
            "For full-time Christian educators and ministry leaders.",
          pricing_offers: {
            list: [
              "Unlimited courses",
              "Unlimited groups",
              "Unlimited students per course",
              "Course completion certificates (for students)",
            ],
          },
          section_roles: "tutor",
        },
        // Organization plans
        {
          id: "org-1",
          pricing_title: "Church Starter/Growth/Enterprise",
          monthly_price: "",
          annually_price: "",
          pricing_description:
            "For churches, denominations, and national ministries.",
          pricing_offers: {
            list: [
              "Unlimited members",
              "Unlimited courses and groups",
              "Custom onboarding and training",
              "API access for CMS integrations",
              "Quarterly strategy reviews",
            ],
          },
          section_roles: "organization",
        },
        {
          id: "org-2",
          pricing_title: "School Starter/Growth/Enterprise",
          monthly_price: "",
          annually_price: "",
          pricing_description:
            "For large Christian schools, universities, and seminary institutions.",
          pricing_offers: {
            list: [
              "Unlimited students",
              "Unlimited courses and groups",
              "Custom onboarding and staff training",
              "API access for SIS integrations",
              "SLA-backed uptime guarantee",
            ],
          },
          section_roles: "organization",
        },
        {
          id: "org-3",
          pricing_title: "Clubs Starter/Growth/Enterprise",
          monthly_price: "",
          annually_price: "",
          pricing_description:
            "For clubs, Christian organizations, national clubs, and federations",
          pricing_offers: {
            list: [
              "Unlimited members",
              "Unlimited courses and groups",
              "Custom onboarding and training",
              "API access for CMS integrations",
              "Quarterly strategy reviews",
            ],
          },
          section_roles: "organization",
        },
      ];

      return data;
    } catch (error: any) {
      console.error(error.message);
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
