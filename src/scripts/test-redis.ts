// scripts/test-redis.js (Node.js script)
import { createClient } from "redis";

async function testRedis() {
  console.log("🧪 Testing Redis connection...");
  
  const client = createClient({
    socket: {
      host: 'localhost',
      port: 6379,
    },
  });

  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('✅ Redis connected');
  });

  try {
    // Connect
    console.log("🔄 Connecting to Redis...");
    await client.connect();
    console.log("✅ Connected!");

    // Test ping
    console.log("🏓 Testing ping...");
    const ping = await client.ping();
    console.log(`Ping response: ${ping}`);

    // Test SET
    console.log("📝 Testing SET...");
    const testKey = `test:${Date.now()}`;
    const testValue = { 
      message: 'Hello from Node!', 
      timestamp: new Date().toISOString() 
    };
    
    await client.setEx(testKey, 60, JSON.stringify(testValue));
    console.log(`✅ SET successful: ${testKey}`);

    // Test GET
    console.log("🔍 Testing GET...");
    const retrieved = await client.get(testKey);
    console.log(`✅ GET successful: ${retrieved}`);

    // List all keys
    console.log("📋 Listing all keys...");
    const keys = await client.keys('*');
    console.log(`Found ${keys.length} keys:`, keys);

    // Show details for each key
    for (const key of keys) {
      const type = await client.type(key);
      const ttl = await client.ttl(key);
      console.log(`  - ${key} (type: ${type}, TTL: ${ttl}s)`);
    }

    // Clean up
    if (keys.length > 0) {
      console.log("🧹 Cleaning up test keys...");
      for (const key of keys as any) {
        if (key.startsWith('test:')) {
          await client.del(key);
          console.log(`  Deleted: ${key}`);
        }
      }
    }

    console.log("✅ All tests passed!");
    await client.quit();
    console.log("🔌 Disconnected");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testRedis();