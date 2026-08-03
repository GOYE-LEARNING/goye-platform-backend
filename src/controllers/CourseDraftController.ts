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
  sendCourseDraftVoiceMessage,
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

@Security("bearerAuth")
@Tags("Course Draft AI")
@Route("course-draft")
export class CourseDraftController extends Controller {
  @Post("start")
  public async Start(@Request() req: any, @Body() body: { message?: string }): Promise<any> {
    const result = await startCourseDraft(req.user.id, await tutorNameFor(req.user.id), body?.message);
    this.setStatus(result.status);
    return result;
  }

  @Post("{sessionId}/message")
  public async Message(@Path() sessionId: string, @Request() req: any, @Body() body: { message: string }): Promise<any> {
    const result = await sendCourseDraftMessage(sessionId, req.user.id, await tutorNameFor(req.user.id), body.message);
    this.setStatus(result.status);
    return result;
  }

  @Post("{sessionId}/voice-message")
  public async VoiceMessage(
    @Path() sessionId: string,
    @Request() req: any,
    @UploadedFile() audio: Express.Multer.File,
  ): Promise<any> {
    const result = await sendCourseDraftVoiceMessage(sessionId, req.user.id, await tutorNameFor(req.user.id), audio);
    this.setStatus(result.status);
    return result;
  }

  @Get("{sessionId}")
  public async GetSession(@Path() sessionId: string, @Request() req: any): Promise<any> {
    const result = await getCourseDraftSession(sessionId, req.user.id);
    this.setStatus(result.status);
    return result;
  }

  @Get("mine/list")
  public async ListMine(@Request() req: any): Promise<any> {
    const result = await listCourseDraftSessions(req.user.id);
    this.setStatus(result.status);
    return result;
  }

  @Post("{sessionId}/finalize")
  public async Finalize(@Path() sessionId: string, @Request() req: any): Promise<any> {
    const result = await finalizeCourseDraft(sessionId, req.user.id);
    this.setStatus(result.status);
    return result;
  }

  @Post("{sessionId}/abandon")
  public async Abandon(@Path() sessionId: string, @Request() req: any): Promise<any> {
    const result = await abandonCourseDraft(sessionId, req.user.id);
    this.setStatus(result.status);
    return result;
  }

  @Post("{sessionId}/document")
  public async Document(
    @Path() sessionId: string,
    @Request() req: any,
    @UploadedFile() document: Express.Multer.File,
  ): Promise<any> {
    const result = await sendCourseDraftDocument(sessionId, req.user.id, await tutorNameFor(req.user.id), document);
    this.setStatus(result.status);
    return result;
  }

}
