// src/app.ts
import express, { Request, Response, NextFunction, Router } from "express";
import cookieParser from "cookie-parser";
import { RegisterRoutes } from "./routes/routes";
import { setupSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/logger";
import { corsOptions } from "./config/cors";
import helmet from 'helmet'
import rateLimit from "express-rate-limit";
import prisma from "./db";
import dotenv from "dotenv";
import type { SocketService } from "./services/socketService";
import { VerifyToken } from "./middleware/verifytoken";
import { speakCourseDraftText } from "./utils/ai_utils/course_draft_client";
dotenv.config();

const app = express();
export const socketRoutes = Router();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy enabled for production (Render)');
} else {
  app.set('trust proxy', 'loopback');
  console.log('✅ Trust proxy enabled for development');
}

// ---- Shared key generator ----
// With `trust proxy` set correctly above, Express's own req.ip already
// resolves the real client IP from X-Forwarded-For safely — it trusts
// exactly one hop (Render) and reads the entry Render appended, ignoring
// anything a client tries to prepend/spoof. No manual header parsing needed.
const ipKey = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown';

// Per-user key: falls back to IP if the request isn't authenticated yet.
// Requires VerifyToken (or similar) to have already attached req.user
// upstream — for routes where that's not guaranteed, this safely degrades
// to IP-based limiting instead of throwing.
const userOrIpKey = (req: Request & { user?: { id?: string } }) =>
  req.user?.id ? `user:${req.user.id}` : `ip:${ipKey(req)}`;

// ---- General limiter (IP-based, catches anonymous + pre-auth traffic) ----
//
// This was commented out, which left every route except login and signup
// completely unthrottled — confirmed by firing 80 requests at an API endpoint
// and getting 80 × HTTP 200. That is exactly the condition that lets someone
// enumerate and probe the API at will.
//
// The ceiling is deliberately high: it is a scanner/scraper brake, not a
// usage quota. A logged-in dashboard can easily fire a dozen requests per
// page, so a limit tight enough to annoy real users would be traded for
// almost no extra safety. Tune with RATE_LIMIT_MAX once real traffic exists.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  message: { status: 429, message: "Too many requests, please slow down and try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  // Uptime pings and CORS preflights shouldn't consume a client's budget.
  skip: (req) => req.path === "/health" || req.method === "OPTIONS",
});

// ---- Auth limiter (unchanged logic, fixed key) ----
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 429, message: "Too many login attempts, please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
});

// ---- Per-user limiter for authenticated, higher-value actions ----
// Sits alongside generalLimiter, not instead of it. Prevents one user
// from consuming a shared IP's whole budget (e.g. same church wifi),
// while still keeping an IP-level ceiling as a backstop against abuse
// from anonymous/unauthenticated traffic.
const perUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // tune against real usage data once you have it
  message: { status: 429, message: "You're doing that a bit fast — please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
});

// ---- Dedicated limiter for the AI/TTS endpoint ----
// Keeps this feature's usage from eating into the shared 100/15min
// general budget, and keeps it separate from your provider-side
// rate limit handling (queueing/backoff), which still applies on top.
const aiFeatureLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  message: { status: 429, message: "Please wait a moment before generating more audio." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
});

export const createApp = async (socketService?: SocketService) => {
  console.log("🔄 Setting up middleware...");

  app.use(express.json({ limit: "15mb" }));
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  app.use(corsOptions);
  app.options("*", corsOptions);

  app.use(requestLogger);
  app.use(helmet())

  app.use(generalLimiter);
  app.use("/api/user/signup", authLimiter);
  app.use("/api/user/login", authLimiter);

  // Mounted here rather than as the very first middleware. It used to sit
  // above express.json, cors, helmet and the rate limiter, so the presence
  // routes attached to it in server.ts bypassed all four. It still precedes
  // the 404 handler, which is the only ordering this router actually needs.
  app.use(socketRoutes);

  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  // Diagnostics that reveal infrastructure state. Harmless-looking, but they
  // let anyone probe whether the database is up — useful only to someone
  // watching for a window where the service is degraded. Kept for local
  // debugging, withheld in production.
  if (process.env.NODE_ENV !== "production") {
    app.get("/api/db-test", async (req: Request, res: Response) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ message: "Database connected successfully" });
      } catch (error) {
        console.error("Database test failed:", error);
        res.status(500).json({ error: "Database connection failed" });
      }
    });

    app.get("/api/test", (req: Request, res: Response) => {
      res.json({ message: "API is working!" });
    });
  }

  console.log("📚 Setting up Swagger...");
  setupSwagger(app);

  console.log("🛣️ Registering routes...");
  try {
    RegisterRoutes(app);
    console.log("✅ Routes registered successfully");
  } catch (error) {
    console.error("❌ Failed to register routes:", error);
    throw error;
  }

  if (socketService) {
    app.set("socketService", socketService);
    // The presence routes that used to be declared here were unreachable:
    // createApp() is always called without a socketService, so this branch
    // never ran. The routes that actually serve traffic are registered on
    // `socketRoutes` in server.ts, and are secured there.
    console.log("✅ Socket-dependent routes registered");
  }

  // Raw-binary TTS proxy — now with its own dedicated limiter,
  // in addition to (not instead of) generalLimiter above.
  app.post(
    "/api/course-draft/voice/speak",
    VerifyToken,
    aiFeatureLimiter,
    async (req: Request, res: Response) => {
      const { text, voice } = req.body as { text?: string; voice?: string };
      if (!text || !text.trim()) {
        return res.status(400).json({ message: "text is required" });
      }
      const result = await speakCourseDraftText(text, voice);
      if (!result.ok) {
        return res.status(502).json({ message: result.error || "TTS failed" });
      }
      res.set("Content-Type", "audio/wav");
      res.send(result.buffer);
    }
  );

  app.use(errorHandler);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: "Route not found" });
  });

  console.log("✅ App created successfully");
  return app;
};