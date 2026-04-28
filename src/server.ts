// src/server.ts (NOT in a subfolder)
import { createServer } from "http";
import { createApp } from "./app"; // Remove "./src/" because we're already in src
import { SocketService } from "./services/socketService";
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

    // API endpoints
    app.get("/api/users/:userId/status", (req, res) => {
      const { userId } = req.params;
      res.json(socketService.getUserStatus(userId));
    });

    app.get("/api/users/online", (req, res) => {
      res.json({ online: socketService.getOnlineUsers() });
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
      httpServer.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received, shutting down...");
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
