// utils/constants.ts
export const PORT = process.env.PORT || 10000;

export const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3002",
  "http://127.0.0.1:3001",
  "http://localhost:3001",
  "https://goye-web-app.vercel.app",
  "https://goye-web-app.onrender.com",
  "https://goye-platform-backend.onrender.com",
  "https://2qm3zg9b-3000.uks1.devtunnels.ms",
  "https://goyewaitlist2026.vercel.app"
];

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export const SOCKET_EVENTS = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  PRIVATE_MESSAGE: "private:message",
  PRIVATE_MESSAGE_SENT: "private:message:sent",
  PRIVATE_MESSAGE_UPDATED: "private:message:updated",
  PRIVATE_MESSAGE_DELETED: "private:message:deleted",
  PRIVATE_CHAT_CLEARED: "private:chat:cleared",
  PRIVATE_TYPING: "private:typing",
  PRIVATE_READ: "private:read",
  PRIVATE_ERROR: "private:error",
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
  USERS_ONLINE_LIST: "users:online:list",
} as const;