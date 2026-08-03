// utils/ai_utils/mentor_match_client.ts
//
// Server-to-server client for ShekiAI's mentor-matching AI assistant.
// Mirrors course_draft_client.ts's pattern exactly.
import dotenv from "dotenv";
dotenv.config();

interface AIResponse {
  message: string;
  data: any[];
  status: number;
  error: string[];
}

function baseUrl() {
  return `${process.env.SHEKI_AI_URL}/ai_v1/mentor-match`;
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

export async function startMentorMatch(studentId: string, studentName: string, message?: string): Promise<AIResponse> {
  const res = await fetch(`${baseUrl()}/start`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ studentId, studentName, message }),
  });
  return parse(res);
}

export async function sendMentorMatchMessage(sessionId: string, studentId: string, studentName: string, message: string): Promise<AIResponse> {
  const res = await fetch(`${baseUrl()}/${sessionId}/message`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ studentId, studentName, message }),
  });
  return parse(res);
}

export async function sendMentorMatchVoiceMessage(
  sessionId: string,
  studentId: string,
  studentName: string,
  file: Express.Multer.File,
): Promise<AIResponse> {
  const form = new FormData();
  form.append("studentId", studentId);
  form.append("studentName", studentName);
  form.append("audio", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname || "audio.webm");

  const res = await fetch(`${baseUrl()}/${sessionId}/voice-message`, {
    method: "POST",
    headers: { "X-Service-Key": process.env.SHEKIAI_SERVICE_KEY || "" },
    body: form,
  });
  const data = await res.json();
  return { message: data.message ?? (res.ok ? "Success" : "Request failed"), data: data.data ?? [], status: res.status, error: data.error ?? [] };
}

export async function getMentorMatchSession(sessionId: string, studentId: string): Promise<AIResponse> {
  const res = await fetch(`${baseUrl()}/${sessionId}?studentId=${encodeURIComponent(studentId)}`, { headers: headers() });
  return parse(res);
}

export async function listMentorMatchSessions(studentId: string): Promise<AIResponse> {
  const res = await fetch(`${baseUrl()}/mine/list?studentId=${encodeURIComponent(studentId)}`, { headers: headers() });
  return parse(res);
}

export async function abandonMentorMatch(sessionId: string, studentId: string): Promise<AIResponse> {
  const res = await fetch(`${baseUrl()}/${sessionId}/abandon`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ studentId }),
  });
  return parse(res);
}

export async function sendMentorMatchDocument(
  sessionId: string,
  studentId: string,
  studentName: string,
  file: Express.Multer.File,
): Promise<AIResponse> {
  const form = new FormData();
  form.append("studentId", studentId);
  form.append("studentName", studentName);
  form.append("document", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname || "document");

  const res = await fetch(`${baseUrl()}/${sessionId}/document`, {
    method: "POST",
    headers: { "X-Service-Key": process.env.SHEKIAI_SERVICE_KEY || "" },
    body: form,
  });
  return parse(res);
}
