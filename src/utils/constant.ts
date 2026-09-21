// utils/constants.ts
export const PORT = process.env.PORT || 10000;

/**
 * Extra origins from the environment, comma-separated. Useful for a preview
 * deploy or a tunnel without editing and redeploying this file.
 *
 *   EXTRA_ALLOWED_ORIGINS=https://goye-preview.vercel.app,https://abc.ngrok.io
 */
const EXTRA_ORIGINS = (process.env.EXTRA_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3002",
  "http://127.0.0.1:3001",
  "http://localhost:3001",
  "https://goye-web-app.vercel.app",
  "https://goye.vercel.app",
  "https://goye-mauve.vercel.app",
  "https://goye-web-app.onrender.com",
  "https://goye-platform-backend.onrender.com",
  "https://2qm3zg9b-3000.uks1.devtunnels.ms",
  "https://goyewaitlist2026.vercel.app",
  ...EXTRA_ORIGINS,
];

/**
 * Whether to accept any loopback origin regardless of port.
 *
 * Off unless ALLOW_LOCALHOST_ORIGINS=true. The hardcoded list above pins three
 * specific dev ports, so a dev server that lands on any other port — which
 * happens whenever 3000 is already taken — gets its requests refused, and the
 * failure looks like a broken API rather than a CORS policy.
 *
 * Gated behind an explicit flag rather than NODE_ENV, because this project
 * runs locally with NODE_ENV=production and a NODE_ENV check would therefore
 * do nothing here.
 */
export const ALLOW_LOCALHOST_ORIGINS = process.env.ALLOW_LOCALHOST_ORIGINS === "true";

/** Matches http://localhost:PORT and http://127.0.0.1:PORT, nothing else. */
export const LOCALHOST_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

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