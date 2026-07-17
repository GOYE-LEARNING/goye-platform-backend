// lib/redis.ts
import { createClient } from "redis";

// Create the client instance
export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Add comprehensive event listeners
redisClient.on("error", (err) => {
  console.error("❌ Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redisClient.on("ready", () => {
  console.log("✅ Redis is ready to accept commands");
});

redisClient.on("end", () => {
  console.log("🔌 Redis connection ended");
});

export async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      console.log("🔄 Connecting to Redis...");
      await redisClient.connect();
      console.log("✅ Redis connection established");
      
      // Test connection
      const pingResult = await redisClient.ping();
      console.log(`🏓 Redis ping response: ${pingResult}`);
      return true;
    }
    console.log("ℹ️ Redis already connected");
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to Redis:", error);
    return false;
  }
}

// Helper to set data with logging
export async function setRedisData(key: string, value: any, ttl: number = 3600) {
  try {
    console.log(`📝 Attempting to set key: ${key}`);
    console.log(`📦 Value type: ${typeof value}`);
    console.log(`📦 Value preview: ${JSON.stringify(value).substring(0, 100)}...`);
    
    const stringValue = JSON.stringify(value);
    await redisClient.setEx(key, ttl, stringValue);
    
    console.log(`✅ Successfully set key: ${key} (TTL: ${ttl}s)`);
    
    // Verify it was set
    const verify = await redisClient.get(key);
    console.log(`🔍 Verification - Key exists: ${!!verify}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to set key ${key}:`, error);
    return false;
  }
}

// Helper to get data with logging
export async function getRedisData(key: string) {
  try {
    console.log(`🔍 Attempting to get key: ${key}`);
    const data = await redisClient.get(key);
    
    if (data) {
      console.log(`✅ Found key: ${key}`);
      return JSON.parse(data as any);
    } else {
      console.log(`❌ Key not found: ${key}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to get key ${key}:`, error);
    return null;
  }
}

// Helper to get all keys with logging
export async function getAllRedisKeys() {
  try {
    console.log("🔍 Getting all Redis keys...");
    const keys = await redisClient.keys('*');
    console.log(`📋 Found ${keys.length} keys:`, keys);
    
    // Get values for each key
    for (const key of keys) {
      const type = await redisClient.type(key);
      const ttl = await redisClient.ttl(key);
      console.log(`  - ${key} (type: ${type}, TTL: ${ttl}s)`);
    }
    
    return keys;
  } catch (error) {
    console.error("❌ Failed to get keys:", error);
    return [];
  }
}