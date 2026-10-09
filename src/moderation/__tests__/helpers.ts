import type { AiVerdict } from "../moderationService";

export const realFetch = globalThis.fetch;

export function verdict(overrides: Partial<AiVerdict> = {}): AiVerdict {
  return {
    decision: "allow",
    riskLevel: "low",
    categories: [],
    confidence: 0.97,
    reason: "Fine.",
    requiresHumanReview: false,
    ...overrides,
  };
}

function groqResponse(content: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => ({ choices: [{ message: { content } }] }),
  } as any;
}

/** Makes the next provider calls return this verdict (object) or raw string. */
export function mockProvider(body: AiVerdict | string | Record<string, unknown>) {
  const calls: any[] = [];
  globalThis.fetch = (async (_url: any, init: any) => {
    calls.push(JSON.parse(init.body));
    return groqResponse(typeof body === "string" ? body : JSON.stringify(body));
  }) as any;
  return calls;
}

export function mockProviderTimeout() {
  globalThis.fetch = ((_url: any, init: any) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => {
        const e: any = new Error("aborted");
        e.name = "AbortError";
        reject(e);
      });
    })) as any;
}

export function mockProviderHttp(status: number) {
  globalThis.fetch = (async () => groqResponse("", status)) as any;
}

export function restoreFetch() {
  globalThis.fetch = realFetch;
}
