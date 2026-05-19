-- NextQuest 0006: per-game "not interested" + wishlist.
-- Both keyed on rawg_id (not local games.id) so they work for RAWG-only
-- suggestions too — the same FYP card may not have been logged by anyone yet.
-- Apply via Supabase SQL editor OR `npm run db:push`.

CREATE TABLE IF NOT EXISTS "user_excluded_games" (
  "user_id"     uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "rawg_id"     integer NOT NULL,
  "excluded_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_excluded_games_pk" PRIMARY KEY ("user_id", "rawg_id")
);

CREATE TABLE IF NOT EXISTS "user_wishlist" (
  "user_id"  uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "rawg_id"  integer NOT NULL,
  "added_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_wishlist_pk" PRIMARY KEY ("user_id", "rawg_id")
);

ALTER TABLE "user_excluded_games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_wishlist"       ENABLE ROW LEVEL SECURITY;

-- excluded_games is private — nobody else needs to see what you've hidden.
DROP POLICY IF EXISTS "user_excluded_games_read_self"  ON "user_excluded_games";
DROP POLICY IF EXISTS "user_excluded_games_write_self" ON "user_excluded_games";
CREATE POLICY "user_excluded_games_read_self"  ON "user_excluded_games" FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "user_excluded_games_write_self" ON "user_excluded_games" FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- wishlist is a public social signal — others can see what you want to play.
DROP POLICY IF EXISTS "user_wishlist_read_all"   ON "user_wishlist";
DROP POLICY IF EXISTS "user_wishlist_write_self" ON "user_wishlist";
CREATE POLICY "user_wishlist_read_all"   ON "user_wishlist" FOR SELECT USING (true);
CREATE POLICY "user_wishlist_write_self" ON "user_wishlist" FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
