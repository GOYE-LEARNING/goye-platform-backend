/**
 * Redis connectivity + cache diagnostic.
 *
 * Run with:  npx tsx src/scripts/test-redis.ts
 *
 * Unlike the previous version (which hardcoded localhost and so never tested
 * the configuration the app actually uses), this exercises the real
 * connection module and the real cache helpers.
 */
import dotenv from "dotenv";
dotenv.config();

import { getRedis, isRedisConfigured, closeRedis } from "../utils/redis/connection";
import { useCacheAside, invalidateKeys, invalidatePattern } from "../utils/redis/cache";
import { CacheKeys, TTL } from "../utils/redis/keys";

function describeConfig() {
  const url = process.env.REDIS_URL?.trim();
  const host = process.env.REDIS_HOST?.trim();
  const port = process.env.REDIS_PORT?.trim();
  const hasPassword = !!process.env.REDIS_PASSWORD?.trim();

  console.log("── Configuration ──────────────────────────────");
  if (url) {
    // Never print the URL itself — it embeds the password.
    console.log(`  REDIS_URL:      set (${url.split("://")[0]}://…)`);
  } else {
    console.log(`  REDIS_URL:      not set`);
    console.log(`  REDIS_HOST:     ${host ? `set (…${host.slice(-18)})` : "NOT SET"}`);
    console.log(`  REDIS_PORT:     ${port || "not set → defaulting to 6379"}`);
    console.log(`  REDIS_PASSWORD: ${hasPassword ? "set" : "NOT SET"}`);
    console.log(`  REDIS_TLS:      ${process.env.REDIS_TLS || "auto (on for remote hosts)"}`);
  }
  console.log(`  Configured:     ${isRedisConfigured ? "yes" : "NO — cache disabled"}`);
  console.log("");
}

async function main() {
  console.log("🧪 GOYE Redis diagnostic\n");
  describeConfig();

  console.log("── Connection ─────────────────────────────────");
  const client = await getRedis();

  if (!client) {
    console.error("  ❌ Could not connect.");
    console.error("     The API will still run, but every read hits Postgres.");
    console.error("     Check REDIS_HOST / REDIS_PORT / REDIS_PASSWORD, and that");
    console.error("     REDIS_PORT matches your provider (Redis Cloud is NOT 6379).");
    process.exitCode = 1;
    await closeRedis();
    return;
  }

  console.log("  ✅ Connected.");
  const pong = await client.ping();
  console.log(`  PING → ${pong}\n`);

  console.log("── Cache-aside behaviour ──────────────────────");
  const testUserId = "diagnostic-user";
  const key = CacheKeys.userProfile(testUserId);
  let dbHits = 0;

  const load = () =>
    useCacheAside(key, TTL.short, async () => {
      dbHits++;
      return { name: "diagnostic", at: new Date().toISOString() };
    });

  await load();
  console.log(`  1st call → DB hits: ${dbHits} (expected 1, cache was empty)`);
  await load();
  console.log(`  2nd call → DB hits: ${dbHits} (expected 1, served from cache)`);

  if (dbHits !== 1) {
    console.error("  ❌ Cache is not serving reads — every call is hitting the DB.");
    process.exitCode = 1;
  } else {
    console.log("  ✅ Reads are being served from cache.");
  }

  console.log("\n── Invalidation ───────────────────────────────");
  await invalidateKeys(key);
  await load();
  console.log(`  after invalidate → DB hits: ${dbHits} (expected 2, cache was cleared)`);
  if (dbHits !== 2) {
    console.error("  ❌ Invalidation did not clear the key — users would see stale data.");
    process.exitCode = 1;
  } else {
    console.log("  ✅ Invalidation clears the key.");
  }

  console.log("\n── Pattern sweep (SCAN) ───────────────────────");
  await client.set(`user:${testUserId}:course-detail:a`, "1");
  await client.set(`user:${testUserId}:course-detail:b`, "1");
  await invalidatePattern(`user:${testUserId}:course-detail:*`);
  const leftover = await client.keys(`user:${testUserId}:course-detail:*`);
  console.log(`  keys remaining after sweep: ${leftover.length} (expected 0)`);
  if (leftover.length !== 0) {
    console.error("  ❌ Pattern invalidation left keys behind.");
    process.exitCode = 1;
  } else {
    console.log("  ✅ Pattern sweep works.");
  }

  // Clean up anything this script created.
  await invalidatePattern(`user:${testUserId}:*`);

  console.log("\n── Cache contents ─────────────────────────────");
  const allKeys = await client.keys("*");
  console.log(`  ${allKeys.length} key(s) currently cached`);
  for (const k of allKeys.slice(0, 15)) {
    console.log(`    - ${k} (ttl: ${await client.ttl(k)}s)`);
  }
  if (allKeys.length > 15) console.log(`    … and ${allKeys.length - 15} more`);

  await closeRedis();
  console.log(
    process.exitCode ? "\n❌ Diagnostic finished with failures.\n" : "\n✅ All checks passed.\n",
  );
}

main().catch(async (err) => {
  console.error("Diagnostic crashed:", err);
  await closeRedis();
  process.exit(1);
});
