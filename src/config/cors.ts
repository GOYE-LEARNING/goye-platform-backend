// src/config/cors.ts
import cors from "cors";
import {
  ALLOWED_ORIGINS,
  ALLOW_LOCALHOST_ORIGINS,
  LOCALHOST_ORIGIN_PATTERN,
} from "../utils/constant";

export function isOriginAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (ALLOW_LOCALHOST_ORIGINS && LOCALHOST_ORIGIN_PATTERN.test(origin)) return true;
  return false;
}

export const corsOptions = cors({
  origin: (origin, callback) => {
    if (!origin || isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked: ${origin}`);
      // Rejecting with a plain Error made every blocked request surface as a
      // 500, which reads as "the server broke" in logs and monitoring when
      // the truth is "we refused you on purpose". Tagging the status lets
      // errorHandler return a 403 instead.
      //
      // Note this callback does more than a normal CORS policy: passing an
      // error aborts the request, so a disallowed origin never reaches a
      // route at all. That is what already blocked cross-site form posts
      // before the dedicated CSRF guard existed — worth keeping in mind
      // before anyone "relaxes" this into a plain callback(null, false).
      const error: any = new Error("Not allowed by CORS");
      error.status = 403;
      callback(error);
    }
  },
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
    "Cache-Control",
    "Pragma",
    "X-Device-Id",
    "x-refresh-token",
  ],
});