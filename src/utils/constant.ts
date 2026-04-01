// utils/constant.ts
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
  USERS_ONLINE_LIST: "users:online:list",
} as const;