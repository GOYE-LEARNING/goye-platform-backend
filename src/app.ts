// src/app.ts
import express, { Request, Response, NextFunction, Router } from "express";
import cookieParser from "cookie-parser";
import { RegisterRoutes } from "./routes/routes";
import { setupSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/logger";
import { corsOptions } from "./config/cors";
import helmet from 'helmet'
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import prisma from "./db";
import dotenv from "dotenv";
import type { SocketService } from "./services/socketService";
import { VerifyToken } from "./middleware/verifytoken";
import { isOriginAllowed } from "./config/cors";
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
// `ipKeyGenerator` is not decoration: a bare req.ip keys an IPv6 client on its
// full /128 address, and a single IPv6 allocation hands one person effectively
// unlimited distinct addresses — so they get a fresh rate-limit bucket per
// request and the limiter does nothing for them. The helper normalises IPv6
// down to its /56 prefix so the budget applies per subscriber, and leaves IPv4
// alone. express-rate-limit logs ERR_ERL_KEY_GEN_IPV6 at boot when a custom
// keyGenerator skips it; that warning was already firing before the limiter
// was even re-enabled.
const ipKey = (req: Request) =>
  ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");

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

// ---- Limiter for content submission (each one triggers an AI moderation call) ----
// Applies only to the create/edit routes, so likes, reads and private messages
// are untouched. Bounds how fast one user can spend the moderation budget.
const SUBMISSION_PATHS = [
  /^\/api\/socials\/(create-post|create-reply|update-reply)\//,
  /^\/api\/discussion\/public(\/[^/]+\/reply)?$/,
  /^\/api\/discussion\/reply\/[^/]+\/nested$/,
  /^\/api\/discussion\/[^/]+$/,
];
const contentSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SUBMISSION_RATE_LIMIT) || 10,
  message: { status: 429, message: "You're posting a bit fast — please wait a moment and try again." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  skip: (req) => {
    if (req.method !== "POST" && req.method !== "PUT") return true;
    const path = req.originalUrl.split("?")[0];
    return !SUBMISSION_PATHS.some((r) => r.test(path));
  },
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

// ---- Body size limits ----
const DEFAULT_JSON_LIMIT = process.env.JSON_BODY_LIMIT || "1mb";
const UPLOAD_JSON_LIMIT = process.env.UPLOAD_BODY_LIMIT || "15mb";

// ---- CSRF ----
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Blocks cross-site requests that rely on ambient cookies.
 *
 * Why this is needed here: auth accepts `req.cookies.accessToken`, and those
 * cookies are set `sameSite: "none"` so they can reach the API from the
 * Vercel frontend. Browsers therefore attach them to cross-site requests too.
 * CORS does not save us — it decides who may *read* a response, not whether
 * the request runs, and a form-encoded POST is a "simple request" that skips
 * the preflight entirely. So any page on the internet could submit a hidden
 * form to a state-changing endpoint and have it execute as the logged-in
 * user; the attacker never sees the response, but the write already happened.
 *
 * The check is deliberately narrow, to avoid breaking clients on launch:
 *
 *  - Safe methods pass. They shouldn't change state.
 *  - A `Bearer` token passes. A browser never attaches that by itself — our
 *    own JavaScript has to, and it can only do so same-origin or through an
 *    allowed CORS preflight. Requests carrying one aren't forgeable this way,
 *    which is why the mobile app is unaffected.
 *  - No auth cookie present: nothing to ride on, so nothing to forge.
 *  - Otherwise the request is authenticated by cookie alone, and we require
 *    Origin (or Referer, for older clients) to be one of ours.
 *
 * Requests with neither Origin nor Referer are allowed through: browsers
 * always send Origin on POST, so their absence means a native or
 * server-to-server client, which has no ambient-credential problem. They are
 * logged so the assumption stays visible rather than silent.
 */
const csrfGuard = (req: Request, res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) return next();

  if (req.headers.authorization?.startsWith("Bearer ")) return next();

  const cookies = (req as any).cookies || {};
  if (!cookies.accessToken && !cookies.refreshToken) return next();

  let origin = req.headers.origin;
  if (!origin && req.headers.referer) {
    try {
      origin = new URL(req.headers.referer).origin;
    } catch {
      /* malformed Referer — treated as absent */
    }
  }

  if (!origin) {
    console.warn(`⚠️ Cookie-authenticated ${req.method} ${req.path} with no Origin/Referer — allowing as a non-browser client`);
    return next();
  }

  if (isOriginAllowed(origin)) return next();

  console.error(`🛑 CSRF blocked: ${req.method} ${req.path} from origin ${origin}`);
  return res.status(403).json({
    status: 403,
    message: "Cross-site request blocked.",
  });
};

export const createApp = async (socketService?: SocketService) => {
  console.log("🔄 Setting up middleware...");

  // A 15mb JSON body was accepted on *every* route. Only the base64 upload
  // endpoints need that headroom; everywhere else it just meant one request
  // could make the server allocate and parse 15mb, and a handful of
  // concurrent ones could exhaust memory without ever logging in.
  //
  // Uploads keep the old ceiling (base64 inflates a payload by ~33%, so a
  // 10MB image really does arrive as ~13.3MB). Everything else drops to 1mb,
  // which is still a very large JSON document — the whole request body of a
  // rich course edit is far below it.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const limit = /\/upload/i.test(req.path) ? UPLOAD_JSON_LIMIT : DEFAULT_JSON_LIMIT;
    return express.json({ limit })(req, res, next);
  });

  app.use(cookieParser());

  // Nothing in this API consumes form-encoded bodies — the clients all send
  // JSON, and real file uploads go through multer as multipart. Keeping the
  // limit tight costs nothing and removes the cheapest way to make the server
  // parse a large body.
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  app.use(corsOptions);
  app.options("*", corsOptions);

  // CSRF protection must sit after cookieParser (it inspects auth cookies)
  // and before any route that can change state.
  app.use(csrfGuard);

  app.use(requestLogger);
  app.use(helmet())

  app.use(generalLimiter);
  app.use(contentSubmissionLimiter);
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