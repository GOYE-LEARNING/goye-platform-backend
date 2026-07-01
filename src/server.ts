// src/server.ts (NOT in a subfolder)
import { createServer } from "http";
import { createApp } from "./app"; // Remove "./src/" because we're already in src
import { SocketService } from "./services/socketService";
import { NotificationService } from "./services/notificationServices"; // ✅ ADD
import { PORT } from "./utils/constant"; // Fix typo: constant -> constants
import { connectRedis } from "./utils/redis";

console.log(" Starting server...");

const startServer = async () => {
  try {
    console.log(" Creating app...");
    const app = await createApp();
    console.log(" Creating HTTP server...");
    const httpServer = createServer(app);

    console.log(" Initializing Socket.IO...");
    const socketService = new SocketService(httpServer);

    // ✅ CRITICAL: make socketService reachable from tsoa controllers
    // via req.app.get("socketService") — this is what the new
    // /organizations/overview-stats endpoint relies on for live counts.
    app.set("socketService", socketService);

    // ✅ Wire the socket service into NotificationService so notification
    // creation anywhere in the app (controllers, services) can broadcast
    // in real time.
    NotificationService.initializeSocketService(socketService);

    // API endpoints
    app.get("/api/users/:userId/status", (req, res) => {
      const { userId } = req.params;
      res.json(socketService.getUserStatus(userId));
    });

    app.get("/api/users/online", (req, res) => {
      res.json({ online: socketService.getOnlineUsers() });
    });

    // ✅ Optional but handy: org-scoped online endpoint for quick manual
    // testing without going through the full overview-stats endpoint.
    app.get("/api/organizations/:organizationId/online", (req, res) => {
      const { organizationId } = req.params;
      const users = socketService.getOrganizationOnlineUsers(organizationId);
      res.json({ organizationId, onlineCount: users.length, users });
    });

    console.log(` Listening on port ${PORT}...`);
    httpServer.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
      console.log(` Swagger: http://localhost:${PORT}/api/docs`);
      console.log(` Socket.IO server ready`);
    });

    // Handle shutdown gracefully
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down...");
      socketService.cleanup(); // ✅ close socket connections cleanly too
      httpServer.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received, shutting down...");
      socketService.cleanup(); // ✅ same here
      httpServer.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error(" Failed to start server:", error);
    console.error(error);
    process.exit(1);
  }
};

startServer();