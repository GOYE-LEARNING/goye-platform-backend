import { Body, Controller, Get, Path, Post, Query, Request, Route, Security, Tags } from "tsoa";
import {
  ModerationError,
  getHistory,
  humanDecide,
  isModeratorRole,
  listQueue,
  rerunRecord,
  type ContentType,
  type Moderator,
} from "../moderation/moderationGate";
import { POLICY_VERSION } from "../moderation/policy";
import { moderationMetrics, moderationConfigured } from "../moderation/moderationService";

function moderatorFrom(req: any): Moderator {
  return {
    id: req.user?.id ?? req.org?.id,
    role: req.user?.role,
    orgId: req.org?.id,
    orgRole: req.org?.organization_role,
  };
}

/**
 * Human review of held content. Every endpoint re-checks the caller's role on
 * the server; nothing here trusts the client to say what it may do.
 */
@Route("moderation")
@Tags("Moderation")
export class ModerationController extends Controller {
  private fail(error: any) {
    if (error instanceof ModerationError) {
      this.setStatus(error.statusCode);
      return { success: false, message: error.message };
    }
    console.error("[Moderation] unexpected error:", error?.message ?? error);
    this.setStatus(500);
    return { success: false, message: "Something went wrong." };
  }

  /** Items waiting for a person (default), or filter by status. */
  @Security("bearerAuth")
  @Get("/queue")
  public async GetQueue(
    @Request() req: any,
    @Query() status?: string,
    @Query() page?: number,
    @Query() limit?: number,
  ): Promise<any> {
    try {
      const { items, total } = await listQueue(moderatorFrom(req), { status, page, limit });
      this.setStatus(200);
      return { success: true, data: items, pagination: { total, page: page || 1, limit: limit || 20 } };
    } catch (e) {
      return this.fail(e);
    }
  }

  /** Every moderation event for one piece of content, AI and human kept separate. */
  @Security("bearerAuth")
  @Get("/history/{contentType}/{contentId}")
  public async GetContentHistory(
    @Request() req: any,
    @Path() contentType: "POST" | "REPLY" | "DISCUSSION",
    @Path() contentId: string,
  ): Promise<any> {
    try {
      const data = await getHistory(moderatorFrom(req), contentType as ContentType, contentId);
      this.setStatus(200);
      return { success: true, data };
    } catch (e) {
      return this.fail(e);
    }
  }

  /** Approve or reject held content. The AI's own recommendation is never overwritten. */
  @Security("bearerAuth")
  @Post("/decide/{recordId}")
  public async Decide(
    @Request() req: any,
    @Path() recordId: string,
    @Body() body: { decision: "approve" | "reject"; reason?: string },
  ): Promise<any> {
    try {
      const moderator = moderatorFrom(req);
      if (!isModeratorRole(moderator)) throw new ModerationError(403, "Moderator access required");
      if (body.decision !== "approve" && body.decision !== "reject") {
        throw new ModerationError(400, "decision must be 'approve' or 'reject'");
      }
      const result = await humanDecide({ recordId, moderator, decision: body.decision, reason: body.reason });
      this.setStatus(200);
      return { success: true, message: "Decision recorded", data: result };
    } catch (e) {
      return this.fail(e);
    }
  }

  /** Ask the AI to look again, for example after a provider outage left an item pending. */
  @Security("bearerAuth")
  @Post("/rerun/{recordId}")
  public async Rerun(@Request() req: any, @Path() recordId: string): Promise<any> {
    try {
      const moderator = moderatorFrom(req);
      if (!isModeratorRole(moderator)) throw new ModerationError(403, "Moderator access required");
      const result = await rerunRecord(recordId, moderator);
      this.setStatus(200);
      return { success: true, message: result.message, data: { status: result.status } };
    } catch (e) {
      return this.fail(e);
    }
  }

  /** Counters since the server started. Platform admins only. */
  @Security("bearerAuth")
  @Get("/metrics")
  public async GetMetrics(@Request() req: any): Promise<any> {
    if (req.user?.role !== "goye_admin") {
      this.setStatus(403);
      return { success: false, message: "Platform admin access required" };
    }
    const { evaluations, totalLatencyMs } = moderationMetrics;
    this.setStatus(200);
    return {
      success: true,
      data: {
        policyVersion: POLICY_VERSION,
        configured: moderationConfigured(),
        ...moderationMetrics,
        averageLatencyMs: evaluations ? Math.round(totalLatencyMs / evaluations) : null,
      },
    };
  }
}
