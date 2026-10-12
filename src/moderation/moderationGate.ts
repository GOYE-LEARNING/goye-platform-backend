import prisma from "../db";
import { EncryptionUtil } from "../utils/encryption";
import { invalidatePattern } from "../utils/redis";
import { NotificationService, Role } from "../services/notificationServices";
import { ActionType, GamificationService } from "../services/gamificationService";
import { POLICY_VERSION } from "./policy";
import {
  decideStatus,
  evaluateContent,
  hashContent,
  type AiVerdict,
  type ModerationStatusValue,
} from "./moderationService";

export type ContentType = "POST" | "REPLY" | "DISCUSSION";

const OPEN_STATUSES: ModerationStatusValue[] = ["PENDING_REVIEW", "HUMAN_REVIEW"];

export interface GateResult {
  status: ModerationStatusValue;
  recordId: string;
  message: string;
  /** Present only when the content went live during this call. */
  sideEffects?: { gamification?: any };
}

export interface Moderator {
  id: string;
  role?: string;
  orgId?: string;
  orgRole?: string;
}

export class ModerationError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

// ── User-facing wording: neutral, never asserts a violation was proven ──────

function messageFor(status: ModerationStatusValue, isEdit: boolean): string {
  switch (status) {
    case "PUBLISHED":
      return isEdit ? "Your changes are live." : "Posted successfully.";
    case "REJECTED":
      return isEdit
        ? "These changes can't be published because they don't meet GOYE's community guidelines. Your previous version is unchanged."
        : "This can't be published because it doesn't meet GOYE's community guidelines. You can edit it and try again.";
    default:
      return isEdit
        ? "Your changes were received and will appear after review. Your previous version stays visible until then."
        : "Your post was received and will appear once it has been reviewed.";
  }
}

// ── Cache ───────────────────────────────────────────────────────────────────

async function invalidateContentCaches(): Promise<void> {
  try {
    await Promise.all([invalidatePattern("social:*"), invalidatePattern("discussions:public:*")]);
  } catch (err: any) {
    console.error("[Moderation] cache invalidation failed:", err?.message ?? err);
  }
}

// ── Per-type entity access ──────────────────────────────────────────────────

interface Live {
  moderationStatus: ModerationStatusValue;
  authorId: string | null;
  organizationId: string | null;
  title?: string;
  plaintext: string;
}

async function resolveOrganizationId(authorId: string | null, direct?: string | null): Promise<string | null> {
  if (direct) return direct;
  if (!authorId) return null;
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: authorId, isActive: true },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

async function loadLive(type: ContentType, id: string): Promise<Live | null> {
  if (type === "POST") {
    const p = await prisma.post.findUnique({ where: { id } });
    if (!p) return null;
    return {
      moderationStatus: p.moderationStatus as ModerationStatusValue,
      authorId: p.userId ?? null,
      organizationId: p.organizationId ?? null,
      title: p.title,
      plaintext: p.content,
    };
  }
  if (type === "REPLY") {
    const r = await prisma.reply.findUnique({ where: { id }, include: { post: { select: { organizationId: true } } } });
    if (!r) return null;
    return {
      moderationStatus: r.moderationStatus as ModerationStatusValue,
      authorId: r.userId,
      organizationId: r.post?.organizationId ?? null,
      plaintext: r.content,
    };
  }
  const d = await prisma.discussion.findUnique({ where: { id } });
  if (!d) return null;
  return {
    moderationStatus: d.moderationStatus as ModerationStatusValue,
    authorId: d.authorId,
    organizationId: null,
    plaintext: safeDecrypt(d.content),
  };
}

function safeDecrypt(text: string): string {
  try {
    return EncryptionUtil.decrypt(text);
  } catch {
    return "";
  }
}

/** Stored form of text for a content type (discussions are encrypted at rest). */
export function toStored(type: ContentType, plaintext: string): string {
  return type === "DISCUSSION" ? EncryptionUtil.encrypt(plaintext) : plaintext;
}

function fromStored(type: ContentType, stored: string): string {
  return type === "DISCUSSION" ? safeDecrypt(stored) : stored;
}

