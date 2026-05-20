import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { canonicalGenres, games, profiles, votes } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export default async function GenreLeaderboard({ params }: { params: Promise<{ genre: string }> }) {
  const { genre: raw } = await params;
  const genre = decodeURIComponent(raw);
  const [exists] = await db
    .select({ name: canonicalGenres.name })
    .from(canonicalGenres)
    .where(eq(canonicalGenres.name, genre))
    .limit(1);
  if (!exists) notFound();

  // Same gate as the leaderboard index — anonymous and opted-out users get the
  // safe view; only an explicit allowNsfw=true unlocks adult titles.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let allowNsfw = false;
  if (user) {
    const [row] = await db
      .select({ allowNsfw: profiles.allowNsfw })
      .from(profiles)
      .where(eq(profiles.id, user.id));
    allowNsfw = row?.allowNsfw ?? false;
  }

  const whereClause = allowNsfw
    ? sql`${genre} = ANY(${games.genres})`
    : and(sql`${genre} = ANY(${games.genres})`, eq(games.isNsfw, false));

  const rows = await db
    .select({
      id: games.id,
      title: games.title,
      coverUrl: games.coverUrl,
      genres: games.genres,
      score: sql<number>`coalesce(sum(${votes.value}), 0)::int`,
      voteCount: sql<number>`count(${votes.userId})::int`,
    })
    .from(games)
    .leftJoin(votes, sql`${votes.gameId} = ${games.id}`)
    .where(whereClause)
    .groupBy(games.id)
    .orderBy(sql`coalesce(sum(${votes.value}), 0) desc`, sql`count(${votes.userId}) desc`)
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="text-violet-400">{genre}</span> · Top 20
        </h1>
        <p className="text-sm text-neutral-400">Ranked by net upvotes.</p>
        {!allowNsfw && (
          <p className="mt-2 text-xs text-red-300/80">
            Adult content hidden ·{" "}
            {user ? (
              <Link href="/profile" className="underline hover:text-red-200">
                manage in profile
              </Link>
            ) : (
              <Link href="/login" className="underline hover:text-red-200">
                sign in to manage
              </Link>
            )}
          </p>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No games logged in this genre yet.{" "}
          <Link href="/log" className="text-violet-400 hover:underline">
            Be the first to log one.
          </Link>
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((g, i) => (
            <li key={g.id}>
              <Link
                href={`/games/${g.id}`}
                className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3 hover:border-violet-500 sm:gap-4"
              >
                <span className="w-6 text-center font-mono text-base text-neutral-500 sm:w-8 sm:text-lg">
                  {i + 1}
                </span>
                {g.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.coverUrl}
                    alt=""
                    className="h-12 w-16 rounded object-cover sm:h-14 sm:w-20"
                  />
                ) : (
                  <div className="h-12 w-16 rounded bg-neutral-800 sm:h-14 sm:w-20" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{g.title}</div>
                  <div className="truncate text-xs text-neutral-500">
                    {g.genres.join(", ")}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={
                      g.score > 0
                        ? "font-mono text-emerald-400"
                        : g.score < 0
                          ? "font-mono text-red-400"
                          : "font-mono text-neutral-400"
                    }
                  >
                    {g.score > 0 ? `+${g.score}` : g.score}
                  </div>
                  <div className="text-xs text-neutral-500">{g.voteCount} votes</div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
