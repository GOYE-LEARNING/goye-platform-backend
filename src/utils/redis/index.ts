/**
 * Redis / caching public API.
 *
 * Import from `utils/redis` rather than reaching into individual files, so
 * internals can move without touching every controller.
 *
 *   import { useCacheAside, CacheKeys, TTL } from "../utils/redis";
 *
 * Layout:
 *   connection.ts  — connection lifecycle, env config, graceful degradation
 *   keys.ts        — key registry + TTL policy (the single source of truth)
 *   cache.ts       — cache-aside reads and invalidation
 *   queues/        — BullMQ background jobs (notification delivery)
 */

export {
  getRedis,
  initRedis,
  closeRedis,
  isRedisConfigured,
  buildBullConnection,
} from "./connection";

export { CacheKeys, CachePatterns, TTL, type CacheScope } from "./keys";

export {
  useCacheAside,
  invalidateKeys,
  invalidatePattern,
  updateDataWithRedis,
  invalidateCourseCaches,
  invalidateOrgCaches,
  invalidateNotificationCaches,
  invalidateGroupCaches,
  invalidateDirectoryCaches,
} from "./cache";

export {
  queueNotification,
  notificationQueue,
  type NotificationJobType,
  type NotificationPayload,
} from "./queues/notification.queue";

export { startNotificationWorker } from "./queues/notification.worker";
