-- NextQuest 0007: swipe events for the swipe deck.
-- Records every directional swipe so we can: (a) suppress repeats in the queue,
-- (b) drive the daily-capped credit reward, (c) keep an audit trail of likes /
-- dislikes / wishlist adds.
-- Apply via Supabase SQL editor OR `npm run db:push`.

CREATE TABLE IF NOT EXISTS "swipes" (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"   uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "rawg_id"   integer NOT NULL,
  "action"    text NOT NULL,
  "swiped_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "swipes_action_enum" CHECK ("action" IN ('like','dislike','wishlist','skip'))
);

CREATE INDEX IF NOT EXISTS "swipes_user_time_idx" ON "swipes" ("user_id", "swiped_at" DESC);
CREATE INDEX IF NOT EXISTS "swipes_user_rawg_idx" ON "swipes" ("user_id", "rawg_id");

ALTER TABLE "swipes" ENABLE ROW LEVEL SECURITY;

-- Private — swipe history is personal queue state.
DROP POLICY IF EXISTS "swipes_read_self"  ON "swipes";
DROP POLICY IF EXISTS "swipes_write_self" ON "swipes";
CREATE POLICY "swipes_read_self"  ON "swipes" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "swipes_write_self" ON "swipes" FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
