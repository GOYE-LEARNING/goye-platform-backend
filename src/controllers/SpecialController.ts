import { Body, Controller, Post, Get, Query, Route, Tags } from "tsoa";
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

@Tags("Special Controller")
@Route("special")

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
          message: `
            <div class="modal-content">
              <div class="modal-icon error">✕</div>
              <h2 class="modal-title error">Invalid Email Address</h2>
              <p class="modal-text">Please enter a valid email address and try again.</p>
              <p class="modal-text">Double-check your spelling to make sure we can send you launch updates and your early access invitation.</p>
            </div>
          `
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
          message: `
            <div class="modal-content">
              <div class="modal-icon info">✓</div>
              <h2 class="modal-title info">You're Already on the Waitlist ✅</h2>
              <p class="modal-text">Good news! This email is already registered.</p>
              <p class="modal-text">Your place is secure, and there's nothing else you need to do. We'll notify you as soon as GOYE is ready for early access.</p>
              <p class="modal-text highlight">Thank you for being part of our journey.</p>
            </div>
          `
        };
      }

      // Save email to database
      const waitlistEntry = await prisma.waitlist.create({
        data: {
          email: normalizedEmail,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        
      });



      this.setStatus(201);
      return {
        success: true,
        message: `
          <div class="modal-content">
            <div class="modal-icon success">★</div>
            <h2 class="modal-title success">You're In! 🎉</h2>
            <p class="modal-text">Thanks for joining the GOYE waitlist.</p>
            <p class="modal-text">Your spot has been successfully reserved. We'll keep you updated with exclusive news, product milestones, and your invitation to experience GOYE before public launch.</p>
          </div>
        `,
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
        message: `
          <div class="modal-content">
            <div class="modal-icon error">✕</div>
            <h2 class="modal-title error">Something went wrong</h2>
            <p class="modal-text">An unexpected error occurred. Please try again.</p>
          </div>
        `
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
          message: `
            <div class="modal-content">
              <div class="modal-icon error">✕</div>
              <h2 class="modal-title error">Invalid Email Address</h2>
              <p class="modal-text">Please enter a valid email address and try again.</p>
              <p class="modal-text">Double-check your spelling to make sure we can send you launch updates and your early access invitation.</p>
            </div>
          `
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
        message: `
          <div class="modal-content">
            <div class="modal-icon info">👋</div>
            <h2 class="modal-title info">Welcome Back! 👋</h2>
            <p class="modal-text">It looks like you've already joined the GOYE waitlist.</p>
            <p class="modal-text">Your early access is reserved, and we'll keep you informed with launch updates and important announcements.</p>
          </div>
        `
      };

    } catch (error: any) {
      console.error("Error in CheckWaitlist:", error.message);
      this.setStatus(500);
      return {
        success: false,
        exists: false,
        message: `
          <div class="modal-content">
            <div class="modal-icon error">✕</div>
            <h2 class="modal-title error">Something went wrong</h2>
            <p class="modal-text">An unexpected error occurred. Please try again.</p>
          </div>
        `
      };
    }
  }
}