/** Moves a live row between statuses only from an allowed prior state. Returns rows changed. */
async function transitionEntity(
  type: ContentType,
  id: string,
  to: ModerationStatusValue,
  from: ModerationStatusValue[],
): Promise<number> {
  const where: any = { id, moderationStatus: { in: from } };
  const data: any = { moderationStatus: to };
  if (type === "POST") return (await prisma.post.updateMany({ where, data })).count;
  if (type === "REPLY") return (await prisma.reply.updateMany({ where, data })).count;
  return (await prisma.discussion.updateMany({ where, data })).count;
}

async function applyEditToEntity(
  type: ContentType,
  id: string,
  stored: { title?: string | null; content: string },
): Promise<void> {
  if (type === "POST") {
    await prisma.post.update({
      where: { id },
      data: { content: stored.content, ...(stored.title ? { title: stored.title } : {}) },
    });
  } else if (type === "REPLY") {
    await prisma.reply.update({ where: { id }, data: { content: stored.content } });
  } else {
    await prisma.discussion.update({ where: { id }, data: { content: stored.content } });
  }
}

// ── Side effects that must only happen once content is actually public ─────

export async function runPublishSideEffects(type: ContentType, id: string): Promise<{ gamification?: any }> {
  try {
    if (type === "POST") {
      const p = await prisma.post.findUnique({ where: { id }, select: { userId: true, courseId: true } });
      if (p?.userId) {
        const g = await GamificationService.AddPointsWithGamification(p.userId, ActionType.DISCUSSION_PARTICIPATION, {
          courseId: p.courseId,
        });
        return { gamification: g };
      }
      return {};
    }

    if (type === "REPLY") {
      const r = await prisma.reply.findUnique({
        where: { id },
        include: {
          user: { select: { first_name: true } },
          post: { select: { courseId: true } },
          parent: { select: { userId: true } },
        },
      });
      if (!r) return {};
      const g = await GamificationService.AddPointsWithGamification(r.userId, ActionType.DISCUSSION_PARTICIPATION, {
        courseId: r.post?.courseId,
      });
      if (r.parent && r.parent.userId !== r.userId) {
        await NotificationService.createNotification({
          message: `${r.user?.first_name || "Someone"} replied to your comment`,
          title: "New Reply",
          type: "reply",
          role: Role.STUDENT,
          to: Role.STUDENT,
          userId: r.parent.userId,
          postId: r.postId ?? undefined,
          replyId: r.id,
        });
      }
      return { gamification: g };
    }

    const d = await prisma.discussion.findUnique({
      where: { id },
      include: {
        author: { select: { first_name: true, last_name: true } },
        parent: { select: { authorId: true, parentId: true, author: { select: { role: true } } } },
      },
    });
    if (!d) return {};
    const g = await GamificationService.AddPointsWithGamification(d.authorId, ActionType.DISCUSSION_PARTICIPATION);
    if (d.parent && d.parent.authorId !== d.authorId) {
      const asInstructor = d.parent.author.role === "instructor";
      const name = `${d.author.first_name} ${d.author.last_name}`;
      await NotificationService.createNotification({
        message: d.parent.parentId
          ? `${name} replied to your comment: "${safeDecrypt(d.content).substring(0, 50)}..."`
          : `${name} replied to your discussion`,
        title: "New Reply",
        type: "discussion",
        role: asInstructor ? Role.INSTRUCTOR : Role.STUDENT,
        to: asInstructor ? Role.INSTRUCTOR : Role.STUDENT,
        userId: d.parent.authorId,
      });
    }
    return { gamification: g };
  } catch (err: any) {
    // The content is already public; a failed XP/notification must not undo that.
    console.error(`[Moderation] publish side effects failed for ${type} ${id}:`, err?.message ?? err);
    return {};
  }
}

// ── Core evaluation → record ────────────────────────────────────────────────

interface Evaluated {
  status: ModerationStatusValue;
  escalated: boolean;
  fields: Record<string, any>;
}

