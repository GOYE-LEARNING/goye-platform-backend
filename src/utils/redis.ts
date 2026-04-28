import { createClient } from "redis";
import 'dotenv/config'; // Ensures process.env is loaded

// Create the client instance
export const redisClient = createClient({
  username: "default",
  password: "avtxZn3cTwE3tK6rDizqN8BWJ0bqWGZY",
  socket: {
    host: process.env.REDIS_HOST,
    port: 18037,
  },
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("✅ Connected to Redis");
  }
}