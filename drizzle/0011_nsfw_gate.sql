-- NextQuest 0011: strict NSFW gate.
-- Two new columns:
--   * profiles.allow_nsfw — per-user opt-in toggle (default false). Users see
--     no adult content until they flip this on in /profile.
--   * games.is_nsfw — server-stamped flag, set on insert/upsert from RAWG
--     metadata (see isNsfwFromRawg in src/lib/nsfw.ts). Existing rows are
--     backfilled by the heuristic below.
-- Apply via Supabase SQL editor OR `npm run db:push`.

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "allow_nsfw" boolean NOT NULL DEFAULT false;

ALTER TABLE "games"
  ADD COLUMN IF NOT EXISTS "is_nsfw" boolean NOT NULL DEFAULT false;

-- Hot path for the swipe queue / FYP / leaderboard filters — every query that
-- excludes NSFW becomes an index range scan instead of a seq scan.
CREATE INDEX IF NOT EXISTS "games_is_nsfw_idx" ON "games" ("is_nsfw");

-- Backfill: anything RAWG tagged with explicit sexual content or filed under
-- the "Adult" genre gets flagged. Lower() the comparison because RAWG mixes
-- "Nudity" / "nudity" / "NSFW" depending on the entry. Conservative on
-- purpose — we'd rather flag a borderline title than leak it.
UPDATE "games"
SET "is_nsfw" = true
WHERE "is_nsfw" = false
  AND (
    EXISTS (
      SELECT 1 FROM unnest("tags") AS t
      WHERE lower(t) IN (
        'nudity',
        'sexual content',
        'sexual-content',
        'nsfw',
        'hentai',
        'partial nudity',
        'partial-nudity',
        'mature'
      )
    )
    OR EXISTS (
      SELECT 1 FROM unnest("genres") AS g
      WHERE lower(g) IN ('adult', 'hentai')
    )
  );
