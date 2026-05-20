"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { games, reviews, canonicalGenres } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchGame } from "@/lib/rawg";
import { LENGTHS, PLATFORMS } from "@/lib/constants";
import { sanitizeTag } from "@/lib/tags";
import { isNsfwFromRawg } from "@/lib/nsfw";

const schema = z.object({
  rawgId: z.number().int().positive(),
  rating: z.number().int().min(1).max(10),
  // Optional per-axis subscores. Null means "reviewer didn't break it down."
  gameplayRating: z.number().int().min(1).max(10).nullable(),
  narrativeRating: z.number().int().min(1).max(10).nullable(),
  designRating: z.number().int().min(1).max(10).nullable(),
  // Optional per-axis notes. Empty-ish strings get coerced to null below so
  // the in-depth bonus check (≥ 40 chars) stays honest.
  gameplayNotes: z.string().max(1000).nullable(),
  narrativeNotes: z.string().max(1000).nullable(),
  designNotes: z.string().max(1000).nullable(),
  difficulty: z.number().int().min(1).max(5),
  length: z.enum(LENGTHS),
  platform: z.enum(PLATFORMS),
  // Free-text tags; sanitized below. Users can create their own — popular ones
  // get promoted into canonical_playstyles by the admin approve action.
  playstyle: z.array(z.string()),
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

  // Sanitize + dedupe playstyle tags before they hit the DB.
  const cleanedPlaystyles = dedupeCaseInsensitive(
    parsed.data.playstyle.map(sanitizeTag).filter(Boolean),
  );

  try {
    let [game] = await db.select().from(games).where(eq(games.rawgId, parsed.data.rawgId));
    if (!game) {
      const meta = await fetchGame(parsed.data.rawgId);
      const isNsfw = isNsfwFromRawg({ genres: meta.genres, tags: meta.tags });
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
          isNsfw,
        })
        .onConflictDoUpdate({
          target: games.rawgId,
          set: {
            title: meta.title,
            coverUrl: meta.coverUrl,
            genres: meta.genres,
            tags: meta.tags,
            isNsfw,
          },
        })
        .returning();

      // Path 2: any RAWG-returned genre we haven't seen before joins the canonical
      // list automatically. RAWG is curated, no threshold needed.
      if (meta.genres.length) {
        await db
          .insert(canonicalGenres)
          .values(meta.genres.map((name) => ({ name })))
          .onConflictDoNothing();
      }
    }

    // Empty/whitespace-only notes collapse to null so the bonus check can't be
    // gamed with a 40-character blob of spaces.
    const gameplayNotes = blankToNull(parsed.data.gameplayNotes);
    const narrativeNotes = blankToNull(parsed.data.narrativeNotes);
    const designNotes = blankToNull(parsed.data.designNotes);

    await db
      .insert(reviews)
      .values({
        userId: user.id,
        gameId: game.id,
        rating: parsed.data.rating,
        gameplayRating: parsed.data.gameplayRating,
        narrativeRating: parsed.data.narrativeRating,
        designRating: parsed.data.designRating,
        gameplayNotes,
        narrativeNotes,
        designNotes,
        difficulty: parsed.data.difficulty,
        length: parsed.data.length,
        platform: parsed.data.platform,
        playstyle: cleanedPlaystyles,
        body: parsed.data.body,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: [reviews.userId, reviews.gameId],
        set: {
          rating: parsed.data.rating,
          gameplayRating: parsed.data.gameplayRating,
          narrativeRating: parsed.data.narrativeRating,
          designRating: parsed.data.designRating,
          gameplayNotes,
          narrativeNotes,
          designNotes,
          difficulty: parsed.data.difficulty,
          length: parsed.data.length,
          platform: parsed.data.platform,
          playstyle: cleanedPlaystyles,
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

function blankToNull(value: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function dedupeCaseInsensitive(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}
