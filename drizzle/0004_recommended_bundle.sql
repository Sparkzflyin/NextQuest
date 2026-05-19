-- NextQuest 0004: multi-axis review scores + per-user excluded genres/tags.
-- Apply via Supabase SQL editor OR `npm run db:push` after pulling schema changes.
-- Credits are derived in src/lib/credits.ts (not stored) so no column is added here.

-- ── reviews: per-axis subscores ──
-- Existing `rating` stays as the "overall" score; subscores are optional so legacy
-- rows keep working. Same 1-10 range as overall.
ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "gameplay_rating"  smallint,
  ADD COLUMN IF NOT EXISTS "narrative_rating" smallint,
  ADD COLUMN IF NOT EXISTS "design_rating"    smallint;

ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_gameplay_range";
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_narrative_range";
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_design_range";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_gameplay_range"  CHECK ("gameplay_rating"  IS NULL OR "gameplay_rating"  BETWEEN 1 AND 10),
  ADD CONSTRAINT "reviews_narrative_range" CHECK ("narrative_rating" IS NULL OR "narrative_rating" BETWEEN 1 AND 10),
  ADD CONSTRAINT "reviews_design_range"    CHECK ("design_rating"    IS NULL OR "design_rating"    BETWEEN 1 AND 10);

-- ── user exclusions: "never show me this" ──
-- Mirrors user_genres / user_playstyles in shape so the same UI patterns apply.
-- Recommendations page filters games whose genres/tags hit any of these.
CREATE TABLE IF NOT EXISTS "user_excluded_genres" (
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "genre"   text NOT NULL,
  CONSTRAINT "user_excluded_genres_pk" PRIMARY KEY ("user_id", "genre")
);

CREATE TABLE IF NOT EXISTS "user_excluded_tags" (
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "tag"     text NOT NULL,
  CONSTRAINT "user_excluded_tags_pk" PRIMARY KEY ("user_id", "tag")
);

-- RLS for the new tables. Pattern matches user_genres / user_playstyles.
ALTER TABLE "user_excluded_genres" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_excluded_tags"   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_excluded_genres_read_all"   ON "user_excluded_genres";
DROP POLICY IF EXISTS "user_excluded_genres_write_self" ON "user_excluded_genres";
CREATE POLICY "user_excluded_genres_read_all"   ON "user_excluded_genres" FOR SELECT USING (true);
CREATE POLICY "user_excluded_genres_write_self" ON "user_excluded_genres" FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_excluded_tags_read_all"   ON "user_excluded_tags";
DROP POLICY IF EXISTS "user_excluded_tags_write_self" ON "user_excluded_tags";
CREATE POLICY "user_excluded_tags_read_all"   ON "user_excluded_tags" FOR SELECT USING (true);
CREATE POLICY "user_excluded_tags_write_self" ON "user_excluded_tags" FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
