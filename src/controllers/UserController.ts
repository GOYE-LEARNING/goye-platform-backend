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
import { SignupResponse, User } from "../interface/interfaces.js";
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
  ): Promise<SignupResponse> {
    const hashedPassword = await bcrypt.hash(body.password, 10);
    const data = await prisma.user.create({
      data: { ...body, password: hashedPassword },
    });

    const updateUser = await prisma.user.update({
      where: { id: data.id },
      data: {
        isOnline: true,
        lastActive: new Date(),
      },
    });

    const token = jwt.sign(
      {
        id: updateUser.id,
        email: updateUser.email_address,
        role: updateUser.role,
        updateStatus: updateUser.isOnline,
      },
      (process.env.bearerAuth_SECRET as string) || "secret-key",
      { expiresIn: "1h" }
    );

    if (req.res) {
      req.res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // HTTPS in production
        sameSite: "lax",
        maxAge: 1 * 60 * 60 * 1000, // 1hr days
      });
    }

    this.setStatus(201);
    return {
      message: "Signup successfull",
      data,
      token,
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
        email: updateUser.email_address,
        role: updateUser.role,
        updateStatus: updateUser.isOnline,
      },
      (process.env.bearerAuth_SECRET as string) || "secret-key",
      { expiresIn: "1h" }
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
        secure: process.env.NODE_ENV === "production", // HTTPS in production
        sameSite: "lax",
        maxAge: 1 * 60 * 60 * 1000, // 1hr days
      });
    }

    this.setStatus(200);
    return {
      data: { message: "Login successfull", token },
    };
  }

  //create and send Otp
  @Post("/sendOtp")
  public async SendOtp(@Body() body: { email: string }): Promise<any> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

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
      return {
        message: "Oops otp not verified.",
      };
    } else if (verifyOtp.expiresIn < new Date()) {
      return {
        message: "Otp has expited",
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

  //Uploadind of profile picture
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
    const { url, error } = await MediaService.uploadUserAvatar(
      userId,
      fileBuffer,
      body.fileName,
      body.mimeType
    );

    if (error) {
      this.setStatus(500); // Server error
      return { message: "Upload failed", error };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        user_pic: url,
      },
      select: {
        first_name: true,
        user_pic: true,
      },
    });

    this.setStatus(200);
    return {
      message: "Avatar uploaded successfully",
      user: updatedUser,
    };
  }

  @Security("bearerAuth")
  @Put("/update-password/{id}")
  public async UpdatePassword(
    @Path() id: string,
    @Request() req: any,
    @Body() body: { newPassword: string }
  ): Promise<any> {
    const userId = req.user?.Id
    if (userId !== id) {
      return {
        message: "User must update his own password."
      }
    }
    const hashedPassword = await bcrypt.hash(body.newPassword, 10)
      await prisma.user.update({
      where: {id},
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    })

    this.setStatus(200);
    return {
      message: "Password updated successfully"
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
  @Put("update-user/{id}")
  public async UpdateUser(
    @Path() id: string,
    @Body() data: Partial<User>
  ): Promise<SignupResponse> {
    const user = await prisma.user.update({
      where: { id: id },
      data: { ...data },
    });

    this.setStatus(201);
    return {
      message: "User is updated",
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
    const userId = (req as any).user?.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!userId) {
      this.setStatus(401);
      return { message: "Unauthorized" };
    }

    this.setStatus(200);
    return {
      message: "Profile fetched succfully",
      user: user,
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
      "http://blahblah.com"
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
