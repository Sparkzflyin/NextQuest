-- NextQuest 0013: VR leaderboard (#20).
-- RAWG has no "VR" genre — VR shows up only in tags ("VR", "Virtual Reality",
-- etc.) and platforms (which we don't store). We add a dedicated games.is_vr
-- column plus a new canonical_genres row so the existing leaderboard UI picks
-- up a 20th board automatically. The board's queries special-case 'VR' and
-- read is_vr instead of doing a genre-array match.
--
-- Keep the tag list here in sync with isVrFromRawg() in src/lib/vr.ts.
-- Apply via Supabase SQL editor OR `npm run db:push`.

ALTER TABLE "games"
  ADD COLUMN IF NOT EXISTS "is_vr" boolean NOT NULL DEFAULT false;

-- Hot path for the VR leaderboard — covers both the index count and the
-- per-genre top-20.
CREATE INDEX IF NOT EXISTS "games_is_vr_idx" ON "games" ("is_vr");

-- Backfill: any RAWG tag that names VR or a major VR platform flips the flag.
-- Conservative on purpose — false negatives just mean an older title doesn't
-- appear until someone re-logs it, false positives would pollute the board.
UPDATE "games"
SET "is_vr" = true
WHERE "is_vr" = false
  AND EXISTS (
    SELECT 1 FROM unnest("tags") AS t
    WHERE lower(t) IN (
      'vr',
      'virtual reality',
      'vr only',
      'vr-only',
      'vr required',
      'vr-required',
      'vr support',
      'vr-support',
      'vr mod'
    )
  );

-- Make VR the 20th board. The leaderboard index orders alphabetically, so
-- 'VR' lands after the existing 19 seeded genres.
INSERT INTO "canonical_genres" ("name") VALUES ('VR')
ON CONFLICT DO NOTHING;
