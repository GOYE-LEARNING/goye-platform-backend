// controllers/CourseDraftController.ts
//
// GOYE-side proxy for ShekiAI's course-drafting AI assistant. Every route
// here verifies the tutor itself (bearerAuth) and then calls ShekiAI
// server-to-server — the browser never holds ShekiAI's service key.
import { Body, Controller, Get, Path, Post, Query, Request, Route, Security, Tags, UploadedFile } from "tsoa";
import prisma from "../db";
import {
  abandonCourseDraft,
  finalizeCourseDraft,
  getCourseDraftSession,
  listCourseDraftSessions,
  sendCourseDraftMessage,
  startCourseDraft,
  sendCourseDraftDocument,
} from "../utils/ai_utils/course_draft_client";

// tsoa's generated auth wiring (routes.ts: `request['user'] = await ...`)
// overwrites req.user with the raw JWT payload, not the full DB row —
// the payload only carries first_name/last_name if a full_name string was
// baked in at sign time, so look the tutor up directly rather than trust it.
async function tutorNameFor(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { first_name: true, last_name: true } });
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  return name || "Tutor";
}

// None of these calls had error handling before — any hiccup reaching
// ShekiAI (including a Render free-tier cold start, confirmed live: caught
// ShekiAI mid-boot at 12s uptime right after a request failed) surfaced as
// an opaque Express 500 with the real cause visible nowhere, not even in
// GOYE's own logs. Every route now logs the real error server-side and
// returns a message the frontend can actually show someone.
function proxyFailure(this: Controller, route: string, error: any) {
  console.error(`[CourseDraft/${route}] proxy call to ShekiAI failed:`, error);
  this.setStatus(502);
  return {
    message: "We couldn't reach the assistant just now — please try again in a moment.",
    data: [],
    status: 502,
    error: [error?.message || String(error)],
  };
}

@Security("bearerAuth")
@Tags("Course Draft AI")
@Route("course-draft")
export class CourseDraftController extends Controller {
  @Post("start")
  public async Start(@Request() req: any, @Body() body: { message?: string }): Promise<any> {
    try {
      const result = await startCourseDraft(req.user.id, await tutorNameFor(req.user.id), body?.message);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "start", error);
    }
  }

  @Post("{sessionId}/message")
  public async Message(@Path() sessionId: string, @Request() req: any, @Body() body: { message: string }): Promise<any> {
    try {
      const result = await sendCourseDraftMessage(sessionId, req.user.id, await tutorNameFor(req.user.id), body.message);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "message", error);
    }
  }

  @Get("{sessionId}")
  public async GetSession(@Path() sessionId: string, @Request() req: any): Promise<any> {
    try {
      const result = await getCourseDraftSession(sessionId, req.user.id);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "getSession", error);
    }
  }

  @Get("mine/list")
  public async ListMine(@Request() req: any): Promise<any> {
    try {
      const result = await listCourseDraftSessions(req.user.id);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "listMine", error);
    }
  }

  @Post("{sessionId}/finalize")
  public async Finalize(@Path() sessionId: string, @Request() req: any): Promise<any> {
    try {
      const result = await finalizeCourseDraft(sessionId, req.user.id);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "finalize", error);
    }
  }

  @Post("{sessionId}/abandon")
  public async Abandon(@Path() sessionId: string, @Request() req: any): Promise<any> {
    try {
      const result = await abandonCourseDraft(sessionId, req.user.id);
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
      const result = await sendCourseDraftDocument(sessionId, req.user.id, await tutorNameFor(req.user.id), document);
      this.setStatus(result.status);
      return result;
    } catch (error: any) {
      return proxyFailure.call(this, "document", error);
    }
  }
}
