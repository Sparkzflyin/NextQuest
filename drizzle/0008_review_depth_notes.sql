-- NextQuest 0008: per-axis depth notes on reviews + the data behind the +10
-- "in-depth review" credit bonus.
-- Subscore columns (gameplay_rating, narrative_rating, design_rating) already
-- exist from 0004; this adds the matching text columns so reviewers can
-- expand on each axis. Filling all three notes (≥ 40 chars each) + all three
-- subscores qualifies the review for the bonus (computed live in
-- src/lib/credits.ts).
-- Apply via Supabase SQL editor OR `npm run db:push`.

ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "gameplay_notes"  text,
  ADD COLUMN IF NOT EXISTS "narrative_notes" text,
  ADD COLUMN IF NOT EXISTS "design_notes"    text;

ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_gameplay_notes_len";
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_narrative_notes_len";
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_design_notes_len";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_gameplay_notes_len"  CHECK ("gameplay_notes"  IS NULL OR char_length("gameplay_notes")  <= 1000),
  ADD CONSTRAINT "reviews_narrative_notes_len" CHECK ("narrative_notes" IS NULL OR char_length("narrative_notes") <= 1000),
  ADD CONSTRAINT "reviews_design_notes_len"    CHECK ("design_notes"    IS NULL OR char_length("design_notes")    <= 1000);
