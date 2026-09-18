// src/server.ts
import { createHash } from "crypto";
import { createServer } from "http";
import { createApp, socketRoutes } from "./app"; // ✅ import the placeholder router
import { SocketService } from "./services/socketService";
import { NotificationService } from "./services/notificationServices";
import { PORT } from "./utils/constant";
import { initRedis, closeRedis, startNotificationWorker } from "./utils/redis";
import { VerifyToken } from "./middleware/verifytoken";

/**
 * Every token this process signs is only verifiable while ACCESS_SECRET /
 * REFRESH_SECRET stay byte-identical. If either value differs from the one a
 * token was signed with, verification fails with "invalid signature" and the
 * user is bounced to login mid-session — which looks exactly like a random
 * session bug and is impossible to confirm without seeing the values.
 *
 * So log a short fingerprint (a hash prefix, never the secret) at boot: if
 * these fingerprints differ across two restarts, the secret changed and that
 * is the cause. If they're identical across restarts while sessions still
 * die, the cause is elsewhere and the signature theory is ruled out.
 */
const logSecretFingerprints = () => {
  const fingerprint = (value?: string) =>
    value ? createHash("sha256").update(value).digest("hex").slice(0, 8) : "MISSING";

  const access = fingerprint(process.env.ACCESS_SECRET);
  const refresh = fingerprint(process.env.REFRESH_SECRET);

  console.log(`🔑 JWT secret fingerprints — ACCESS: ${access} | REFRESH: ${refresh}`);

  if (access === "MISSING" || refresh === "MISSING") {
    console.error(
      "❌ ACCESS_SECRET and/or REFRESH_SECRET is not set. Every login will succeed but no session will survive its first token refresh.",
    );
  }
};

const startServer = async () => {
  try {
    logSecretFingerprints();

    // Warm the cache connection before serving traffic so the first request
    // isn't the one that pays for it. Never throws — if Redis is unreachable
    // the API simply runs uncached.
    await initRedis();

    // The notification queue had no consumer: jobs were enqueued by
    // notificationServices and then sat in Redis unprocessed forever, so
    // those emails were never actually delivered.
    startNotificationWorker();

    const app = await createApp(); // socketRoutes is mounted but empty right now
    const httpServer = createServer(app);
    const socketService = new SocketService(httpServer);

    app.set("socketService", socketService);
    NotificationService.initializeSocketService(socketService);

    // ✅ NOW attach the actual handlers to the already-mounted router.
    // Since socketRoutes was mounted BEFORE the 404 handler, any routes
    // added to it now are still reachable — Express resolves handlers
    // on the Router at request time, not at mount time.
    // These are the live presence routes (the identical-looking block in
    // app.ts sits behind an `if (socketService)` that never runs, so it is
    // dead code and was removed). They were open to the internet: anyone
    // could poll who was online platform-wide, watch a named user's activity
    // pattern, or enumerate an organization's membership by walking
    // organizationId values. Presence is personal data — members only.
    socketRoutes.get("/api/users/:userId/status", VerifyToken, (req, res) => {
      res.json(socketService.getUserStatus(req.params.userId));
    });

    socketRoutes.get("/api/users/online", VerifyToken, (req, res) => {
      res.json({ online: socketService.getOnlineUsers() });
    });

    socketRoutes.get("/api/organizations/:organizationId/online", VerifyToken, (req, res) => {
      const users = socketService.getOrganizationOnlineUsers(req.params.organizationId);
      res.json({ organizationId: req.params.organizationId, onlineCount: users.length, users });
    });

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const shutdown = () => {
      socketService.cleanup();
      httpServer.close(async () => {
        await closeRedis();
        process.exit(0);
      });
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();