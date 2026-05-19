-- NextQuest 0010: lazy-cached RAWG descriptions on games.
-- The For-You and Swipe info modals lazy-fetch RAWG descriptions on demand.
-- Caching the result on the local games row turns every subsequent open into
-- a single index lookup instead of a network round-trip. Nullable on purpose:
-- existing rows stay empty until someone actually opens an info modal on them.
-- Apply via Supabase SQL editor OR `npm run db:push`.

ALTER TABLE "games"
  ADD COLUMN IF NOT EXISTS "description" text;
