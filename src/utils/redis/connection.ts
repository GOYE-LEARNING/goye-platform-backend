import { createClient, type RedisClientType } from "redis";
import dotenv from "dotenv";

dotenv.config();

/**
 * Single source of truth for the Redis connection.
 *
 * Two hard rules, both learned from the previous setup:
 *
 * 1. NEVER take the process down. Redis here is a cache — a cost optimisation
 *    in front of Postgres, not a system of record. The old worker.ts called
 *    `process.exit(1)` when it couldn't reach Redis, and because cacheHelper
 *    imported it transitively, simply importing the cache helper would kill
 *    the API on any host without a local Redis. Every failure path below
 *    degrades to "no cache" instead.
 *
 * 2. Read the connection from the environment. The old code hardcoded
 *    `127.0.0.1:6379` while REDIS_HOST / REDIS_PASSWORD sat unused in .env,
 *    so the provisioned cloud instance was never actually contacted.
 *
 * Accepted configuration, in priority order:
 *   REDIS_URL                                  e.g. rediss://:pass@host:6380
 *   REDIS_HOST + REDIS_PORT + REDIS_PASSWORD   composed into a URL
 *   (nothing)                                  caching disabled, app runs fine
 */

function buildRedisUrl(): string | null {
  const explicit = process.env.REDIS_URL?.trim();
  if (explicit) return explicit;

  const host = process.env.REDIS_HOST?.trim();
  if (!host) return null;

  // If REDIS_HOST was pasted as a full URL, honour it as-is.
  if (host.startsWith("redis://") || host.startsWith("rediss://")) return host;

  const port = process.env.REDIS_PORT?.trim() || "6379";
  const password = process.env.REDIS_PASSWORD?.trim();
  // Managed Redis (Redis Cloud, Upstash, Render) terminates TLS; a bare
  // localhost dev instance does not.
  const useTls =
    process.env.REDIS_TLS === "true" ||
    (host !== "localhost" && host !== "127.0.0.1" && process.env.REDIS_TLS !== "false");
  const scheme = useTls ? "rediss" : "redis";
  const auth = password ? `:${encodeURIComponent(password)}@` : "";

  return `${scheme}://${auth}${host}:${port}`;
}

const redisUrl = buildRedisUrl();

/** True when a Redis target is configured at all. */
export const isRedisConfigured = redisUrl !== null;

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType | null> | null = null;
/** Flipped on once we've failed, so we stop retrying on every single request. */
let unavailableUntil = 0;
const RETRY_COOLDOWN_MS = 30_000;

function createRedisClient(): RedisClientType {
  const c: RedisClientType = createClient({
    url: redisUrl!,
    socket: {
      connectTimeout: 10_000,
      // Give up reconnecting after a few tries rather than looping forever and
      // flooding the logs; getRedis() will try again after the cooldown.
      reconnectStrategy: (retries) => (retries > 3 ? false : Math.min(retries * 200, 1000)),
    },
  });

  // An 'error' listener is mandatory: without one, node-redis emits an
  // unhandled 'error' event, which crashes the process — the exact failure
  // mode this module exists to prevent.
  c.on("error", (err) => {
    console.error("[Redis] client error:", err?.message ?? err);
  });
  c.on("ready", () => console.log("[Redis] connected and ready."));
  c.on("end", () => console.log("[Redis] connection closed."));

  return c;
}

/**
 * Returns a connected client, or null when Redis is unconfigured/unreachable.
 * Callers must treat null as "skip the cache", never as an error.
 */
export async function getRedis(): Promise<RedisClientType | null> {
  if (!isRedisConfigured) return null;
  if (Date.now() < unavailableUntil) return null;
  if (client?.isReady) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      if (!client) client = createRedisClient();
      if (!client.isOpen) await client.connect();
      return client.isReady ? client : null;
    } catch (err: any) {
      console.error(
        `[Redis] connection failed, caching disabled for ${RETRY_COOLDOWN_MS / 1000}s:`,
        err?.message ?? err,
      );
      unavailableUntil = Date.now() + RETRY_COOLDOWN_MS;
      try {
        await client?.destroy();
      } catch {
        /* already gone */
      }
      client = null;
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

/** Warms the connection at boot so the first request isn't the one that pays for it. */
export async function initRedis(): Promise<void> {
  if (!isRedisConfigured) {
    console.warn(
      "[Redis] No REDIS_URL or REDIS_HOST configured — running without cache (every read hits Postgres).",
    );
    return;
  }
  const c = await getRedis();
  if (!c) console.warn("[Redis] Unavailable at boot — the API will run uncached until it recovers.");
}

/**
 * Connection options for BullMQ, which needs its own ioredis client (it uses
 * blocking commands that can't share the cache connection).
 *
 * Exported from here so the queue and worker files can't drift back into
 * hardcoding localhost independently of each other.
 */
export function buildBullConnection(): string | Record<string, any> {
  const url = process.env.REDIS_URL?.trim();
  if (url) return url;

  const host = process.env.REDIS_HOST?.trim() || "127.0.0.1";
  if (host.startsWith("redis://") || host.startsWith("rediss://")) return host;

  const port = Number(process.env.REDIS_PORT?.trim() || 6379);
  const password = process.env.REDIS_PASSWORD?.trim() || undefined;
  const useTls =
    process.env.REDIS_TLS === "true" ||
    (host !== "localhost" && host !== "127.0.0.1" && process.env.REDIS_TLS !== "false");

  return { host, port, password, ...(useTls ? { tls: {} } : {}) };
}

/** Closes the connection on shutdown. Safe to call when never connected. */
export async function closeRedis(): Promise<void> {
  try {
    if (client?.isOpen) await client.quit();
  } catch {
    /* nothing useful to do while shutting down */
  } finally {
    client = null;
  }
}
