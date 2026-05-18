"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, userGenres, userPlaystyles } from "@/lib/db/schema";
import { and, eq, notInArray } from "drizzle-orm";
import { GENRES, PLAYSTYLES } from "@/lib/constants";

const schema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  genres: z.array(z.enum(GENRES)),
  playstyles: z.array(z.enum(PLAYSTYLES)),
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

  try {
    await db
      .insert(profiles)
      .values({ id: user.id, username: parsed.data.username })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { username: parsed.data.username },
      });

    const desiredGenres = parsed.data.genres;
    if (desiredGenres.length) {
      await db
        .insert(userGenres)
        .values(desiredGenres.map((g) => ({ userId: user.id, genre: g })))
        .onConflictDoNothing();
      await db
        .delete(userGenres)
        .where(and(eq(userGenres.userId, user.id), notInArray(userGenres.genre, desiredGenres)));
    } else {
      await db.delete(userGenres).where(eq(userGenres.userId, user.id));
    }

    const desiredPlaystyles = parsed.data.playstyles;
    if (desiredPlaystyles.length) {
      await db
        .insert(userPlaystyles)
        .values(desiredPlaystyles.map((p) => ({ userId: user.id, playstyle: p })))
        .onConflictDoNothing();
      await db
        .delete(userPlaystyles)
        .where(
          and(
            eq(userPlaystyles.userId, user.id),
            notInArray(userPlaystyles.playstyle, desiredPlaystyles),
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
