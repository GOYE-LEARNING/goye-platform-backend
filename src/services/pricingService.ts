import crypto from "crypto";
import prisma from "../db";
import { response } from "express";
import { redisClient } from "../utils/redis";
import { IFlutterwaveTransferPayload } from "../interface/interfaces";
import { flw } from "../utils/flutterwave";
import { PLAN_CONFIG } from "../interface/plansDTO";
type Role = "INDIVIDUAL" | "ORGANIZATION" | "INVITED_INDIVIDUAL";
export class PricingService {
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
