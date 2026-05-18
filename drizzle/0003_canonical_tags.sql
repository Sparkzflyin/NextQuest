-- NextQuest 0003: canonical tag tables for genres + playstyles.
-- Replaces the hardcoded constants list as the authoritative source for which
-- tags show up in the profile / log pickers. Genres grow when new RAWG genres
-- are seen (auto-promote in logGame). Playstyles grow when a user-created tag
-- appears on ≥5 approved reviews (promotion sweep in approveReview).
-- Apply via Supabase SQL editor OR `npm run db:push`.

CREATE TABLE IF NOT EXISTS "canonical_genres" (
  "name"       text NOT NULL PRIMARY KEY,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "canonical_playstyles" (
  "name"       text NOT NULL PRIMARY KEY,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Seed with the current hardcoded vocabulary so existing data keeps working.
INSERT INTO "canonical_genres" ("name") VALUES
  ('Action'), ('Adventure'), ('RPG'), ('Shooter'), ('Strategy'),
  ('Puzzle'), ('Platformer'), ('Racing'), ('Sports'), ('Fighting'),
  ('Simulation'), ('Indie'), ('Casual'), ('Arcade'), ('Family'),
  ('Board Games'), ('Educational'), ('Card'), ('Massively Multiplayer')
ON CONFLICT DO NOTHING;

INSERT INTO "canonical_playstyles" ("name") VALUES
  ('Story-driven'), ('Competitive'), ('Co-op'), ('Exploration'),
  ('Stealth'), ('Combat-heavy'), ('Puzzle-solving'), ('Open-world'),
  ('Linear'), ('Replayable'), ('Atmospheric'), ('Speedrun-friendly')
ON CONFLICT DO NOTHING;
