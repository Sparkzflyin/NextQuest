-- NextQuest 0005: per-user "currently playing" dashboard list.
-- Apply via Supabase SQL editor OR `npm run db:push` after pulling the schema change.

CREATE TABLE IF NOT EXISTS "user_currently_playing" (
  "user_id"    uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "game_id"    uuid NOT NULL REFERENCES "games"("id")    ON DELETE CASCADE,
  "started_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_currently_playing_pk" PRIMARY KEY ("user_id", "game_id")
);

ALTER TABLE "user_currently_playing" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_currently_playing_read_all"   ON "user_currently_playing";
DROP POLICY IF EXISTS "user_currently_playing_write_self" ON "user_currently_playing";
CREATE POLICY "user_currently_playing_read_all"   ON "user_currently_playing" FOR SELECT USING (true);
CREATE POLICY "user_currently_playing_write_self" ON "user_currently_playing" FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
