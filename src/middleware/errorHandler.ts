// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import multer from "multer";

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "File too large. Maximum size is 500MB.",
      });
    }
    return res.status(400).json({ message: error.message });
  }

  // TSOA validation errors
  if (error.fields) {
    return res.status(400).json({
      message: "Validation failed",
      fields: error.fields,
    });
  }

  // Prisma errors
  if (error.code === "P2002") {
    return res.status(409).json({
      message: "Unique constraint failed",
      field: error.meta?.target,
    });
  }

  // Default error
  console.error("❌ Error:", error);
  res.status(500).json({ message: "Internal Server Error" });
};