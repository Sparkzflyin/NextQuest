-- NextQuest 0009: per-review admin credit override.
-- Lets a moderator dial up or down the credits awarded for a specific review,
-- defending against farming (low-effort spam → set to 0–5) without hard-rejecting
-- every borderline submission. NULL means "use the default" (25 base + 10 if
-- the review qualifies for in-depth) — see src/lib/credits.ts.
-- Apply via Supabase SQL editor OR `npm run db:push`.

ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "credit_override" smallint;

ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_credit_override_range";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_credit_override_range"
    CHECK ("credit_override" IS NULL OR "credit_override" BETWEEN 0 AND 100);
