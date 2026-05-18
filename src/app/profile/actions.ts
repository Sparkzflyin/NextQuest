"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  profiles,
  userGenres,
  userPlaystyles,
  canonicalGenres,
} from "@/lib/db/schema";
import { and, eq, inArray, notInArray } from "drizzle-orm";
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
});

export async function saveProfile(input: {
  username: string;
  genres: string[];
  playstyles: string[];
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
  let allowedGenres: string[] = [];
  if (cleanedGenres.length) {
    const rows = await db
      .select({ name: canonicalGenres.name })
      .from(canonicalGenres)
      .where(inArray(canonicalGenres.name, cleanedGenres));
    allowedGenres = rows.map((r) => r.name);
  }

  // Playstyles: any sanitized tag is allowed (user can create new ones).
  // We dedupe case-insensitively, preferring the user's exact spelling.
  const cleanedPlaystyles = dedupeCaseInsensitive(
    parsed.data.playstyles.map(sanitizeTag).filter(Boolean),
  );

  try {
    await db
      .insert(profiles)
      .values({ id: user.id, username: parsed.data.username })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { username: parsed.data.username },
      });

    if (allowedGenres.length) {
      await db
        .insert(userGenres)
        .values(allowedGenres.map((g) => ({ userId: user.id, genre: g })))
        .onConflictDoNothing();
      await db
        .delete(userGenres)
        .where(and(eq(userGenres.userId, user.id), notInArray(userGenres.genre, allowedGenres)));
    } else {
      await db.delete(userGenres).where(eq(userGenres.userId, user.id));
    }

    if (cleanedPlaystyles.length) {
      await db
        .insert(userPlaystyles)
        .values(cleanedPlaystyles.map((p) => ({ userId: user.id, playstyle: p })))
        .onConflictDoNothing();
      await db
        .delete(userPlaystyles)
        .where(
          and(
            eq(userPlaystyles.userId, user.id),
            notInArray(userPlaystyles.playstyle, cleanedPlaystyles),
          ),
        );
    } else {
      await db.delete(userPlaystyles).where(eq(userPlaystyles.userId, user.id));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error.";
    return { ok: false as const, error: msg };
  }

  revalidatePath("/profile");
  revalidatePath("/recommendations");
  return { ok: true as const };
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
