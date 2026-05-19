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
import { getResend, emailFrom } from "@/lib/email";

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

// Defense-in-depth notification: after a password change succeeds (whether via
// the authenticated change flow OR a reset link), email the user-on-file so a
// password-only attacker can't silently rotate the password without the owner
// noticing. Fire-and-forget from the caller — email failures don't undo the
// password change.
export async function notifyPasswordChange() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Not signed in." };

  const resend = getResend();
  if (!resend) {
    console.warn("[notifyPasswordChange] RESEND_API_KEY not set — skipping email.");
    return { ok: false as const, error: "Email not configured." };
  }

  const when = new Date().toUTCString();
  const { error } = await resend.emails.send({
    from: emailFrom(),
    to: user.email,
    subject: "Your NextQuest password was changed",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;line-height:1.5;color:#111">
        <h2 style="margin:0 0 12px">Password changed</h2>
        <p>Your NextQuest password was just changed on <strong>${when}</strong>.</p>
        <p>If this was you, no action is needed.</p>
        <p><strong>If you don't recognize this change</strong>, your account may be compromised.
          Reset your password right away at
          <a href="https://nextquests.com/forgot-password">nextquests.com/forgot-password</a>
          — the reset link goes to this inbox, so an attacker can't lock you out as long as
          you control this email address.</p>
        <p style="color:#777;font-size:12px;margin-top:24px">You're receiving this because your password just changed on an account registered to ${user.email}.</p>
      </div>
    `,
    text: `Your NextQuest password was just changed on ${when}. If this wasn't you, reset it at https://nextquests.com/forgot-password — the reset link will come to this inbox.`,
  });
  if (error) {
    console.error("[notifyPasswordChange] resend error:", error);
    return { ok: false as const, error: error.message };
  }
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
