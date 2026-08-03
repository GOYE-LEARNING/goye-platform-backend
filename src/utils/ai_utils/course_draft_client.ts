// utils/ai_utils/course_draft_client.ts
//
// Server-to-server client for ShekiAI's course-draft AI assistant.
// GOYE's backend is the only allowed caller of these endpoints (gated by
// a shared X-Service-Key on ShekiAI's side) — the browser never talks to
// ShekiAI's REST API directly, only to its Socket.IO server (see
// SHEKI_AI_URL/SHEKIAI_SERVICE_KEY in .env).
import dotenv from "dotenv";
dotenv.config();

interface AIResponse {
  message: string;
  data: any[];
  status: number;
  error: string[];
}

function baseUrl() {
  return `${process.env.SHEKI_AI_URL}/ai_v1/course-draft`;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "X-Service-Key": process.env.SHEKIAI_SERVICE_KEY || "",
  };
}

async function parse(res: Response): Promise<AIResponse> {
  const data = await res.json();
  return {
    message: data.message ?? (res.ok ? "Success" : "Request failed"),
    data: data.data ?? [],
    status: res.status,
    error: data.error ?? [],
  };
}

export async function startCourseDraft(tutorId: string, tutorName: string, message?: string): Promise<AIResponse> {
  const res = await fetch(`${baseUrl()}/start`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ tutorId, tutorName, message }),
  });
  return parse(res);
}

export async function sendCourseDraftMessage(
  sessionId: string,
  tutorId: string,
  tutorName: string,
  message: string,
): Promise<AIResponse> {
  const res = await fetch(`${baseUrl()}/${sessionId}/message`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ tutorId, tutorName, message }),
  });
  return parse(res);
}

export async function sendCourseDraftVoiceMessage(
  sessionId: string,
  tutorId: string,
  tutorName: string,
  file: Express.Multer.File,
): Promise<AIResponse> {
  const form = new FormData();
  form.append("tutorId", tutorId);
  form.append("tutorName", tutorName);
  form.append("audio", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname || "audio.webm");

  const res = await fetch(`${baseUrl()}/${sessionId}/voice-message`, {
    method: "POST",
    headers: { "X-Service-Key": process.env.SHEKIAI_SERVICE_KEY || "" },
    body: form,
  });
  return parse(res);
}

export async function getCourseDraftSession(sessionId: string, tutorId: string): Promise<AIResponse> {
  const res = await fetch(`${baseUrl()}/${sessionId}?tutorId=${encodeURIComponent(tutorId)}`, {
    headers: headers(),
  });
  return parse(res);
}

export async function listCourseDraftSessions(tutorId: string): Promise<AIResponse> {
  const res = await fetch(`${baseUrl()}/mine/list?tutorId=${encodeURIComponent(tutorId)}`, {
    headers: headers(),
  });
  return parse(res);
}

export async function finalizeCourseDraft(sessionId: string, tutorId: string): Promise<AIResponse> {
  const res = await fetch(`${baseUrl()}/${sessionId}/finalize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ tutorId }),
  });
  return parse(res);
}

export async function abandonCourseDraft(sessionId: string, tutorId: string): Promise<AIResponse> {
  const res = await fetch(`${baseUrl()}/${sessionId}/abandon`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ tutorId }),
  });
  return parse(res);
}

export async function speakCourseDraftText(text: string, voice?: string): Promise<{ ok: boolean; buffer?: Buffer; error?: string }> {
  const res = await fetch(`${baseUrl()}/voice/speak`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.message || "TTS failed" };
  }
  const arrayBuffer = await res.arrayBuffer();
  return { ok: true, buffer: Buffer.from(arrayBuffer) };
}

export async function sendCourseDraftDocument(
  sessionId: string,
  tutorId: string,
  tutorName: string,
  file: Express.Multer.File,
): Promise<AIResponse> {
  const form = new FormData();
  form.append("tutorId", tutorId);
  form.append("tutorName", tutorName);
  form.append("document", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname || "document");

  const res = await fetch(`${baseUrl()}/${sessionId}/document`, {
    method: "POST",
    headers: { "X-Service-Key": process.env.SHEKIAI_SERVICE_KEY || "" },
    body: form,
  });
  return parse(res);
}
