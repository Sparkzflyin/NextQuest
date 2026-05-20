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
import { isNsfwFromRawg } from "@/lib/nsfw";

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
  allowNsfw: z.boolean(),
  isPrivate: z.boolean(),
});

export async function saveProfile(input: {
  username: string;
  genres: string[];
  playstyles: string[];
  excludedGenres: string[];
  excludedTags: string[];
  allowNsfw: boolean;
  isPrivate: boolean;
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
      .values({
        id: user.id,
        username: parsed.data.username,
        allowNsfw: parsed.data.allowNsfw,
        isPrivate: parsed.data.isPrivate,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          username: parsed.data.username,
          allowNsfw: parsed.data.allowNsfw,
          isPrivate: parsed.data.isPrivate,
        },
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
  revalidatePath("/swipe");
  revalidatePath("/leaderboards");
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

  const siteUrl = "https://nextquests.com";
  const { error } = await resend.emails.send({
    from: emailFrom(),
    to: user.email,
    subject: "Your NextQuest password was changed",
    html: passwordChangedHtml({ email: user.email, siteUrl }),
    text: `Your NextQuest password was just changed. If this wasn't you, secure your account at ${siteUrl}/login — the reset link will come to this inbox.`,
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

// Branded "password changed" notification template. Mirrors the styling of the
// Supabase auth email templates so all NextQuest mail reads consistently.
function passwordChangedHtml({ email, siteUrl }: { email: string; siteUrl: string }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your NextQuest password was changed</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0c18; color:#e5e5e5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0c18">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" align="center" style="max-width:560px; margin:0 auto;">

          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="font-family: 'Courier New', Courier, monospace; font-size:11px; letter-spacing:0.32em; color:#a78bfa; text-transform:uppercase;">
                &#9654; NEXTQUEST
              </div>
            </td>
          </tr>

          <tr>
            <td bgcolor="#0f1226" style="background-color:#0f1226; border:1px solid #2e1065; border-radius:8px; padding:36px 32px;">
              <h1 style="margin:0 0 12px 0; font-family: 'Courier New', Courier, monospace; font-size:22px; color:#ffffff; letter-spacing:0.04em;">
                Password updated.
              </h1>
              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#a3a3a3;">
                Your NextQuest account password was just changed. You&rsquo;re all set &mdash; sign in with the new one.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 28px 0;">
                <tr>
                  <td style="font-family: 'Courier New', Courier, monospace; font-size:12px; color:#737373; padding:10px 14px; background-color:#0a0c18; border:1px solid #1f1f3a; border-radius:4px;">
                    <span style="color:#525252;">ACCOUNT</span> &nbsp; ${email}
                  </td>
                </tr>
              </table>

              <div style="border-top:1px solid #2e1065; padding-top:20px;">
                <p style="margin:0 0 12px 0; font-size:13px; color:#fbbf24; font-family: 'Courier New', Courier, monospace; letter-spacing:0.08em; text-transform:uppercase;">
                  &#9888; Wasn&rsquo;t you?
                </p>
                <p style="margin:0 0 16px 0; font-size:13px; color:#a3a3a3; line-height:1.6;">
                  Someone may have access to your account. Reset your password immediately and review your sign-in methods.
                </p>
                <a href="${siteUrl}/login" style="display:inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:13px; font-weight:600; color:#22d3ee; text-decoration:none; border-bottom:1px solid #22d3ee; padding-bottom:1px;">
                  Secure my account &rarr;
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0 0 6px 0; font-size:11px; color:#525252; font-family: 'Courier New', Courier, monospace; letter-spacing:0.18em;">
                SENT FOR YOUR SECURITY.
              </p>
              <p style="margin:0; font-size:11px; color:#404040;">
                You can&rsquo;t reply &mdash; this mailbox isn&rsquo;t monitored.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
