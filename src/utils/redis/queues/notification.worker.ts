import { Worker } from "bullmq";
import IORedis from "ioredis";
import { SendEmail } from "../../sendmail";
import { buildBullConnection } from "../connection";

/**
 * Background worker that actually delivers queued notifications.
 *
 * Changes from the previous version:
 *  - Connection comes from env rather than a hardcoded 127.0.0.1:6379.
 *  - It no longer calls `process.exit(1)` on failure. This module is imported
 *    into the API process, so a Redis hiccup was enough to kill the whole API.
 *  - Starting is explicit via `startNotificationWorker()` instead of running
 *    as an import side effect, so importing a type from this file can't spin
 *    up a worker.
 */

const opts = {
  maxRetriesPerRequest: null, // required by BullMQ
  connectTimeout: 15000,
  retryStrategy: (times: number) => Math.min(times * 200, 5000),
};

let worker: Worker | null = null;

export function startNotificationWorker(): Worker | null {
  if (worker) return worker;

  try {
    const connection = buildBullConnection();
    const queueConnection =
      typeof connection === "string"
        ? new IORedis(connection, opts)
        : new IORedis({ ...connection, ...opts });

    queueConnection.on("error", (err) => {
      console.error("[Notification Worker] Redis connection error:", err?.message ?? err);
    });

    worker = new Worker(
      "notification-delivery",
      async (job) => {
        const { targetAddress, title, body, metadata } = job.data;

        switch (job.name) {
          case "send-email": {
            const emailType = metadata?.type || "broadcast";
            const additionalTemplateData = metadata?.additionalData || {};
            await SendEmail(targetAddress, title, body, emailType, additionalTemplateData);
            break;
          }
          case "send-push":
            // Ready for Firebase Cloud Messaging (FCM)
            console.log(`[Notification Worker] Push queued for token: ${targetAddress}`);
            break;
          case "send-sms":
            console.log(`[Notification Worker] SMS queued for: ${targetAddress}`);
            break;
          default:
            console.warn(`[Notification Worker] Unhandled job type: ${job.name}`);
        }
      },
      { connection: queueConnection },
    );

    worker.on("failed", (job, err) => {
      console.error(
        `[Notification Worker] Job ${job?.id} failed on attempt ${job?.attemptsMade}:`,
        err?.message ?? err,
      );
    });

    worker.on("ready", () => {
      console.log("[Notification Worker] Listening for delivery jobs.");
    });

    return worker;
  } catch (err: any) {
    // Never fatal: undelivered notifications are recoverable, a dead API is not.
    console.error(
      "[Notification Worker] Failed to start; notifications will not be delivered in the background:",
      err?.message ?? err,
    );
    return null;
  }
}
