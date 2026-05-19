"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { games, userExcludedGames, userWishlist } from "@/lib/db/schema";
import { fetchGame } from "@/lib/rawg";

const rawgIdSchema = z.object({ rawgId: z.number().int().positive() });

// Lazy-load a RAWG description for a single game. Cache-first against the
// local games row: if we've already fetched this game's description before,
// return it without hitting RAWG. Cache miss falls through to RAWG and writes
// the result back so the second viewer never pays the network cost.
// RAWG-only cards (no local row) skip the write-back and rely on RAWG's own
// 1h Next-fetch cache for short-window repeats.
export async function fetchGameDescription(input: z.input<typeof rawgIdSchema>) {
  const parsed = rawgIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  const { rawgId } = parsed.data;

  const [cached] = await db
    .select({ id: games.id, description: games.description })
    .from(games)
    .where(eq(games.rawgId, rawgId));
  if (cached?.description) {
    return { ok: true as const, description: cached.description };
  }

  try {
    const game = await fetchGame(rawgId);
    // Write-through only when a local row exists. We don't fabricate rows for
    // RAWG-only catalog matches; those are created lazily by the /log flow.
    if (cached?.id && game.description) {
      await db
        .update(games)
        .set({ description: game.description })
        .where(eq(games.id, cached.id));
    }
    return { ok: true as const, description: game.description };
  } catch {
    return { ok: false as const, error: "Couldn't reach RAWG." };
  }
}

export async function markNotInterested(input: z.input<typeof rawgIdSchema>) {
  const parsed = rawgIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  await db
    .insert(userExcludedGames)
    .values({ userId: user.id, rawgId: parsed.data.rawgId })
    .onConflictDoNothing();
  revalidatePath("/recommendations");
  return { ok: true as const };
}

export async function toggleWishlist(input: z.input<typeof rawgIdSchema>) {
  const parsed = rawgIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const [existing] = await db
    .select()
    .from(userWishlist)
    .where(
      and(
        eq(userWishlist.userId, user.id),
        eq(userWishlist.rawgId, parsed.data.rawgId),
      ),
    );
  if (existing) {
    await db
      .delete(userWishlist)
      .where(
        and(
          eq(userWishlist.userId, user.id),
          eq(userWishlist.rawgId, parsed.data.rawgId),
        ),
      );
  } else {
    await db
      .insert(userWishlist)
      .values({ userId: user.id, rawgId: parsed.data.rawgId })
      .onConflictDoNothing();
  }
  revalidatePath("/recommendations");
  revalidatePath("/profile");
  return { ok: true as const, wishlisted: !existing };
}
