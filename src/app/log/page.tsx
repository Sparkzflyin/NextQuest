import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { canonicalPlaystyles, games, reviews } from "@/lib/db/schema";
import { fetchGame } from "@/lib/rawg";
import { createClient } from "@/lib/supabase/server";
import type { RawgPickedGame } from "@/components/game-search";
import { LogGameForm, type InitialReview } from "./log-game-form";

export default async function LogPage({
  searchParams,
}: {
  // gameId — preload the user's existing review for that game (edit mode).
  // rawgId — preload the picked game (no existing review).
  searchParams: Promise<{ rawgId?: string; gameId?: string }>;
}) {
  const { rawgId, gameId } = await searchParams;
  const rows = await db
    .select({ name: canonicalPlaystyles.name })
    .from(canonicalPlaystyles)
    .orderBy(asc(canonicalPlaystyles.name));

  let initialPicked: RawgPickedGame | null = null;
  let initialReview: InitialReview | null = null;
  let isEdit = false;

  if (gameId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const [game] = await db.select().from(games).where(eq(games.id, gameId));
      if (game) {
        initialPicked = {
          rawgId: game.rawgId,
          slug: game.slug,
          title: game.title,
          coverUrl: game.coverUrl,
          released: game.released,
          genres: game.genres,
        };
        const [existing] = await db
          .select()
          .from(reviews)
          .where(and(eq(reviews.gameId, game.id), eq(reviews.userId, user.id)));
        if (existing) {
          isEdit = true;
          initialReview = {
            rating: existing.rating,
            gameplayRating: existing.gameplayRating,
            narrativeRating: existing.narrativeRating,
            designRating: existing.designRating,
            gameplayNotes: existing.gameplayNotes ?? "",
            narrativeNotes: existing.narrativeNotes ?? "",
            designNotes: existing.designNotes ?? "",
            difficulty: existing.difficulty ?? 3,
            length: (existing.length ?? "medium") as InitialReview["length"],
            platform: (existing.platform ?? "PC") as InitialReview["platform"],
            playstyle: existing.playstyle,
            body: existing.body ?? "",
          };
        }
      }
    }
  } else if (rawgId && /^\d+$/.test(rawgId)) {
    try {
      const meta = await fetchGame(Number(rawgId));
      initialPicked = {
        rawgId: meta.rawgId,
        slug: meta.slug,
        title: meta.title,
        coverUrl: meta.coverUrl,
        released: meta.released,
        genres: meta.genres,
      };
    } catch {
      // Bad rawgId or RAWG outage — fall through and let the user search manually.
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="mb-1 text-2xl font-semibold">{isEdit ? "Edit your log" : "Log a game"}</h1>
      <p className="mb-8 text-sm text-neutral-400">
        {isEdit
          ? "Your edits go back to moderation before they appear publicly."
          : "Tell us about a game you played. Your rating helps shape its leaderboard position; the traits help us recommend others like it."}
      </p>
      <LogGameForm
        allPlaystyles={rows.map((r) => r.name)}
        initialPicked={initialPicked}
        initialReview={initialReview}
        lockGame={isEdit}
      />
    </div>
  );
}
