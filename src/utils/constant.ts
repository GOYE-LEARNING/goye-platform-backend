export const PORT = process.env.PORT || 10000;

export const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://goye-web-app.vercel.app",
  "https://goye-web-app.onrender.com",
  "https://goye-platform-backend.onrender.com",
];

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export const SOCKET_EVENTS = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  PRIVATE_MESSAGE: "private:message",
  PRIVATE_MESSAGE_SENT: "private:message:sent",
  PRIVATE_TYPING: "private:typing",
  PRIVATE_READ: "private:read",
  PRIVATE_ERROR: "private:error",
  USER_ONLINE: "user:online",
  USERS_ONLINE_LIST: "users:online:list",
} as const;