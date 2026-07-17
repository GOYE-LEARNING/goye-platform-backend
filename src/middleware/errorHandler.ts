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

  // Preserve error status code if available
  let statusCode = 500;
  let message = "Internal Server Error";

  if (error?.status) {
    statusCode = error.status;
    message = error.message || message;
  } else if (error?.statusCode) {
    statusCode = error.statusCode;
    message = error.message || message;
  } else if (error?.statusCode) {
    statusCode = error.statusCode;
  } else if (error?.message?.includes("Unauthorized") || error?.message?.includes("No access token")) {
    statusCode = 401;
    message = error.message;
  }

  // Default error
  console.error(`❌ Error (Status: ${statusCode}):`, error);
  res.status(statusCode).json({ message, status: statusCode });
};