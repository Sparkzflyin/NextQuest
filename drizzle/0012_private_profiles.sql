-- NextQuest 0012: private profile toggle.
-- profiles.is_private — when true, /users/<name> hides the user's currently
-- playing list and logs from anyone except the owner and admins; the user's
-- reviews on /games/<id> are filtered out of the public list the same way.
-- Default false so existing profiles stay public.
-- Apply via Supabase SQL editor OR `npm run db:push`.

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "is_private" boolean NOT NULL DEFAULT false;
