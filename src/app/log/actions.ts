"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { games, reviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchGame } from "@/lib/rawg";
import { LENGTHS, PLATFORMS, PLAYSTYLES } from "@/lib/constants";

const schema = z.object({
  rawgId: z.number().int().positive(),
  rating: z.number().int().min(1).max(10),
  difficulty: z.number().int().min(1).max(5),
  length: z.enum(LENGTHS),
  platform: z.enum(PLATFORMS),
  playstyle: z.array(z.enum(PLAYSTYLES)),
  body: z.string().max(2000).nullable(),
});

export async function logGame(input: z.input<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  try {
    let [game] = await db.select().from(games).where(eq(games.rawgId, parsed.data.rawgId));
    if (!game) {
      const meta = await fetchGame(parsed.data.rawgId);
      [game] = await db
        .insert(games)
        .values({
          rawgId: meta.rawgId,
          slug: meta.slug,
          title: meta.title,
          coverUrl: meta.coverUrl,
          released: meta.released,
          genres: meta.genres,
          tags: meta.tags,
        })
        .onConflictDoUpdate({
          target: games.rawgId,
          set: { title: meta.title, coverUrl: meta.coverUrl, genres: meta.genres, tags: meta.tags },
        })
        .returning();
    }

    await db
      .insert(reviews)
      .values({
        userId: user.id,
        gameId: game.id,
        rating: parsed.data.rating,
        difficulty: parsed.data.difficulty,
        length: parsed.data.length,
        platform: parsed.data.platform,
        playstyle: parsed.data.playstyle,
        body: parsed.data.body,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: [reviews.userId, reviews.gameId],
        set: {
          rating: parsed.data.rating,
          difficulty: parsed.data.difficulty,
          length: parsed.data.length,
          platform: parsed.data.platform,
          playstyle: parsed.data.playstyle,
          body: parsed.data.body,
          // Edits re-queue the review for moderation so an approved entry can't be silently rewritten.
          status: "pending",
          moderatedAt: null,
          moderatedBy: null,
        },
      });

    revalidatePath(`/games/${game.id}`);
    revalidatePath("/leaderboards");
    return { ok: true as const, gameId: game.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error.";
    return { ok: false as const, error: msg };
  }
}
