import "./env-setup";
import fs from "fs";
import path from "path";
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "../../db";
import { ModerationError, humanDecide, submitEdit, submitNew } from "../moderationGate";
import { SocialController } from "../../controllers/SocialController";
import { DiscussionController } from "../../controllers/DiscussionController";
import { ModerationController } from "../../controllers/ModerationController";
import { expressAuthentication } from "../../auth/authentication";
import { mockProvider, mockProviderTimeout, restoreFetch, verdict } from "./helpers";

let u1: { id: string };
let u2: { id: string };
let courseId: string;

const postIds: string[] = [];
const replyIds: string[] = [];
const discussionIds: string[] = [];

async function newPost(status: any = "PENDING_REVIEW", content = "A test post") {
  const p = await prisma.post.create({
    data: { title: "Test title", content, userId: u1.id, courseId, moderationStatus: status },
  });
  postIds.push(p.id);
  return p;
}

async function newReply(postId: string, status: any = "PENDING_REVIEW", content = "A test reply") {
  const r = await prisma.reply.create({ data: { content, userId: u1.id, postId, moderationStatus: status } });
  replyIds.push(r.id);
  return r;
}

async function newDiscussion(status: any = "PENDING_REVIEW") {
  const d = await prisma.discussion.create({
    data: { content: "enc", category: "DISCUSSION" as any, authorId: u1.id, isPublic: true, moderationStatus: status },
  });
  discussionIds.push(d.id);
  return d;
}

const record = (contentId: string) =>
  prisma.moderationRecord.findFirst({ where: { contentId }, orderBy: { createdAt: "desc" } });

const goyeAdmin = () => ({ id: u2.id, role: "goye_admin" });

before(async () => {
  const users = await prisma.user.findMany({ take: 2, orderBy: { createdAt: "asc" }, select: { id: true } });
  const course = await prisma.course.findFirst({ select: { id: true } });
  assert.ok(users.length === 2 && course, "local test database needs at least 2 users and 1 course");
  [u1, u2] = users;
  courseId = course!.id;
});

afterEach(() => restoreFetch());

after(async () => {
  const ids = [...postIds, ...replyIds, ...discussionIds];
  await prisma.moderationRecord.deleteMany({ where: { contentId: { in: ids } } });
  await prisma.reply.deleteMany({ where: { id: { in: replyIds } } });
  await prisma.post.deleteMany({ where: { id: { in: postIds } } });
  await prisma.discussion.deleteMany({ where: { id: { in: discussionIds } } });
  await prisma.$disconnect();
});

describe("gate: publication workflow", () => {
  it("AI allow publishes, and the AI decision is audited", async () => {
    mockProvider(verdict());
    const p = await newPost();
    const r = await submitNew({ type: "POST", contentId: p.id, authorId: u1.id, title: p.title, plaintext: p.content });

    assert.equal(r.status, "PUBLISHED");
    assert.equal((await prisma.post.findUnique({ where: { id: p.id } }))!.moderationStatus, "PUBLISHED");
    const rec = (await record(p.id))!;
    assert.equal(rec.aiDecision, "allow");
    assert.equal(rec.status, "PUBLISHED");
    assert.equal(rec.model, "test-model");
    assert.ok(rec.policyVersion.startsWith("GOYE-"));
    assert.equal(rec.humanDecision, null);
  });

  it("AI review keeps the post hidden for a human", async () => {
    mockProvider(verdict({ decision: "review", riskLevel: "medium", confidence: 0.5 }));
    const p = await newPost();
    const r = await submitNew({ type: "POST", contentId: p.id, authorId: u1.id, title: p.title, plaintext: p.content });
    assert.equal(r.status, "HUMAN_REVIEW");
    assert.equal((await prisma.post.findUnique({ where: { id: p.id } }))!.moderationStatus, "HUMAN_REVIEW");
  });

  it("AI block rejects and keeps it unpublished", async () => {
    mockProvider(verdict({ decision: "block", riskLevel: "high", categories: ["harassment"], confidence: 0.99 }));
    const p = await newPost();
    const r = await submitNew({ type: "POST", contentId: p.id, authorId: u1.id, title: p.title, plaintext: p.content });
    assert.equal(r.status, "REJECTED");
    assert.equal((await prisma.post.findUnique({ where: { id: p.id } }))!.moderationStatus, "REJECTED");
  });

  it("6. a provider outage leaves the post unpublished and records why", async () => {
    mockProviderTimeout();
    const p = await newPost();
    const r = await submitNew({ type: "POST", contentId: p.id, authorId: u1.id, title: p.title, plaintext: p.content });
    assert.equal(r.status, "PENDING_REVIEW");
    assert.equal((await prisma.post.findUnique({ where: { id: p.id } }))!.moderationStatus, "PENDING_REVIEW");
    assert.equal((await record(p.id))!.providerError, "provider_timeout");
  });

  it("media-only submissions are never auto-published", async () => {
    const calls = mockProvider(verdict());
    const d = await newDiscussion();
    const r = await submitNew({ type: "DISCUSSION", contentId: d.id, authorId: u1.id, plaintext: "", hasMedia: true });
    assert.equal(r.status, "HUMAN_REVIEW");
    assert.equal(calls.length, 0, "no text, so no AI call");
  });

  it("13. a retried submission doesn't call the AI twice or re-publish", async () => {
    const calls = mockProvider(verdict());
    const p = await newPost();
    const args = { type: "POST" as const, contentId: p.id, authorId: u1.id, title: p.title, plaintext: p.content };
    const first = await submitNew(args);
    const second = await submitNew(args);
    assert.equal(first.status, "PUBLISHED");
    assert.equal(second.status, "PUBLISHED");
    assert.equal(calls.length, 1);
    assert.equal((await prisma.post.findUnique({ where: { id: p.id } }))!.moderationStatus, "PUBLISHED");
  });
});

