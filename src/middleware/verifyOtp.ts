import { Response } from "express";
import prisma from "../db.js";
export async function VerifyOtp(email: string, code: string) {
  const record = await prisma.otp.findFirst({
    where: {
      email,
      code,
    },
  });

  if (!record) {
    return { message: "Invalid Otp" }
  }

  if (record.expiresIn < new Date()) {
    return { message: "OTP expired" };
  }
}
