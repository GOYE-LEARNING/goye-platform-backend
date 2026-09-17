import { Queue } from "bullmq";
import IORedis from "ioredis";
import { buildBullConnection } from "../connection";
import { SendEmail } from "../../sendmail";

/**
 * Outbound notification queue (email / push / SMS).
 *
 * Two fixes over the previous version:
 *
 *  1. The connection was hardcoded to 127.0.0.1:6379, so off-box every job
 *     failed to enqueue.
 *  2. `queueNotification` caught the enqueue error and returned normally,
 *     which meant that whenever Redis was unreachable, emails silently
 *     disappeared — including organization invites, where the user is left
 *     waiting for a mail that will never arrive. Email now falls back to
 *     sending inline rather than being dropped.
 */

const opts = {
  maxRetriesPerRequest: null, // required by BullMQ
  connectTimeout: 15000,
  retryStrategy: (times: number) => Math.min(times * 200, 5000),
};

const connection = buildBullConnection();

const queueConnection =
  typeof connection === "string"
    ? new IORedis(connection, opts)
    : new IORedis({ ...connection, ...opts });

queueConnection.on("error", (err) => {
  console.error("[Notification Queue] Redis connection error:", err?.message ?? err);
});

export const notificationQueue = new Queue("notification-delivery", {
  connection: queueConnection,
});

export type NotificationJobType = "send-email" | "send-push" | "send-sms";

export interface NotificationPayload {
  recipientId: string;
  targetAddress: string; // email address, device push token, or phone number
  title: string;
  body: string;
  metadata?: Record<string, any>;
}

/**
 * Dispatch a notification out-of-band.
 *
 * If the queue is unreachable, email is sent inline instead of being lost.
 * That costs the request some latency, but a delayed invite is recoverable
 * and a dropped one is not.
 */
export async function queueNotification(
  type: NotificationJobType,
  payload: NotificationPayload,
): Promise<void> {
  try {
    await notificationQueue.add(type, payload, {
      attempts: 3, // retry automatically if the external API is down
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: { age: 7 * 24 * 3600 }, // keep failures a week for debugging
    });
  } catch (error: any) {
    console.error(
      `[Notification Queue] Enqueue failed for ${type}:`,
      error?.message ?? error,
    );

    if (type === "send-email") {
      try {
        console.warn("[Notification Queue] Falling back to inline email send.");
        await SendEmail(
          payload.targetAddress,
          payload.title,
          payload.body,
          payload.metadata?.type || "broadcast",
          payload.metadata?.additionalData || {},
        );
      } catch (sendErr: any) {
        console.error(
          "[Notification Queue] Inline email fallback also failed:",
          sendErr?.message ?? sendErr,
        );
      }
    }
  }
}
