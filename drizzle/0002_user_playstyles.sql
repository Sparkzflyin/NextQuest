-- NextQuest 0002: per-user favorite playstyles.
-- Apply via Supabase SQL editor OR by running `npm run db:push` after pulling
-- the matching src/lib/db/schema.ts change. Mirrors user_genres.

CREATE TABLE IF NOT EXISTS "user_playstyles" (
  "user_id"   uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "playstyle" text NOT NULL,
  CONSTRAINT "user_playstyles_user_id_playstyle_pk" PRIMARY KEY ("user_id", "playstyle")
);
