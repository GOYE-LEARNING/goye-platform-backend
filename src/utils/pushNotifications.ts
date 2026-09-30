import prisma from "../db";

/**
 * Sends a push notification to every device a user is logged in on, via
 * Expo's push service (which forwards to FCM/APNs on our behalf — no
 * Firebase Admin SDK or APNs certificate handling needed on our end, only
 * the client-side Expo project having its FCM/APNs credentials configured).
 *
 * Deliberately fire-and-forget from every call site: a push failure must
 * never break notification creation, matching how Redis caching and email
 * queueing are already treated as best-effort side effects in this codebase.
 */
export async function sendExpoPush(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, any> },
): Promise<void> {
  try {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        isRevoked: false,
        expoPushToken: { not: null },
      },
      select: { expoPushToken: true },
    });

    const tokens = [...new Set(sessions.map((s) => s.expoPushToken!).filter(Boolean))];
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: "default",
    }));

    // Expo caps a single push request at 100 messages.
    const CHUNK_SIZE = 100;
    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const chunk = messages.slice(i, i + CHUNK_SIZE);
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        console.error(`[Push] Expo push request failed: ${res.status} ${await res.text()}`);
        continue;
      }

      // A per-message ticket error (e.g. DeviceNotRegistered) means the
      // token is dead — clear it so future sends don't keep paying for a
      // request that will never succeed.
      const { data: tickets } = (await res.json()) as {
        data: { status: string; details?: { error?: string } }[];
      };
      const deadTokens = tickets
        .map((ticket, idx) => (ticket.status === "error" ? chunk[idx].to : null))
        .filter((t): t is string => t !== null);

      if (deadTokens.length) {
        await prisma.userSession
          .updateMany({
            where: { expoPushToken: { in: deadTokens } },
            data: { expoPushToken: null },
          })
          .catch(() => {});
      }
    }
  } catch (error) {
    console.error("[Push] Failed to send push notification:", error);
  }
}
