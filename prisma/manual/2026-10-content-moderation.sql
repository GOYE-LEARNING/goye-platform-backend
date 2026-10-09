-- Content moderation (review-before-publication). Idempotent: safe to re-run.
-- Existing rows are backfilled as PUBLISHED so nothing already live disappears;
-- the column default is then switched to PENDING_REVIEW for all new content.

DO $$ BEGIN
  CREATE TYPE "ModerationStatus" AS ENUM ('PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'HUMAN_REVIEW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ModerationContentType" AS ENUM ('POST', 'REPLY', 'DISCUSSION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "posts"      ADD COLUMN IF NOT EXISTS "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "Reply"      ADD COLUMN IF NOT EXISTS "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "Discussion" ADD COLUMN IF NOT EXISTS "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PUBLISHED';

ALTER TABLE "posts"      ALTER COLUMN "moderationStatus" SET DEFAULT 'PENDING_REVIEW';
ALTER TABLE "Reply"      ALTER COLUMN "moderationStatus" SET DEFAULT 'PENDING_REVIEW';
ALTER TABLE "Discussion" ALTER COLUMN "moderationStatus" SET DEFAULT 'PENDING_REVIEW';

CREATE INDEX IF NOT EXISTS "posts_moderationStatus_idx"      ON "posts"("moderationStatus");
CREATE INDEX IF NOT EXISTS "Reply_moderationStatus_idx"      ON "Reply"("moderationStatus");
CREATE INDEX IF NOT EXISTS "Discussion_moderationStatus_idx" ON "Discussion"("moderationStatus");

CREATE TABLE IF NOT EXISTS "moderation_records" (
  "id"                  TEXT PRIMARY KEY,
  "contentType"         "ModerationContentType" NOT NULL,
  "contentId"           TEXT NOT NULL,
  "authorId"            TEXT,
  "organizationId"      TEXT,
  "isEdit"              BOOLEAN NOT NULL DEFAULT false,
  "contentHash"         TEXT NOT NULL,
  "pendingTitle"        TEXT,
  "pendingContent"      TEXT,
  "aiDecision"          TEXT,
  "riskLevel"           TEXT,
  "categories"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "confidence"          DOUBLE PRECISION,
  "reason"              TEXT,
  "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
  "escalated"           BOOLEAN NOT NULL DEFAULT false,
  "model"               TEXT,
  "policyVersion"       TEXT NOT NULL,
  "providerError"       TEXT,
  "status"              "ModerationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "humanDecision"       TEXT,
  "humanReason"         TEXT,
  "reviewedById"        TEXT,
  "reviewedAt"          TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "moderation_records_status_createdAt_idx"   ON "moderation_records"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "moderation_records_contentType_contentId_idx" ON "moderation_records"("contentType", "contentId");
CREATE INDEX IF NOT EXISTS "moderation_records_organizationId_idx"     ON "moderation_records"("organizationId");
CREATE INDEX IF NOT EXISTS "moderation_records_contentHash_contentType_contentId_idx" ON "moderation_records"("contentHash", "contentType", "contentId");