describe("gate: human review", () => {
  async function held() {
    mockProvider(verdict({ decision: "review", riskLevel: "medium", confidence: 0.5, reason: "Needs a person." }));
    const p = await newPost();
    await submitNew({ type: "POST", contentId: p.id, authorId: u1.id, title: p.title, plaintext: p.content });
    return { p, rec: (await record(p.id))! };
  }

  it("14. approve publishes and is audited separately from the AI's view", async () => {
    const { p, rec } = await held();
    await humanDecide({ recordId: rec.id, moderator: goyeAdmin(), decision: "approve", reason: "Fine on review" });

    assert.equal((await prisma.post.findUnique({ where: { id: p.id } }))!.moderationStatus, "PUBLISHED");
    const after = (await prisma.moderationRecord.findUnique({ where: { id: rec.id } }))!;
    assert.equal(after.status, "PUBLISHED");
    assert.equal(after.humanDecision, "approve");
    assert.equal(after.humanReason, "Fine on review");
    assert.equal(after.reviewedById, u2.id);
    assert.ok(after.reviewedAt);
    assert.equal(after.aiDecision, "review", "AI recommendation is preserved");
    assert.equal(after.reason, "Needs a person.");
  });

  it("14. reject keeps it unpublished and is audited", async () => {
    const { p, rec } = await held();
    await humanDecide({ recordId: rec.id, moderator: goyeAdmin(), decision: "reject", reason: "Off topic" });
    assert.equal((await prisma.post.findUnique({ where: { id: p.id } }))!.moderationStatus, "REJECTED");
    const after = (await prisma.moderationRecord.findUnique({ where: { id: rec.id } }))!;
    assert.equal(after.humanDecision, "reject");
    assert.equal(after.reviewedById, u2.id);
  });

  it("13. two moderators clicking at once: exactly one decision wins", async () => {
    const { p, rec } = await held();
    const results = await Promise.allSettled([
      humanDecide({ recordId: rec.id, moderator: goyeAdmin(), decision: "approve" }),
      humanDecide({ recordId: rec.id, moderator: goyeAdmin(), decision: "reject" }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const bad = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    assert.equal(ok.length, 1);
    assert.equal(bad.length, 1);
    assert.ok(bad[0].reason instanceof ModerationError && bad[0].reason.statusCode === 409);
    const status = (await prisma.post.findUnique({ where: { id: p.id } }))!.moderationStatus;
    const rec2 = (await prisma.moderationRecord.findUnique({ where: { id: rec.id } }))!;
    assert.equal(status, rec2.status, "content and record never disagree");
  });

  it("11/12. ordinary users and other organizations cannot decide", async () => {
    const { rec } = await held();
    await assert.rejects(
      humanDecide({ recordId: rec.id, moderator: { id: u1.id, role: "student" }, decision: "approve" }),
      (e: any) => e instanceof ModerationError && e.statusCode === 404,
    );
    await assert.rejects(
      humanDecide({ recordId: rec.id, moderator: { id: u2.id, role: "org_admin", orgId: "some-other-org" }, decision: "approve" }),
      (e: any) => e instanceof ModerationError && e.statusCode === 404,
    );
    assert.equal((await prisma.moderationRecord.findUnique({ where: { id: rec.id } }))!.status, "HUMAN_REVIEW");
  });

  it("an org admin can decide items from their own organization", async () => {
    const { rec } = await held();
    await prisma.moderationRecord.update({ where: { id: rec.id }, data: { organizationId: "org-test-1" } });
    await humanDecide({
      recordId: rec.id,
      moderator: { id: u2.id, role: "org_admin", orgId: "org-test-1" },
      decision: "approve",
    });
    assert.equal((await prisma.moderationRecord.findUnique({ where: { id: rec.id } }))!.status, "PUBLISHED");
  });
});

describe("gate: edits to published content", () => {
  async function publishedReply() {
    const p = await newPost("PUBLISHED");
    const r = await newReply(p.id, "PUBLISHED", "Approved original text");
    return r;
  }

  it("a flagged edit leaves the approved version public until a moderator decides", async () => {
    const r = await publishedReply();
    mockProvider(verdict({ decision: "review", riskLevel: "medium", confidence: 0.5 }));
    const res = await submitEdit({ type: "REPLY", contentId: r.id, authorId: u1.id, plaintext: "Edited, needs review" });
    assert.equal(res.status, "HUMAN_REVIEW");

    const live = (await prisma.reply.findUnique({ where: { id: r.id } }))!;
    assert.equal(live.content, "Approved original text");
    assert.equal(live.moderationStatus, "PUBLISHED");

    const rec = (await record(r.id))!;
    assert.equal(rec.isEdit, true);
    assert.equal(rec.pendingContent, "Edited, needs review");

    await humanDecide({ recordId: rec.id, moderator: goyeAdmin(), decision: "approve" });
    const after = (await prisma.reply.findUnique({ where: { id: r.id } }))!;
    assert.equal(after.content, "Edited, needs review");
    assert.equal((await prisma.moderationRecord.findUnique({ where: { id: rec.id } }))!.pendingContent, null);
  });

  it("a rejected edit never goes live", async () => {
    const r = await publishedReply();
    mockProvider(verdict({ decision: "block", riskLevel: "high", confidence: 0.99, categories: ["harassment"] }));
    const res = await submitEdit({ type: "REPLY", contentId: r.id, authorId: u1.id, plaintext: "Abusive edit" });
    assert.equal(res.status, "REJECTED");
    assert.equal((await prisma.reply.findUnique({ where: { id: r.id } }))!.content, "Approved original text");
  });

  it("a clean edit goes live straight away", async () => {
    const r = await publishedReply();
    mockProvider(verdict());
    const res = await submitEdit({ type: "REPLY", contentId: r.id, authorId: u1.id, plaintext: "Nicer wording" });
    assert.equal(res.status, "PUBLISHED");
    assert.equal((await prisma.reply.findUnique({ where: { id: r.id } }))!.content, "Nicer wording");
  });
});

describe("bypass attempts", () => {
  it("10/12. a client cannot supply its own status through the create endpoint", async () => {
    mockProviderTimeout();
    const social = new SocialController();
    const result = await social.CreatePost(
      { user: { id: u1.id } },
      courseId,
      { title: "Sneaky", content: "Trying to self-publish", moderationStatus: "PUBLISHED" } as any,
    );
    postIds.push(result.data.id);
    assert.equal(result.data.moderationStatus, "PENDING_REVIEW");
    assert.equal((await prisma.post.findUnique({ where: { id: result.data.id } }))!.moderationStatus, "PENDING_REVIEW");
  });

  it("10. held, rejected and pending posts/replies never appear in public reads", async () => {
    const social = new SocialController();
    const live = await newPost("PUBLISHED", "Visible live post");
    const hidden = [await newPost("PENDING_REVIEW"), await newPost("HUMAN_REVIEW"), await newPost("REJECTED")];
    const hiddenReply = await newReply(live.id, "HUMAN_REVIEW", "Hidden reply");
    const liveReply = await newReply(live.id, "PUBLISHED", "Visible reply");

    const all = JSON.stringify((await social.GetAllPosts(1, 200)).data);
    const byCourse = JSON.stringify((await social.GetPostByCourseId(courseId, 1, 200)).data);
    for (const h of hidden) {
      assert.ok(!all.includes(h.id), "GetAllPosts leaked " + h.id);
      assert.ok(!byCourse.includes(h.id), "GetPostByCourseId leaked " + h.id);
      const single = new SocialController();
      await single.GetPostWithReplies(h.id);
      assert.equal(single.getStatus(), 404);
    }
    assert.ok(all.includes(live.id), "published post is still visible");

    const replies = JSON.stringify((await social.GetPostReplies(live.id)).data);
    assert.ok(!replies.includes(hiddenReply.id));
    assert.ok(replies.includes(liveReply.id));

    const thread = JSON.stringify((await new SocialController().GetPostWithReplies(live.id)).data);
    assert.ok(!thread.includes(hiddenReply.id));
    assert.ok(thread.includes(liveReply.id));
  });

  it("10. nobody can reply to, or like, content that isn't public", async () => {
    const pending = await newPost("PENDING_REVIEW");
    const reply = new SocialController();
    await reply.CreateReply({ user: { id: u2.id } }, pending.id, { content: "Hello" } as any);
    assert.equal(reply.getStatus(), 404);

    const like = new SocialController();
    await like.LikePost(pending.id, { user: { id: u2.id } });
    assert.equal(like.getStatus(), 404);
  });

  it("10. held discussions are excluded from every discussion read", async () => {
    const pending = await newDiscussion("PENDING_REVIEW");
    const rejected = await newDiscussion("REJECTED");
    const live = await newDiscussion("PUBLISHED");

    const feed = JSON.stringify(
      (await new DiscussionController().GetPublicDiscussions({ user: { id: u2.id } }, "latest", 1, 200)).data,
    );
    assert.ok(!feed.includes(pending.id) && !feed.includes(rejected.id));
    assert.ok(feed.includes(live.id));

    for (const d of [pending, rejected]) {
      const one = new DiscussionController();
      await one.GetDiscussionById({ user: { id: u2.id } }, d.id);
      assert.equal(one.getStatus(), 404);

      const comments = new DiscussionController();
      await comments.GetDiscussionComments(d.id);
      assert.equal(comments.getStatus(), 404);

      const replyTo = new DiscussionController();
      await replyTo.ReplyToDiscussion({ user: { id: u2.id } }, d.id, { content: "hi" } as any);
      assert.equal(replyTo.getStatus(), 404);
    }
  });

  it("9. every create/edit route requires authentication, and a request with no credentials is rejected", () => {
    const routes = fs.readFileSync(path.resolve(__dirname, "../../routes/routes.ts"), "utf8");
    const mustBeSecured = [
      "/api/socials/create-post/:courseId",
      "/api/socials/create-reply/:postId",
      "/api/socials/update-reply/:replyId",
      "/api/discussion/public",
      "/api/discussion/public/:discussionId/reply",
      "/api/discussion/reply/:replyId/nested",
      "/api/discussion/:discussionId",
      "/api/moderation/queue",
      "/api/moderation/decide/:recordId",
    ];
    for (const route of mustBeSecured) {
      const lines = routes.split("\n");
      const at = lines.findIndex((l) => l.includes(`'${route}'`) && /app\.(post|put|get)\(/.test(l));
      assert.ok(at >= 0, "route not found: " + route);
      assert.match(lines.slice(at, at + 3).join("\n"), /authenticateMiddleware/, "route is not protected: " + route);
    }
    return assert.rejects(expressAuthentication({ headers: {}, cookies: {} } as any, "bearerAuth"));
  });
});

describe("moderator access control", () => {
  it("11. ordinary users cannot read the queue, history, metrics, or decide", async () => {
    const student = { user: { id: u1.id, role: "student" } };
    const ctl = () => new ModerationController();

    for (const call of [
      (c: ModerationController) => c.GetQueue(student),
      (c: ModerationController) => c.GetContentHistory(student, "POST", "x"),
      (c: ModerationController) => c.Decide(student, "x", { decision: "approve" }),
      (c: ModerationController) => c.Rerun(student, "x"),
      (c: ModerationController) => c.GetMetrics(student),
    ]) {
      const c = ctl();
      const res: any = await call(c);
      assert.equal(c.getStatus(), 403);
      assert.equal(res.success, false);
    }
  });

  it("a platform admin sees held items; an org admin sees only their own organization's", async () => {
    mockProvider(verdict({ decision: "review", riskLevel: "medium", confidence: 0.5 }));
    const p = await newPost();
    await submitNew({ type: "POST", contentId: p.id, authorId: u1.id, title: p.title, plaintext: p.content });
    const rec = (await record(p.id))!;

    const admin = new ModerationController();
    const all: any = await admin.GetQueue({ user: { id: u2.id, role: "goye_admin" } }, undefined, 1, 50);
    assert.ok(all.data.some((i: any) => i.id === rec.id));
    assert.equal(all.data.find((i: any) => i.id === rec.id).preview, p.content);

    const otherOrg = new ModerationController();
    const none: any = await otherOrg.GetQueue(
      { user: { id: u2.id, role: "org_admin" }, org: { id: "another-org" } },
      undefined,
      1,
      50,
    );
    assert.ok(!none.data.some((i: any) => i.id === rec.id));
  });
});
