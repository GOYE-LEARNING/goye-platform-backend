import { Body, Controller, Post, Get, Query } from "tsoa";
import prisma from "../db";

interface CreateWaitlistResponse {
  success: boolean;
  message: string;
  data?: {
    email: string;
    status: string;
  };
}

interface CreateWaitlistBody {
  email: string;
}

interface CheckWaitlistResponse {
  success: boolean;
  exists: boolean;
  status?: string;
  message?: string;
}

export class SpecialController extends Controller {
  
  @Post("/create-waitlist")
  public async CreateWaitlist(@Body() data: CreateWaitlistBody): Promise<CreateWaitlistResponse> {
    try {
      const { email } = data;
      
      // Validate email format using regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.setStatus(400);
        return {
          success: false,
          message: "The great kingdom builder, please enter a valid and powerful email address."
        };
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if email already exists
      const existingWaitlist = await prisma.waitlist.findUnique({
        where: { email: normalizedEmail }
      });

      if (existingWaitlist) {
        this.setStatus(409);
        return {
          success: false,
          message: "You're already on the waitlist! 🎉"
        };
      }

      // Save email to database
      const waitlistEntry = await prisma.waitlist.create({
        data: {
          email: normalizedEmail,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      this.setStatus(201);
      return {
        success: true,
        message: "Successfully joined the waitlist! 🎉",
        data: {
          email: normalizedEmail,
          status: "active"
        }
      };

    } catch (error: any) {
      console.error("Error in CreateWaitlist:", error.message);
      this.setStatus(500);
      return {
        success: false,
        message: "An unexpected error occurred. Please try again."
      };
    }
  }

  @Get("/check-waitlist")
  public async CheckWaitlist(@Query() email: string): Promise<CheckWaitlistResponse> {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.setStatus(400);
        return {
          success: false,
          exists: false,
          message: "Invalid email format."
        };
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      const waitlistEntry = await prisma.waitlist.findUnique({
        where: { email: normalizedEmail }
      });

      if (!waitlistEntry) {
        this.setStatus(200);
        return {
          success: true,
          exists: false,
          message: "Email not found in waitlist."
        };
      }

      this.setStatus(200);
      return {
        success: true,
        exists: true,
        status: waitlistEntry.status,
        message: "Email is on the waitlist!"
      };

    } catch (error: any) {
      console.error("Error in CheckWaitlist:", error.message);
      this.setStatus(500);
      return {
        success: false,
        exists: false,
        message: "An unexpected error occurred. Please try again."
      };
    }
  }
}