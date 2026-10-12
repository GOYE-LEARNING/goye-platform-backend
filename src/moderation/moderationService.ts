import crypto from "crypto";
import {
  MODERATION_CATEGORIES,
  MODERATION_DECISIONS,
  MODERATION_JSON_SCHEMA,
  POLICY_VERSION,
  RISK_LEVELS,
  buildSystemPrompt,
  type ModerationCategory,
  type ModerationDecision,
  type RiskLevel,
} from "./policy";

export type ModerationStatusValue = "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "HUMAN_REVIEW";

export interface AiVerdict {
  decision: ModerationDecision;
  riskLevel: RiskLevel;
  categories: ModerationCategory[];
  confidence: number;
  reason: string;
  requiresHumanReview: boolean;
}

// Flat shape (not a discriminated union): the project compiles without
// strictNullChecks, where TypeScript cannot narrow a union on `ok`.
export interface EvaluationResult {
  ok: boolean;
  verdict?: AiVerdict;
  model?: string;
  latencyMs: number;
  truncated?: boolean;
  error?: string;
}

export interface ModerationInput {
  content: string;
  title?: string;
}

/** Longest text sent to the model. Longer submissions are force-routed to a human. */
export const MAX_MODERATED_CHARS = 8000;
const MAX_REASON_CHARS = 300;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const ALLOW_MIN_CONFIDENCE = 0.7;
const BLOCK_MIN_CONFIDENCE = 0.8;

export const moderationMetrics = {
  evaluations: 0,
  allow: 0,
  review: 0,
  block: 0,
  providerFailures: 0,
  invalidResponses: 0,
  timeouts: 0,
  totalLatencyMs: 0,
};

function config() {
  return {
    apiKey: process.env.GROQ_API_KEY?.trim(),
    model: process.env.GROQ_MODERATION_MODEL?.trim(),
    timeoutMs: Number(process.env.MODERATION_TIMEOUT_MS) || 6000,
    maxRetries: Number.isFinite(Number(process.env.MODERATION_MAX_RETRIES))
      ? Number(process.env.MODERATION_MAX_RETRIES)
      : 1,
  };
}

/** Validates the untrusted model output. Returns null if anything is off. */
export function validateVerdict(raw: unknown): AiVerdict | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (!MODERATION_DECISIONS.includes(r.decision as ModerationDecision)) return null;
  if (!RISK_LEVELS.includes(r.riskLevel as RiskLevel)) return null;
  if (!Array.isArray(r.categories)) return null;
  if (!r.categories.every((c) => MODERATION_CATEGORIES.includes(c as ModerationCategory))) return null;
  if (typeof r.confidence !== "number" || !Number.isFinite(r.confidence) || r.confidence < 0 || r.confidence > 1) {
    return null;
  }
  if (typeof r.reason !== "string") return null;
  if (typeof r.requiresHumanReview !== "boolean") return null;

  return {
    decision: r.decision as ModerationDecision,
    riskLevel: r.riskLevel as RiskLevel,
    categories: [...new Set(r.categories as ModerationCategory[])],
    confidence: r.confidence,
    reason: r.reason.trim().slice(0, MAX_REASON_CHARS),
    requiresHumanReview: r.requiresHumanReview,
  };
}

function parseModelJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function neutraliseMarkers(text: string): string {
  // Stops submitted text from faking the data-boundary markers.
  return text.replace(/<<</g, "‹‹‹").replace(/>>>/g, "›››");
}

async function callGroqOnce(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  timeoutMs: number,
): Promise<{ status: "ok"; text: string } | { status: "retryable" | "fatal"; error: string; retryAfterMs?: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 1500,
        // gpt-oss models spend tokens "thinking"; the free tier is token-metered,
        // and this is a classification task, so keep reasoning short.
        reasoning_effort: "low",
        response_format: { type: "json_schema", json_schema: MODERATION_JSON_SCHEMA },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (res.status === 429 || res.status >= 500) {
      const retryAfterSec = Number(res.headers.get("retry-after"));
      return {
        status: "retryable",
        error: `provider_http_${res.status}`,
        retryAfterMs: Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? Math.min(retryAfterSec * 1000, 8000) : undefined,
      };
    }
    if (!res.ok) return { status: "fatal", error: `provider_http_${res.status}` };

    const body: any = await res.json();
    const text = body?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return { status: "fatal", error: "provider_empty_response" };
    }
    return { status: "ok", text };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      moderationMetrics.timeouts++;
      return { status: "retryable", error: "provider_timeout" };
    }
    return { status: "retryable", error: "provider_network_error" };
  } finally {
    clearTimeout(timer);
  }
}