/**
 * The model only reads text. A submission with attached media (or nothing but
 * media) cannot be fully vetted by it, so it is never auto-published: a person
 * must look at the media. Set MODERATION_MEDIA_REQUIRES_REVIEW=false to opt out.
 */
function mediaRequiresReview(): boolean {
  return process.env.MODERATION_MEDIA_REQUIRES_REVIEW !== "false";
}

async function evaluate(args: {
  type: ContentType;
  title?: string;
  plaintext: string;
  hash: string;
  contentId: string;
  isEdit: boolean;
  hasMedia?: boolean;
}): Promise<Evaluated> {
  if (!args.plaintext.trim()) {
    return {
      status: "HUMAN_REVIEW",
      escalated: false,
      fields: {
        reason: "Media-only submission: there is no text for the AI to evaluate.",
        requiresHumanReview: true,
        policyVersion: POLICY_VERSION,
        providerError: null,
      },
    };
  }

  const ev = await evaluateCore(args);
  if (args.hasMedia && mediaRequiresReview() && ev.status === "PUBLISHED") {
    return {
      status: "HUMAN_REVIEW",
      escalated: ev.escalated,
      fields: {
        ...ev.fields,
        requiresHumanReview: true,
        reason: `${ev.fields.reason ?? ""} Includes attached media, which needs a person to review.`.trim(),
      },
    };
  }
  return ev;
}

async function evaluateCore(args: {
  type: ContentType;
  title?: string;
  plaintext: string;
  hash: string;
  contentId: string;
  isEdit: boolean;
}): Promise<Evaluated> {
  // Retry/duplicate safety: the same text for the same content, already
  // evaluated, is not sent to the provider again.
  const prior = await prisma.moderationRecord.findFirst({
    where: { contentId: args.contentId, contentType: args.type, contentHash: args.hash, aiDecision: { not: null }, isEdit: args.isEdit },
    orderBy: { createdAt: "desc" },
  });
  if (prior) {
    const verdict: AiVerdict = {
      decision: prior.aiDecision as any,
      riskLevel: prior.riskLevel as any,
      categories: prior.categories as any,
      confidence: prior.confidence ?? 0,
      reason: prior.reason ?? "",
      requiresHumanReview: prior.requiresHumanReview,
    };
    const d = decideStatus(verdict);
    return { status: d.status, escalated: d.escalated, fields: reuseFields(prior) };
  }

  const result = await evaluateContent({ title: args.title, content: args.plaintext });
  if (!result.ok) {
    console.warn(`[Moderation] ${args.type} ${args.contentId} left unpublished: ${result.error} (${result.latencyMs}ms)`);
    return {
      status: "PENDING_REVIEW",
      escalated: false,
      fields: { providerError: result.error, policyVersion: POLICY_VERSION },
    };
  }

  const d = decideStatus(result.verdict, result.truncated);
  console.log(
    `[Moderation] ${args.type} ${args.contentId} -> ${d.status} (ai=${result.verdict.decision}/${result.verdict.riskLevel}, ${result.latencyMs}ms)`,
  );
  return {
    status: d.status,
    escalated: d.escalated,
    fields: {
      aiDecision: result.verdict.decision,
      riskLevel: result.verdict.riskLevel,
      categories: result.verdict.categories,
      confidence: result.verdict.confidence,
      reason: result.verdict.reason,
      requiresHumanReview: result.verdict.requiresHumanReview || result.truncated,
      model: result.model,
      policyVersion: POLICY_VERSION,
      providerError: null,
    },
  };
}

function reuseFields(prior: any): Record<string, any> {
  return {
    aiDecision: prior.aiDecision,
    riskLevel: prior.riskLevel,
    categories: prior.categories,
    confidence: prior.confidence,
    reason: prior.reason,
    requiresHumanReview: prior.requiresHumanReview,
    model: prior.model,
    policyVersion: prior.policyVersion,
    providerError: null,
  };
}

