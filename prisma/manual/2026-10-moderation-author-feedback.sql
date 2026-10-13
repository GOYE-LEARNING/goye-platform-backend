-- Moderation: feedback written to the author. Additive and idempotent: safe to re-run, and safe
-- to apply BEFORE the code that uses it is deployed (older code simply ignores the new columns).
ALTER TABLE "moderation_records" ADD COLUMN IF NOT EXISTS "authorMessage"  TEXT;
ALTER TABLE "moderation_records" ADD COLUMN IF NOT EXISTS "flaggedPhrases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
