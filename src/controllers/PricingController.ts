import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Route,
  Security,
  Tags,
} from "tsoa";
import { PricingService } from "../services/pricingService";
import { redisClient } from "../utils/redis";
import prisma from "../db";
import { MemberPlanType, PlanDuration, Plans } from "@prisma/client";
@Tags("Pricing API integration")
@Route("pricing")
export class PricingController extends Controller {
  @Security("bearerAuth")
  @Post("/getCode")
  public async TransferCode(@Request() req: any): Promise<any> {
    const email = req?.user?.email;
    const planId = req.user?.planId
    const code = await PricingService.TestReciptMode({ email });

    return {
      message: "newCode_created",
      recipent: code,
      emailCode: email || null,
    };
  }

  @Security("bearerAuth")
  @Get("/fetch-code")
  public async GetCode(@Request() req: any): Promise<any> {
    const user = req?.user?.id;
    try {
      const cachedData = await redisClient.get(`user_${user}_PC`);
      return {
        name: cachedData,
      };
    } catch (error: any) {
      console.error(error);
    }
  }

  @Security("bearerAuth")
  @Post("/make-transfer")
  public async MakeTransfer(
    @Request() req: any,
    @Body()
    data: {
      account_bank: string;
      account_number: string;
      amount: number;
      currency: "NGN" | "USD" | "GHS" | "KES";
      narration: string;
      reference: string;
      callback_url?: string;
      debit_currency?: string;
      plan: Plans;
      planDuration: PlanDuration
      type: MemberPlanType
    },
  ) {
    const planId = req.user?.planId
    
    try {
      const transfer = await PricingService.Transfer({
        account_bank: data.account_bank,
        account_number: data.account_number,
        amount: data.amount,
        currency: data.currency,
        narration: data.narration,
        reference: data.reference,
        callback_url: data.callback_url,
        debit_currency: data.debit_currency,
      });

     const updateUserSubscription = await prisma.pricingHistory.update({
        where: {
            id: planId
        },
        data: {
            amountPayed: data.amount,
            planDuration: data.planDuration,
            plans: data.plan,
            type: data.type
        },
        include: {
            user: {
                select: {
                    first_name: true,
                    last_name: true
                }
            }
        }
     })

     
      return {
        message: "Transfer was successfull",
        data: transfer,
        plan: data.planDuration,
        user: updateUserSubscription,
        userQuery: `${updateUserSubscription.user.first_name} ${updateUserSubscription.user.last_name} just payed for ${data.plan}`
      };
    } catch (error: any) {
      console.error(error.message);
    }
  }

  @Get("/test-plans")
  public async TestPlans(): Promise<any> {
    try {
      const plans = await PricingService.TestPlans();
      return {
        message: "Plan fetched sucessfully init",
        data: plans,
      };
    } catch (error: any) {
      console.error(error.message);
    }
  }
}
