-- NextQuest 0001: admin role + review moderation.
-- Apply via Supabase SQL editor OR by running `npm run db:push` (schema-sync) after pulling
-- the matching changes in src/lib/db/schema.ts.

-- ── profiles.is_admin ──
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false;

-- ── reviews moderation columns ──
ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "status"       text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "moderated_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "moderated_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL;

-- Backfill: pre-existing reviews are treated as approved so the leaderboards/game pages don't
-- empty out the moment moderation turns on. Brand-new reviews insert as 'pending' by default.
UPDATE "reviews" SET "status" = 'approved' WHERE "status" = 'pending' AND "created_at" < now();

ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_status_enum";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_status_enum" CHECK ("status" IN ('pending','approved','rejected'));

CREATE INDEX IF NOT EXISTS "reviews_status_idx" ON "reviews" ("status");

-- ── HOW TO MAKE YOURSELF ADMIN ──
-- After signing up via the app, find your username in the profiles table, then run:
--   UPDATE profiles SET is_admin = true WHERE username = 'your-username-here';
-- That account can now visit /admin to approve or reject pending reviews.
