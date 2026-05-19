"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  profiles,
  userGenres,
  userPlaystyles,
  userExcludedGenres,
  userExcludedTags,
  userCurrentlyPlaying,
  canonicalGenres,
  games,
} from "@/lib/db/schema";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { fetchGame } from "@/lib/rawg";
import { sanitizeTag } from "@/lib/tags";

const schema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  // Tag arrays come in as free strings; we sanitize and validate below
  // (genres must be canonical, playstyles can be custom).
  genres: z.array(z.string()),
  playstyles: z.array(z.string()),
  excludedGenres: z.array(z.string()),
  excludedTags: z.array(z.string()),
});

export async function saveProfile(input: {
  username: string;
  genres: string[];
  playstyles: string[];
  excludedGenres: string[];
  excludedTags: string[];
}) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  // Genres: must be from canonical_genres. Reject anything not on that list
  // — users can't invent genres (only RAWG can grow that vocabulary).
  const cleanedGenres = Array.from(
    new Set(parsed.data.genres.map(sanitizeTag).filter(Boolean)),
  );
  const cleanedExcludedGenres = Array.from(
    new Set(parsed.data.excludedGenres.map(sanitizeTag).filter(Boolean)),
  );
  const allCandidateGenres = Array.from(new Set([...cleanedGenres, ...cleanedExcludedGenres]));
  let allowedGenreSet = new Set<string>();
  if (allCandidateGenres.length) {
    const rows = await db
      .select({ name: canonicalGenres.name })
      .from(canonicalGenres)
      .where(inArray(canonicalGenres.name, allCandidateGenres));
    allowedGenreSet = new Set(rows.map((r) => r.name));
  }
  const allowedGenres = cleanedGenres.filter((g) => allowedGenreSet.has(g));
  const allowedExcludedGenres = cleanedExcludedGenres.filter((g) => allowedGenreSet.has(g));

  // Playstyles + excluded tags: any sanitized tag is allowed (user can create new ones).
  // We dedupe case-insensitively, preferring the user's exact spelling.
  const cleanedPlaystyles = dedupeCaseInsensitive(
    parsed.data.playstyles.map(sanitizeTag).filter(Boolean),
  );
  const cleanedExcludedTags = dedupeCaseInsensitive(
    parsed.data.excludedTags.map(sanitizeTag).filter(Boolean),
  );

  try {
    await db
      .insert(profiles)
      .values({ id: user.id, username: parsed.data.username })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { username: parsed.data.username },
      });

    await syncSet(userGenres, "genre", allowedGenres, user.id);
    await syncSet(userPlaystyles, "playstyle", cleanedPlaystyles, user.id);
    await syncSet(userExcludedGenres, "genre", allowedExcludedGenres, user.id);
    await syncSet(userExcludedTags, "tag", cleanedExcludedTags, user.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error.";
    return { ok: false as const, error: msg };
  }

  revalidatePath("/profile");
  revalidatePath("/recommendations");
  return { ok: true as const };
}

// Inline helper — narrow but typesafe enough for the four tables we use it on.
// Each has shape { userId, <col> }.
async function syncSet<T extends "genre" | "playstyle" | "tag">(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  col: T,
  values: string[],
  userId: string,
) {
  if (values.length) {
    await db
      .insert(table)
      .values(values.map((v) => ({ userId, [col]: v })))
      .onConflictDoNothing();
    await db
      .delete(table)
      .where(and(eq(table.userId, userId), notInArray(table[col], values)));
  } else {
    await db.delete(table).where(eq(table.userId, userId));
  }
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

// ── currently-playing dashboard ──
// Upserts the RAWG game into local catalog (same path as logGame) so the
// list can link to /games/<id>. No-ops if the user already has it.
const addCurrentlySchema = z.object({ rawgId: z.number().int().positive() });

export async function addCurrentlyPlaying(input: z.input<typeof addCurrentlySchema>) {
  const parsed = addCurrentlySchema.safeParse(input);
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
      .insert(userCurrentlyPlaying)
      .values({ userId: user.id, gameId: game.id })
      .onConflictDoNothing();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error.";
    return { ok: false as const, error: msg };
  }

  revalidatePath("/profile");
  return { ok: true as const };
}

const removeCurrentlySchema = z.object({ gameId: z.string().uuid() });

export async function removeCurrentlyPlaying(input: z.input<typeof removeCurrentlySchema>) {
  const parsed = removeCurrentlySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  await db
    .delete(userCurrentlyPlaying)
    .where(
      and(
        eq(userCurrentlyPlaying.userId, user.id),
        eq(userCurrentlyPlaying.gameId, parsed.data.gameId),
      ),
    );

  revalidatePath("/profile");
  return { ok: true as const };
}
