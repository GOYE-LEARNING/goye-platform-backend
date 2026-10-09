// Imported FIRST by every test file. Runs before any app module is loaded.
import "dotenv/config";

const dbUrl = process.env.DATABASE_URL ?? "";
let host = "";
try {
  host = new URL(dbUrl.replace(/^postgres(ql)?:/, "http:")).hostname;
} catch {
  host = "";
}

// These tests create and delete rows. Never run them against a hosted database.
if (host !== "localhost" && host !== "127.0.0.1") {
  throw new Error(`Refusing to run moderation tests: DATABASE_URL host is "${host}", expected localhost.`);
}

// .env also holds a real Redis Cloud instance. An empty value (dotenv never
// overrides an already-set variable) turns caching off so tests can't read or
// write the shared cache.
process.env.REDIS_HOST = "";
process.env.REDIS_URL = "";
process.env.REDIS_PASSWORD = "";
// The notification queue builds its own connection from the port; point it at
// the local Redis container instead of the hosted instance.
process.env.REDIS_PORT = "6379";

process.env.GROQ_API_KEY = "test-key-not-real";
process.env.GROQ_MODERATION_MODEL = "test-model";
process.env.MODERATION_MAX_RETRIES = "0";
process.env.MODERATION_TIMEOUT_MS = "400";
