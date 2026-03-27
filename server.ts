import { createServer } from "http";
import { createApp } from "./src/app";
import { SocketService } from "./src/services/socketService";
import { PORT } from "./src/utils/constant";

const app = createApp();
const httpServer = createServer(app);

// Initialize Socket.IO service
const socketService = new SocketService(httpServer);

// API endpoint to get user online status
app.get("/api/users/:userId/status", (req, res) => {
  const { userId } = req.params;
  res.json(socketService.getUserStatus(userId));
});

// Get all online users
app.get("/api/users/online", (req, res) => {
  res.json({ online: socketService.getOnlineUsers() });
});

httpServer.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Swagger: http://localhost:${PORT}/api/docs`);
  console.log(` Socket.IO server ready`);
});