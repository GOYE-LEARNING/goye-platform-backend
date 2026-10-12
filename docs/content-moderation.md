# Content moderation (review before publication)

Every post, reply and public discussion starts as `PENDING_REVIEW` and is only
shown to other members once it is `PUBLISHED`.

| Status | Meaning |
| --- | --- |
| `PENDING_REVIEW` | Saved, not yet evaluated, or the AI check failed. Hidden. |
| `PUBLISHED` | Approved by the AI (clear, low-risk, confident) or by a moderator. |
| `HUMAN_REVIEW` | Uncertain, risky, critical, contains media, or too long for the AI. Hidden until a moderator decides. |
| `REJECTED` | Confidently blocked by the AI, or rejected by a moderator. Hidden. |

If Groq is down, times out or returns something invalid, the item stays
`PENDING_REVIEW` (never published). A moderator can press "re-run" on it.

Edits to published content are moderated before they go live. The live row
keeps the last approved text; the proposed text waits in `moderation_records`
(`pendingContent`) until approved.

The AI never bans accounts. It only recommends a publication decision.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | yes | Groq API key. Backend only; never ship to a client. |
| `GROQ_MODERATION_MODEL` | yes | Model id. Recommended free option: `openai/gpt-oss-20b`. |
| `MODERATION_TIMEOUT_MS` | no | Per-attempt timeout (default 6000). |
| `MODERATION_MAX_RETRIES` | no | Retries after timeout/429/5xx (default 1). |
| `MODERATION_MEDIA_REQUIRES_REVIEW` | no | Default `true`: anything with attached media goes to a person, because the model reads text only. |
| `SUBMISSION_RATE_LIMIT` | no | Posts/replies/edits per user per minute (default 10). |

If `GROQ_API_KEY` or `GROQ_MODERATION_MODEL` is missing, nothing is published
automatically; everything stays pending.

### Free-tier limits (checked 2026-10-09)
`openai/gpt-oss-20b`: 8,000 tokens/minute and 1,000 requests/day.
`openai/gpt-oss-safeguard-20b` is purpose-built for policy classification but
only gets 2,000 tokens/minute on the free tier, which is about one check a
minute. Over the limit, items simply wait as `PENDING_REVIEW`.

## Database change
Run `prisma/manual/2026-10-content-moderation.sql` once on each database
**before deploying this code**. It is idempotent. Existing rows are backfilled
as `PUBLISHED` so nothing live disappears.

## Moderator API (`/api/moderation`)
Platform admins (`goye_admin`) see everything. Organization admins see only
items from their own organization.

- `GET /queue?status=&page=&limit=` items waiting for a person
- `GET /history/{POST|REPLY|DISCUSSION}/{id}` full audit trail
- `POST /decide/{recordId}` `{ "decision": "approve" | "reject", "reason": "..." }`
- `POST /rerun/{recordId}` ask the AI again
- `GET /metrics` counters since server start (platform admins)

## Policy
`src/moderation/policy.ts`. Bump `POLICY_VERSION` on any change. GOYE
leadership should review the wording; the model is told to apply only what is
written there and to send anything uncertain to a human.

## Tests
`npm run test:moderation` (uses the local database only and refuses to run
against a hosted one; Groq is mocked).

## Known limits
- Private messages are out of scope.
- Groups, events and bios are not yet covered.
- The model can be wrong in both directions. That is why borderline items go to
  a person and why only confident results are automatic.
