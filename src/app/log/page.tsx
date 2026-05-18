import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { canonicalPlaystyles } from "@/lib/db/schema";
import { fetchGame } from "@/lib/rawg";
import type { RawgPickedGame } from "@/components/game-search";
import { LogGameForm } from "./log-game-form";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ rawgId?: string }>;
}) {
  const { rawgId } = await searchParams;
  const rows = await db
    .select({ name: canonicalPlaystyles.name })
    .from(canonicalPlaystyles)
    .orderBy(asc(canonicalPlaystyles.name));

  let initialPicked: RawgPickedGame | null = null;
  if (rawgId && /^\d+$/.test(rawgId)) {
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
      <h1 className="mb-1 text-2xl font-semibold">Log a game</h1>
      <p className="mb-8 text-sm text-neutral-400">
        Tell us about a game you played. Your rating helps shape its leaderboard position; the
        traits help us recommend others like it.
      </p>
      <LogGameForm allPlaystyles={rows.map((r) => r.name)} initialPicked={initialPicked} />
    </div>
  );
}