async function supersedeOpenRecords(type: ContentType, contentId: string): Promise<void> {
  await prisma.moderationRecord.updateMany({
    where: { contentType: type, contentId, status: { in: OPEN_STATUSES as any } },
    data: {
      status: "REJECTED",
      humanDecision: "superseded",
      humanReason: "Replaced by a newer submission",
      reviewedAt: new Date(),
      pendingContent: null,
      pendingTitle: null,
    },
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Moderates NEW content (or a rewrite of content that is not currently live).
 * The row must already exist with moderationStatus PENDING_REVIEW.
 */
export async function submitNew(args: {
  type: ContentType;
  contentId: string;
  authorId: string | null;
  organizationId?: string | null;
  title?: string;
  plaintext: string;
  hasMedia?: boolean;
}): Promise<GateResult> {
  await supersedeOpenRecords(args.type, args.contentId);
  const hash = hashContent(args.type, args.title, args.plaintext);
  const orgId = await resolveOrganizationId(args.authorId, args.organizationId);

  const record = await prisma.moderationRecord.create({
    data: {
      contentType: args.type,
      contentId: args.contentId,
      authorId: args.authorId,
      organizationId: orgId,
      isEdit: false,
      contentHash: hash,
      policyVersion: POLICY_VERSION,
      status: "PENDING_REVIEW",
    },
  });

  const ev = await evaluate({ type: args.type, title: args.title, plaintext: args.plaintext, hash, contentId: args.contentId, isEdit: false, hasMedia: args.hasMedia });

  await prisma.moderationRecord.update({
    where: { id: record.id },
    data: { ...ev.fields, status: ev.status, escalated: ev.escalated },
  });

  let sideEffects: GateResult["sideEffects"];
  if (ev.status !== "PENDING_REVIEW") {
    const moved = await transitionEntity(args.type, args.contentId, ev.status, ["PENDING_REVIEW"]);
    if (moved > 0 && ev.status === "PUBLISHED") {
      sideEffects = await runPublishSideEffects(args.type, args.contentId);
      await invalidateContentCaches();
    }
  }

  return { status: ev.status, recordId: record.id, message: messageFor(ev.status, false), sideEffects };
}

/**
 * Moderates an EDIT of content that is currently PUBLISHED. The live row keeps
 * the last approved text until the edit is approved.
 */
export async function submitEdit(args: {
  type: ContentType;
  contentId: string;
  authorId: string | null;
  title?: string;
  plaintext: string;
  hasMedia?: boolean;
}): Promise<GateResult> {
  const live = await loadLive(args.type, args.contentId);
  if (!live) throw new ModerationError(404, "Content not found");

  await supersedeOpenRecords(args.type, args.contentId);
  const hash = hashContent(args.type, args.title, args.plaintext);
  const stored = toStored(args.type, args.plaintext);

  const record = await prisma.moderationRecord.create({
    data: {
      contentType: args.type,
      contentId: args.contentId,
      authorId: args.authorId,
      organizationId: await resolveOrganizationId(args.authorId, live.organizationId),
      isEdit: true,
      contentHash: hash,
      pendingTitle: args.title ?? null,
      pendingContent: stored,
      policyVersion: POLICY_VERSION,
      status: "PENDING_REVIEW",
    },
  });

  const ev = await evaluate({ type: args.type, title: args.title, plaintext: args.plaintext, hash, contentId: args.contentId, isEdit: true, hasMedia: args.hasMedia });

  const decided = ev.status !== "PENDING_REVIEW" && ev.status !== "HUMAN_REVIEW";
  await prisma.moderationRecord.update({
    where: { id: record.id },
    data: {
      ...ev.fields,
      status: ev.status,
      escalated: ev.escalated,
      ...(decided ? { pendingContent: null, pendingTitle: null } : {}),
    },
  });

  if (ev.status === "PUBLISHED") {
    await applyEditToEntity(args.type, args.contentId, { title: args.title, content: stored });
    await invalidateContentCaches();
  }

  return { status: ev.status, recordId: record.id, message: messageFor(ev.status, true) };
}

// ── Human review ────────────────────────────────────────────────────────────

export function canModerate(m: Moderator, record: { organizationId: string | null }): boolean {
  if (m.role === "goye_admin") return true;
  const orgAdmin =
    m.role === "org_admin" || ["admin", "owner", "Administrator"].includes(m.orgRole ?? "");
  return !!m.orgId && orgAdmin && record.organizationId === m.orgId;
}

export function isModeratorRole(m: Moderator): boolean {
  return (
    m.role === "goye_admin" ||
    (!!m.orgId && (m.role === "org_admin" || ["admin", "owner", "Administrator"].includes(m.orgRole ?? "")))
  );
}

export async function humanDecide(args: {
  recordId: string;
  moderator: Moderator;
  decision: "approve" | "reject";
  reason?: string;
}): Promise<{ status: ModerationStatusValue }> {
  const record = await prisma.moderationRecord.findUnique({ where: { id: args.recordId } });
  if (!record || !canModerate(args.moderator, record)) {
    // Same answer for "missing" and "not yours" so ids can't be probed.
    throw new ModerationError(404, "Moderation record not found");
  }

  const newStatus: ModerationStatusValue = args.decision === "approve" ? "PUBLISHED" : "REJECTED";

  // Atomic claim: only one concurrent decision can move a record out of an open state.
  const claimed = await prisma.moderationRecord.updateMany({
    where: { id: record.id, status: { in: OPEN_STATUSES as any } },
    data: {
      status: newStatus,
      humanDecision: args.decision,
      humanReason: args.reason?.trim().slice(0, 500) || null,
      reviewedById: args.moderator.id,
      reviewedAt: new Date(),
      pendingContent: null,
      pendingTitle: null,
    },
  });
  if (claimed.count === 0) throw new ModerationError(409, "This item has already been decided");

  const type = record.contentType as ContentType;
  if (record.isEdit) {
    if (args.decision === "approve" && record.pendingContent != null) {
      await applyEditToEntity(type, record.contentId, { title: record.pendingTitle, content: record.pendingContent });
    }
  } else {
    const moved = await transitionEntity(type, record.contentId, newStatus, ["PENDING_REVIEW", "HUMAN_REVIEW"]);
    if (moved > 0 && newStatus === "PUBLISHED") await runPublishSideEffects(type, record.contentId);
  }
  await invalidateContentCaches();
  return { status: newStatus };
}

/** Re-runs the AI for a record the provider failed on (or that a moderator wants re-checked). */
export async function rerunRecord(recordId: string, moderator: Moderator): Promise<GateResult> {
  const record = await prisma.moderationRecord.findUnique({ where: { id: recordId } });
  if (!record || !canModerate(moderator, record)) throw new ModerationError(404, "Moderation record not found");
  if (!OPEN_STATUSES.includes(record.status as ModerationStatusValue)) {
    throw new ModerationError(409, "This item has already been decided");
  }

  const type = record.contentType as ContentType;
  const plaintext = record.isEdit
    ? fromStored(type, record.pendingContent ?? "")
    : (await loadLive(type, record.contentId))?.plaintext;
  if (!plaintext) throw new ModerationError(404, "Content no longer exists");

  const title = record.isEdit ? (record.pendingTitle ?? undefined) : (await loadLive(type, record.contentId))?.title;
  const hash = hashContent(type, title, plaintext);

  // A rerun must ask the provider again, so it deliberately skips the reuse shortcut.
  const result = await evaluateContent({ title, content: plaintext });
  if (!result.ok) {
    await prisma.moderationRecord.update({ where: { id: record.id }, data: { providerError: result.error } });
    return { status: record.status as ModerationStatusValue, recordId: record.id, message: "The AI check is unavailable right now." };
  }

  const d = decideStatus(result.verdict, result.truncated);
  const decided = d.status === "PUBLISHED" || d.status === "REJECTED";
  await prisma.moderationRecord.update({
    where: { id: record.id },
    data: {
      aiDecision: result.verdict.decision,
      riskLevel: result.verdict.riskLevel,
      categories: result.verdict.categories,
      confidence: result.verdict.confidence,
      reason: result.verdict.reason,
      requiresHumanReview: result.verdict.requiresHumanReview || result.truncated,
      model: result.model,
      policyVersion: POLICY_VERSION,
      providerError: null,
      contentHash: hash,
      escalated: d.escalated,
      status: d.status,
      ...(record.isEdit && decided ? { pendingContent: null, pendingTitle: null } : {}),
    },
  });

  if (record.isEdit) {
    if (d.status === "PUBLISHED" && record.pendingContent != null) {
      await applyEditToEntity(type, record.contentId, { title: record.pendingTitle, content: record.pendingContent });
    }
  } else if (d.status !== "PENDING_REVIEW") {
    const moved = await transitionEntity(type, record.contentId, d.status, ["PENDING_REVIEW", "HUMAN_REVIEW"]);
    if (moved > 0 && d.status === "PUBLISHED") await runPublishSideEffects(type, record.contentId);
  }
  await invalidateContentCaches();
  return { status: d.status, recordId: record.id, message: messageFor(d.status, record.isEdit) };
}

// ── Moderator views ─────────────────────────────────────────────────────────

export interface QueueItem {
  id: string;
  contentType: ContentType;
  contentId: string;
  isEdit: boolean;
  status: ModerationStatusValue;
  escalated: boolean;
  aiDecision: string | null;
  riskLevel: string | null;
  categories: string[];
  confidence: number | null;
  reason: string | null;
  providerError: string | null;
  policyVersion: string;
  authorId: string | null;
  createdAt: Date;
  preview: string;
}

export async function listQueue(
  moderator: Moderator,
  opts: { status?: string; page?: number; limit?: number },
): Promise<{ items: QueueItem[]; total: number }> {
  if (!isModeratorRole(moderator)) throw new ModerationError(403, "Moderator access required");

  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const page = Math.max(opts.page ?? 1, 1);
  const statuses: ModerationStatusValue[] =
    opts.status && ["PENDING_REVIEW", "HUMAN_REVIEW", "PUBLISHED", "REJECTED"].includes(opts.status)
      ? [opts.status as ModerationStatusValue]
      : OPEN_STATUSES;

  const where: any = { status: { in: statuses } };
  if (moderator.role !== "goye_admin") where.organizationId = moderator.orgId;

  const [rows, total] = await Promise.all([
    prisma.moderationRecord.findMany({
      where,
      orderBy: [{ escalated: "desc" }, { createdAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.moderationRecord.count({ where }),
  ]);

  const items: QueueItem[] = [];
  for (const r of rows) {
    const type = r.contentType as ContentType;
    let preview = "";
    if (r.isEdit && r.pendingContent != null) preview = fromStored(type, r.pendingContent);
    else if (r.status === "PENDING_REVIEW" || r.status === "HUMAN_REVIEW" || r.status === "REJECTED") {
      preview = (await loadLive(type, r.contentId))?.plaintext ?? "";
    }
    items.push({
      id: r.id,
      contentType: type,
      contentId: r.contentId,
      isEdit: r.isEdit,
      status: r.status as ModerationStatusValue,
      escalated: r.escalated,
      aiDecision: r.aiDecision,
      riskLevel: r.riskLevel,
      categories: r.categories,
      confidence: r.confidence,
      reason: r.reason,
      providerError: r.providerError,
      policyVersion: r.policyVersion,
      authorId: r.authorId,
      createdAt: r.createdAt,
      preview: preview.slice(0, 2000),
    });
  }
  return { items, total };
}

export async function getHistory(moderator: Moderator, contentType: ContentType, contentId: string) {
  if (!isModeratorRole(moderator)) throw new ModerationError(403, "Moderator access required");
  const rows = await prisma.moderationRecord.findMany({
    where: { contentType, contentId },
    orderBy: { createdAt: "asc" },
  });
  return rows
    .filter((r) => canModerate(moderator, r))
    .map((r) => ({
      id: r.id,
      isEdit: r.isEdit,
      status: r.status,
      aiDecision: r.aiDecision,
      riskLevel: r.riskLevel,
      categories: r.categories,
      reason: r.reason,
      policyVersion: r.policyVersion,
      model: r.model,
      humanDecision: r.humanDecision,
      humanReason: r.humanReason,
      reviewedById: r.reviewedById,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
    }));
}
