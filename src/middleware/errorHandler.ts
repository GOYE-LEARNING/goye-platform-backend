import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { MAX_FILE_SIZE } from "../utils/constant";

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      });
    }
    return res.status(400).json({ message: error.message });
  }

  console.error("Error:", error);
  res.status(500).json({ message: "Internal Server Error" });
};