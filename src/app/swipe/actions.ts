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

  const local: RecommendationRow[] = await loadLocalRecommendations(
    user.id,
    parsed.data.count,
    { excludeRecentSwipes: true },
  );

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
  const needed = parsed.data.count - cards.length;
  if (needed > 0) {
    const favRows = await db
      .select({ name: userGenres.genre })
      .from(userGenres)
      .where(eq(userGenres.userId, user.id));
    const favGenres = favRows.map((r) => r.name);
    if (favGenres.length) {
      try {
        const raw = await browseByGenres({
          genreNames: favGenres,
          excludeIds: cards.map((c) => c.rawgId),
          limit: needed * 2,
        });
        for (const g of raw) {
          if (cards.length >= parsed.data.count) break;
          if (cards.some((c) => c.rawgId === g.rawgId)) continue;
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
        }
      } catch {
        // RAWG outage — return what we have.
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
