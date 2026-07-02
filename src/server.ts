// src/server.ts
import { createServer } from "http";
import { createApp, socketRoutes } from "./app"; // ✅ import the placeholder router
import { SocketService } from "./services/socketService";
import { NotificationService } from "./services/notificationServices";
import { PORT } from "./utils/constant";

const startServer = async () => {
  try {
    const app = await createApp(); // socketRoutes is mounted but empty right now
    const httpServer = createServer(app);
    const socketService = new SocketService(httpServer);

    app.set("socketService", socketService);
    NotificationService.initializeSocketService(socketService);

    // ✅ NOW attach the actual handlers to the already-mounted router.
    // Since socketRoutes was mounted BEFORE the 404 handler, any routes
    // added to it now are still reachable — Express resolves handlers
    // on the Router at request time, not at mount time.
    socketRoutes.get("/api/users/:userId/status", (req, res) => {
      res.json(socketService.getUserStatus(req.params.userId));
    });

    socketRoutes.get("/api/users/online", (req, res) => {
      res.json({ online: socketService.getOnlineUsers() });
    });

    socketRoutes.get("/api/organizations/:organizationId/online", (req, res) => {
      const users = socketService.getOrganizationOnlineUsers(req.params.organizationId);
      res.json({ organizationId: req.params.organizationId, onlineCount: users.length, users });
    });

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    process.on("SIGTERM", () => { socketService.cleanup(); httpServer.close(() => process.exit(0)); });
    process.on("SIGINT", () => { socketService.cleanup(); httpServer.close(() => process.exit(0)); });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();