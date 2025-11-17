import {
  Route,
  Controller,
  Tags,
  Get,
  Post,
  Body,
  Security,
  Request,
  Put,
  Delete,
  Path,
} from "tsoa";
import prisma from "../db.js";
import { User } from "../interface/interfaces.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SendEmail } from "../utils/utils.js";
import { MediaService } from "../services/mediaServices.js";
//User route start here
@Route("user")
@Tags("User control APIs")
export class UserController extends Controller {
  //signup
  @Post("/signup")
  public async CreateUser(
    @Body() body: Omit<User, "id">,
    @Request() req: any
  ): Promise<any> {
    const hashedPassword = await bcrypt.hash(body.password, 10);
    //To store password in token
    const user = await prisma.user.create({
      data: { ...body, password: hashedPassword },
    });

    if (!user) {
      this.setStatus(401);
      return {
        messgae: "User already exist",
      };
    }

    const updateUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastActive: new Date(),
      },
    });

    const token = jwt.sign(
      {
        id: updateUser.id,
        full_name: `${updateUser.first_name} ${updateUser.last_name}`,
        email: updateUser.email_address,
        role: updateUser.role,
        password: body.password,
        updateStatus: updateUser.isOnline,
      },
      (process.env.BEARERAUTH_SECRET as string) || "secret-key",
      { expiresIn: "7d" }
    );

    if (req.res) {
      req.res.cookie("token", token, {
        httpOnly: true,
        secure: true, // because you're on localhost
        sameSite: "none", // must be none for cross-port cookie sharing
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    this.setStatus(201);
    return {
      message: "Signup successfull",
      token,
      user: {
        id: updateUser.id,
        first_name: updateUser.first_name,
        last_name: updateUser.last_name,
        email_address: updateUser.email_address,
      },
    };
  }

  //login
  @Post("/login")
  public async Login(
    @Body() creditials: { email: string; password: string },
    @Request() req: any
  ): Promise<any> {
    const user = await prisma.user.findUnique({
      where: {
        email_address: creditials.email,
      },
    });

    const updateUser = await prisma.user.update({
      where: { id: user?.id },
      data: {
        isOnline: true,
        lastActive: new Date(),
      },
    });

    const token = jwt.sign(
      {
        id: updateUser.id,
        full_name: `${updateUser.first_name} ${updateUser.last_name}`,
        email: updateUser.email_address,
        role: updateUser.role,
        password: creditials.password,
        updateStatus: updateUser.isOnline,
      },
      (process.env.BEARERAUTH_SECRET! as string) || "secret-key",
      { expiresIn: "7d" }
    );
    if (!user) {
      this.setStatus(404);
      return {
        message: "User does not exist with this account",
      };
    }

    const isPasswordValid = await bcrypt.compare(
      creditials.password,
      user.password
    );

    if (!isPasswordValid) {
      this.setStatus(401);
      return {
        message: "Password is in valid",
      };
    }

    if (req.res) {
      req.res.cookie("token", token, {
        httpOnly: true,
        secure: true, // because you're on localhost
        sameSite: "none", // must be none for cross-port cookie sharing
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    this.setStatus(200);
    return {
      data: {
        message: "Login successfull",
        token,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
        },
      },
    };
  }

  //create and send Otp
  @Post("/sendOtp")
  public async SendOtp(@Body() body: { email: string }): Promise<any> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // expires in 5min

    const newOtp = await prisma.otp.create({
      data: {
        code: otp,
        email: body.email,
        expiresIn: expires,
      },
    });

    const sessionToken = jwt.sign(
      { email: body.email, otpId: otp },
      process.env.JWT_SECRET || "secret-key",
      { expiresIn: "6min" }
    );

    await SendEmail(
      newOtp.email,
      "GOYE VERIFICATION",
      `Your Otp ${newOtp.code}`
    );

    this.setStatus(200);
    return {
      message: "Otp sent successfully",
      sessionToken,
      otp,
      email: body.email,
    };
  }

  @Post("/verify-otp")
  public async VerifyOtp(@Body() body: { otp: string; sessionToken: string }) {
    const { otp, sessionToken } = body;
    const decoded = jwt.verify(
      sessionToken,
      process.env.JWT_SECRET || "secret-key"
    ) as {
      email: string;
      otp: string;
    };

    const email = decoded.email;

    const verifyOtp = await prisma.otp.findFirst({
      where: {
        code: otp,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!verifyOtp) {
      this.setStatus(400);
      return {
        message: "Oops otp not verified.",
      };
    } else if (verifyOtp.expiresIn < new Date()) {
      return {
        message: "Otp has expired",
      };
    }

    await prisma.otp.delete({
      where: { id: verifyOtp.id },
    });

    this.setStatus(200);
    return {
      message: "Your otp has been verified",
      email,
    };
  }

  @Security("bearerAuth")
  @Post("/upload-profile-picture")
  public async UploadPicture(
    @Request() req: any,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    }
  ): Promise<any> {
    const userId = req.user?.id;
    const fileBuffer = Buffer.from(body.file, "base64");

    // 1. Upload to Firebase
    const { url, error } = await MediaService.uploadUserAvatar(
      userId,
      fileBuffer,
      body.fileName,
      body.mimeType
    );

    if (error) {
      this.setStatus(500);
      return { message: "Upload failed", error };
    }  

    try {
      // 2. Try to update user with Prisma
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { user_pic: url },
        select: { first_name: true, user_pic: true },
      });

      this.setStatus(200);
      return {
        message: "Avatar uploaded successfully",
        user: updatedUser,
      };
    } catch (error: any) {
      // 3. If RLS error, use raw SQL fallback
      if (error.message.includes("row-level security")) {
        console.log("RLS detected, using raw SQL fallback");

        try {
          await prisma.$executeRaw`UPDATE "User" SET user_pic = ${url} WHERE id = ${userId}`;

          this.setStatus(200);
          return {
            message: "Avatar uploaded successfully (used fallback)",
            user: { user_pic: url },
          };
        } catch (rawError) {
          this.setStatus(500);
          return {
            message: "Failed to update user profile",
            error: rawError.message,
          };
        }
      }

      // 4. Handle other errors
      this.setStatus(500);
      return { message: "Failed to update user profile", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/get-user-password")
  public async GetPassword(@Request() req: any): Promise<any> {
    const userId = req.user?.id;
    const password = req.user?.password;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    this.setStatus(200);
    return {
      message: "Password fetched successfully",
      user,
      password,
    };
  }

  @Security("bearerAuth")
  @Put("/update-password")
  public async UpdatePassword(
    @Request() req: any,
    @Body() body: { newPassword: string }
  ): Promise<any> {
    const userId = req.user?.id;

    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    this.setStatus(200);
    return {
      message: "Password updated successfully",
    };
  }

  @Get("/get-user/{id}")
  public async GetUser(@Path() id: string): Promise<any> {
    const getUser = await prisma.user.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        user_pic: true,
        first_name: true,
        last_name: true,
        email_address: true,
        role: true,
        isOnline: true,
        lastActive: true,
        country: true,
        state: true,
        phone_number: true,
        level: true,
        createdAt: true,
      },
    });

    if (!getUser) {
      this.setStatus(404);
      return {
        message: "User not found",
      };
    }
    this.setStatus(200);
    return {
      message: `User fetched successfully`,
      getUser,
    };
  }

  //update User
  @Security("bearerAuth")
  @Put("/update-user")
  public async UpdateUser(
    @Request() req: any,
    @Body()
    data: {
      first_name: string;
      last_name: string;
      country: string;
      state: string;
      phone_number: string;
    }
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(404);
      return {
        message: "User not found",
      };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        country: data.country,
        state: data.state,
        phone_number: data.phone_number,
      },
    });

    this.setStatus(201);
    return {
      message: "User is updated succefully",
      data: user,
    };
  }

  //delete user
  @Delete("delete-user/{id}")
  public async DeleteUser(@Path() id: string) {
    const user = await prisma.user.delete({
      where: {
        id,
      },
    });

    this.setStatus(200);
    return {
      message: "User Deleted Succefully",
      user,
    };
  }

  //format time
  private formatLastActive(lastActive: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - lastActive.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }

  //fetch student
  @Get("/fetch-users-student")
  public async GetStudent(): Promise<any> {
    const students = await prisma.user.findMany({
      where: {
        role: "student",
      },
      select: {
        id: true,
        user_pic: true,
        first_name: true,
        last_name: true,
        email_address: true,
        role: true,
        isOnline: true,
        lastActive: true,
        enrollment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    const enhancedStudents = students.map((student) => ({
      ...student,
      // Calculate if user was active in last 5 minutes
      isCurrentlyOnline:
        student.isOnline &&
        student.lastActive > new Date(Date.now() - 5 * 60 * 1000),
      // Format last active time
      lastActiveFormatted: this.formatLastActive(student.lastActive),
      // Full name for display
      full_name: `${student.first_name} ${student.last_name}`,
    }));

    this.setStatus(200);
    return {
      message: "Student fetched successfully",
      enhancedStudents,
    };
  }

  //fetch tutors
  @Get("/fetch-users-tutors")
  public async GetTutor(): Promise<any> {
    const tutor = await prisma.user.findMany({
      where: {
        role: "tutor",
      },
      select: {
        id: true,
        user_pic: true,
        first_name: true,
        last_name: true,
        email_address: true,
        role: true,
        isOnline: true,
        lastActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const enhancedTutors = tutor.map((tutor) => ({
      ...tutor,
      isCurrentlyOnline:
        tutor.isOnline &&
        tutor.lastActive > new Date(Date.now() - 5 * 60 * 1000),
      lastActiveFormatted: this.formatLastActive(tutor.lastActive),
      // Full name for display
      full_name: `${tutor.first_name} ${tutor.last_name}`,
    }));

    this.setStatus(200);
    return {
      message: "Tutor fetched successfully",
      enhancedTutors,
    };
  }

  @Security("bearerAuth")
  @Get("/profile")
  public async GetProfile(@Request() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "Unauthorized", status: 401 };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    this.setStatus(200);
    return {
      message: "Profile fetched succfully",
      user,
    };
  }

  @Post("/forgot-password")
  public async ForgotPassword(
    @Body() body: { email: string; link: string }
  ): Promise<any> {
    const checkEmail = await prisma.user.findUnique({
      where: { email_address: body.email },
    });

    if (!checkEmail) {
      this.setStatus(401);
      return {
        message: "User does not exist",
      };
    }

    await SendEmail(
      checkEmail.email_address,
      "Forgot Password Link",
      body.link
    );
    this.setStatus(200);
    return {
      message: "Link sent successfully",
    };
  }

  @Get("/user-student-status")
  public async GetUserStatus(): Promise<any> {
    const totalStudents = await prisma.user.count({
      where: {
        role: "student",
      },
    });

    const onlineStudents = await prisma.user.count({
      where: {
        role: "student",
        isOnline: true,
      },
    });

    const newStudentsToday = await prisma.user.count({
      where: {
        role: "student",
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });
    return {
      message: "User statistics fetched successfully",
      stats: {
        totalStudents,
        onlineStudents,
        newStudentsToday,
        offlineStudents: totalStudents - onlineStudents,
      },
    };
  }

  @Security("jwt")
  @Post("/logout")
  public async Logout(@Body() req: any): Promise<any> {
    const id = req.user?.id;
    await prisma.user.update({
      where: { id },
      data: {
        isOnline: false,
        lastActive: new Date(),
      },
    });

    if (req.res) {
      req.res.clearCookie("token");
    }

    this.setStatus(200);
    return {
      message: "Logout successfull",
    };
  }
}
