"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  swipes,
  userExcludedGames,
  userGenres,
  userWishlist,
  votes,
} from "@/lib/db/schema";
import { getSwipesUsedToday, MAX_DAILY_SWIPES } from "@/lib/credits";
import { loadLocalRecommendations, type RecommendationRow } from "@/lib/recommendations";
import { browseByGenres } from "@/lib/rawg";

const ACTIONS = ["like", "dislike", "wishlist", "skip"] as const;
const swipeSchema = z.object({
  rawgId: z.number().int().positive(),
  // Optional local game id so we can also drop a vote when the action is "like".
  gameId: z.string().uuid().nullable(),
  action: z.enum(ACTIONS),
});

export async function recordSwipe(input: z.input<typeof swipeSchema>) {
  const parsed = swipeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { rawgId, gameId, action } = parsed.data;

  // Log the swipe first — used for queue suppression and credit accounting.
  await db.insert(swipes).values({ userId: user.id, rawgId, action });

  // Side effects per action. Stakeholder direction: dislike hides without
  // downvoting (so a user's "not for me" doesn't tarnish a game's score).
  if (action === "like" && gameId) {
    await db
      .insert(votes)
      .values({ userId: user.id, gameId, value: 1 })
      .onConflictDoUpdate({
        target: [votes.userId, votes.gameId],
        set: { value: 1 },
      });
    revalidatePath(`/games/${gameId}`);
    revalidatePath("/leaderboards");
  } else if (action === "dislike") {
    await db
      .insert(userExcludedGames)
      .values({ userId: user.id, rawgId })
      .onConflictDoNothing();
  } else if (action === "wishlist") {
    // Idempotent — re-wishlisting via swipe is a no-op rather than a toggle.
    await db
      .insert(userWishlist)
      .values({ userId: user.id, rawgId })
      .onConflictDoNothing();
  }

  revalidatePath("/swipe");
  revalidatePath("/recommendations");
  revalidatePath("/profile");

  const used = await getSwipesUsedToday(user.id);
  return {
    ok: true as const,
    creditsUsedToday: used,
    dailyCap: MAX_DAILY_SWIPES,
  };
}

// Fetches the next batch of swipe cards. Mixes local + RAWG fallback the same
// way /recommendations does. Returns up to `count` cards.
const fetchSchema = z.object({ count: z.number().int().min(1).max(40) });

export type SwipeCard = {
  rawgId: number;
  gameId: string | null; // null when this is a RAWG-only catalog match
  title: string;
  coverUrl: string | null;
  released: string | null;
  genres: string[];
  tags: string[];
  matchScore: number | null;
};

export async function fetchSwipeQueue(input: z.input<typeof fetchSchema>) {
  const parsed = fetchSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input.", cards: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in.", cards: [] };

  // Pull a wider pool than we need and shuffle so the deck rotates picks from
  // the user's top-matched tier instead of always serving the same top-N.
  // Combined with excludeSwiped this is what makes the Refresh button useful.
  const pool: RecommendationRow[] = await loadLocalRecommendations(
    user.id,
    parsed.data.count * 2,
    { excludeSwiped: true },
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const local = pool.slice(0, parsed.data.count);

  const cards: SwipeCard[] = local.map((g) => ({
    rawgId: g.rawg_id,
    gameId: g.id,
    title: g.title,
    coverUrl: g.cover_url,
    released: g.released,
    genres: g.genres,
    tags: g.tags,
    matchScore: g.match_score,
  }));

  // RAWG fallback if we didn't get enough.
  if (cards.length < parsed.data.count) {
    const favRows = await db
      .select({ name: userGenres.genre })
      .from(userGenres)
      .where(eq(userGenres.userId, user.id));
    const favGenres = favRows.map((r) => r.name);
    if (favGenres.length) {
      // Every rawg_id the user has already swiped on. We pass this to RAWG
      // *and* re-check client-side because RAWG's exclude_games is unreliable
      // (it often scopes to the current page rather than the whole catalog).
      const priorSwipes = await db
        .select({ rawgId: swipes.rawgId })
        .from(swipes)
        .where(eq(swipes.userId, user.id));
      const swipedSet = new Set(priorSwipes.map((r) => r.rawgId));
      const seen = new Set(cards.map((c) => c.rawgId));

      // Paginate. A user with a small favorite genre will have already seen
      // RAWG's top page after a couple of refresh cycles; without this loop
      // they'd get back the same top-rated games on every visit.
      const MAX_PAGES = 5;
      for (let page = 1; page <= MAX_PAGES; page++) {
        if (cards.length >= parsed.data.count) break;
        let raw;
        try {
          raw = await browseByGenres({
            genreNames: favGenres,
            // Send a hint to RAWG, but trust the client-side filter below.
            excludeIds: [...seen, ...swipedSet],
            limit: 40,
            page,
          });
        } catch {
          break; // RAWG outage — return what we have so far.
        }
        if (!raw.length) break; // out of catalog
        let addedFromThisPage = 0;
        for (const g of raw) {
          if (cards.length >= parsed.data.count) break;
          if (seen.has(g.rawgId)) continue;
          if (swipedSet.has(g.rawgId)) continue;
          cards.push({
            rawgId: g.rawgId,
            gameId: null,
            title: g.title,
            coverUrl: g.coverUrl,
            released: g.released,
            genres: g.genres,
            tags: [],
            matchScore: null,
          });
          seen.add(g.rawgId);
          addedFromThisPage++;
        }
        // If every result was filtered out: a full page means we've seen
        // RAWG's top tier and the next page might have new entries, so keep
        // going. A short page means RAWG is out of catalog for this genre.
        if (addedFromThisPage === 0 && raw.length < 40) break;
      }
    }
  }

  return { ok: true as const, cards };
}

// Convenience for the page action button (used when user empties the deck and
// wants to refetch without a full page reload). Just calls revalidatePath.
export async function refreshSwipeQueue() {
  revalidatePath("/swipe");
  return { ok: true as const };
}
