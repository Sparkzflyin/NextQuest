import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { canonicalGenres, games, votes } from "@/lib/db/schema";

export default async function GenreLeaderboard({ params }: { params: Promise<{ genre: string }> }) {
  const { genre: raw } = await params;
  const genre = decodeURIComponent(raw);
  const [exists] = await db
    .select({ name: canonicalGenres.name })
    .from(canonicalGenres)
    .where(eq(canonicalGenres.name, genre))
    .limit(1);
  if (!exists) notFound();

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
    .where(sql`${genre} = ANY(${games.genres})`)
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
                className="flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3 hover:border-violet-500"
              >
                <span className="w-8 text-center font-mono text-lg text-neutral-500">
                  {i + 1}
                </span>
                {g.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.coverUrl}
                    alt=""
                    className="h-14 w-20 rounded object-cover"
                  />
                ) : (
                  <div className="h-14 w-20 rounded bg-neutral-800" />
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
