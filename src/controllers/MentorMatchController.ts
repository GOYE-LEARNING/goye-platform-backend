// controllers/MentorMatchController.ts
//
// GOYE-side proxy for ShekiAI's mentor-matching AI assistant. Mirrors
// CourseDraftController's shape, with one extra responsibility: when
// ShekiAI's AI proposes a match (result.matchedTutor is present), this is
// the layer that actually notifies the tutor and opens the real chat —
// ShekiAI only ever touches the shared draft/session tables, never GOYE's
// Notification or PrivateMessage tables directly.
import { randomUUID } from "crypto";
import { Body, Controller, Get, Path, Post, Query, Request, Route, Security, Tags, UploadedFile } from "tsoa";
import prisma from "../db";
import {
  abandonMentorMatch,
  getMentorMatchSession,
  listMentorMatchSessions,
  sendMentorMatchMessage,
  startMentorMatch,
  sendMentorMatchDocument,
} from "../utils/ai_utils/mentor_match_client";
import { NotificationService, Role, NotificationType } from "../services/notificationServices";
import { EncryptionUtil } from "../utils/encryption";

async function studentNameFor(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { first_name: true, last_name: true } });
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  return name || "A student";
}

// Notifies the matched tutor and sends the first private message from the
// student, so the tutor opens their chat list and already has a real
// conversation to respond to — this is the "room" the student was told
// would open. Best-effort: if this fails, the match itself still stands;
// the tutor can still be reached the normal way, so we don't fail the
// whole request over it.
async function openMentorConnection(studentId: string, studentName: string, matchedTutor: { id: string; name: string; reason: string }) {
  try {
    await NotificationService.createNotification({
      title: "New mentorship request",
      message: `${studentName} is looking for a mentor and thinks you'd be a great fit: "${matchedTutor.reason}"`,
      type: NotificationType.MENTOR_REQUEST,
      role: Role.STUDENT,
      to: Role.TUTOR,
      userId: matchedTutor.id,
    });

    const intro = `Hi ${matchedTutor.name}! I'm ${studentName} — ${matchedTutor.reason} I'd love your help if you're open to it!`;
    await prisma.privateMessage.create({
      data: {
        id: randomUUID(),
        content: EncryptionUtil.encrypt(intro),
        senderId: studentId,
        receiverId: matchedTutor.id,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to open mentor connection (match itself still stands):", error);
  }
}

// None of these calls had error handling before — any hiccup reaching
// ShekiAI (including a Render free-tier cold start) surfaced as an opaque
// Express 500 with the real cause visible nowhere, not even in GOYE's own
// logs. Every route now logs the real error server-side and returns a
// message the frontend can actually show someone.
function proxyFailure(this: Controller, route: string, error: any) {
  console.error(`[MentorMatch/${route}] proxy call to ShekiAI failed:`, error);
  this.setStatus(502);
  return {
    message: "We couldn't reach the assistant just now — please try again in a moment.",
    data: [],
    status: 502,
    error: [error?.message || String(error)],
  };
}

@Security("bearerAuth")
@Tags("Mentor Match AI")
@Route("mentor-match")
export class MentorMatchController extends Controller {
  @Post("start")
  public async Start(@Request() req: any, @Body() body: { message?: string }): Promise<any> {
    try {
      const name = await studentNameFor(req.user.id);
      const result = await startMentorMatch(req.user.id, name, body?.message);
      const matchedTutor = result.data[0]?.matchedTutor;
      if (matchedTutor) await openMentorConnection(req.user.id, name, matchedTutor);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "start", error);
    }
  }

  @Post("{sessionId}/message")
  public async Message(@Path() sessionId: string, @Request() req: any, @Body() body: { message: string }): Promise<any> {
    try {
      const name = await studentNameFor(req.user.id);
      const result = await sendMentorMatchMessage(sessionId, req.user.id, name, body.message);
      const matchedTutor = result.data[0]?.matchedTutor;
      if (matchedTutor) await openMentorConnection(req.user.id, name, matchedTutor);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "message", error);
    }
  }

  @Get("{sessionId}")
  public async GetSession(@Path() sessionId: string, @Request() req: any): Promise<any> {
    try {
      const result = await getMentorMatchSession(sessionId, req.user.id);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "getSession", error);
    }
  }

  @Get("mine/list")
  public async ListMine(@Request() req: any): Promise<any> {
    try {
      const result = await listMentorMatchSessions(req.user.id);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "listMine", error);
    }
  }

  @Post("{sessionId}/abandon")
  public async Abandon(@Path() sessionId: string, @Request() req: any): Promise<any> {
    try {
      const result = await abandonMentorMatch(sessionId, req.user.id);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "abandon", error);
    }
  }

  @Post("{sessionId}/document")
  public async Document(
    @Path() sessionId: string,
    @Request() req: any,
    @UploadedFile() document: Express.Multer.File,
  ): Promise<any> {
    try {
      const result = await sendMentorMatchDocument(sessionId, req.user.id, await studentNameFor(req.user.id), document);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "document", error);
    }
  }
}