export async function evaluateContent(input: ModerationInput): Promise<EvaluationResult> {
  const started = Date.now();
  const { apiKey, model, timeoutMs, maxRetries } = config();

  const fail = (error: string): EvaluationResult => {
    moderationMetrics.providerFailures++;
    return { ok: false, error, latencyMs: Date.now() - started };
  };

  if (!apiKey || !model) return fail("moderation_not_configured");

  const fullText = [input.title ? `Title: ${input.title}` : null, input.content].filter(Boolean).join("\n\n");
  const truncated = fullText.length > MAX_MODERATED_CHARS;
  const text = neutraliseMarkers(truncated ? fullText.slice(0, MAX_MODERATED_CHARS) : fullText);

  const boundary = `SUBMISSION_${crypto.randomBytes(8).toString("hex")}`;
  const system = buildSystemPrompt(boundary);
  const user = `<<<${boundary}>>>\n${text}\n<<<END_${boundary}>>>`;

  let lastError = "provider_failed";
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await callGroqOnce(apiKey, model, system, user, timeoutMs);

    if (result.status === "ok") {
      const verdict = validateVerdict(parseModelJson(result.text));
      if (!verdict) {
        moderationMetrics.invalidResponses++;
        return fail("invalid_provider_response");
      }
      const latencyMs = Date.now() - started;
      moderationMetrics.evaluations++;
      moderationMetrics[verdict.decision]++;
      moderationMetrics.totalLatencyMs += latencyMs;
      return { ok: true, verdict, model, latencyMs, truncated };
    }

    lastError = result.error;
    if (result.status === "fatal") break;
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, result.retryAfterMs ?? 400 * (attempt + 1)));
    }
  }
  return fail(lastError);
}

/**
 * Turns the AI's recommendation into a publication status. Deliberately
 * conservative: only an unambiguous, high-confidence, low-risk "allow"
 * publishes automatically, and only a confident, non-trivial "block" rejects.
 * Everything else, and anything critical, goes to a human.
 */
export function decideStatus(
  verdict: AiVerdict,
  truncated = false,
): { status: ModerationStatusValue; escalated: boolean } {
  const escalated = verdict.riskLevel === "critical" || (verdict.categories.includes("self_harm") && verdict.riskLevel === "high");

  if (verdict.riskLevel === "critical" || truncated || verdict.categories.includes("self_harm")) {
    return { status: "HUMAN_REVIEW", escalated };
  }

  if (verdict.decision === "allow") {
    const clean =
      verdict.riskLevel === "low" &&
      !verdict.requiresHumanReview &&
      verdict.categories.length === 0 &&
      verdict.confidence >= ALLOW_MIN_CONFIDENCE;
    return { status: clean ? "PUBLISHED" : "HUMAN_REVIEW", escalated };
  }

  if (verdict.decision === "block") {
    // Severity ("riskLevel") and certainty ("confidence") are separate: clear
    // spam or abuse can be low-severity yet unambiguous. Reject only when the
    // model is confident; otherwise a human decides.
    const firm = verdict.confidence >= BLOCK_MIN_CONFIDENCE;
    return { status: firm ? "REJECTED" : "HUMAN_REVIEW", escalated };
  }

  return { status: "HUMAN_REVIEW", escalated };
}

export function hashContent(contentType: string, title: string | undefined, content: string): string {
  return crypto
    .createHash("sha256")
    .update(`${POLICY_VERSION}\u0000${contentType}\u0000${title ?? ""}\u0000${content.trim()}`)
    .digest("hex");
}

export function moderationConfigured(): boolean {
  const { apiKey, model } = config();
  return !!apiKey && !!model;
}
