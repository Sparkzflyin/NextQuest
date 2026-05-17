import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { games, reviews, votes, profiles } from "@/lib/db/schema";
import { eq, sum, count, desc, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { VoteButtons } from "@/components/vote-buttons";
import { Card } from "@/components/ui/card";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [game] = await db.select().from(games).where(eq(games.id, id));
  if (!game) notFound();

  const [tally] = await db
    .select({ score: sum(votes.value).mapWith(Number), n: count() })
    .from(votes)
    .where(eq(votes.gameId, id));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myVote: -1 | 0 | 1 = 0;
  if (user) {
    const [mine] = await db
      .select({ value: votes.value })
      .from(votes)
      .where(and(eq(votes.userId, user.id), eq(votes.gameId, id)));
    if (mine) myVote = mine.value === 1 ? 1 : -1;
  }

  const reviewRows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      body: reviews.body,
      length: reviews.length,
      platform: reviews.platform,
      playstyle: reviews.playstyle,
      createdAt: reviews.createdAt,
      username: profiles.username,
    })
    .from(reviews)
    .innerJoin(profiles, eq(profiles.id, reviews.userId))
    .where(eq(reviews.gameId, id))
    .orderBy(desc(reviews.createdAt))
    .limit(50);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        {game.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.coverUrl}
            alt=""
            className="h-48 w-full rounded-lg object-cover sm:h-56 sm:w-80"
          />
        )}
        <div className="flex-1 space-y-3">
          <h1 className="text-3xl font-bold">{game.title}</h1>
          <p className="text-sm text-neutral-400">
            {game.released ?? "—"}
            {game.genres.length > 0 && <> · {game.genres.join(", ")}</>}
          </p>
          <div className="flex items-center gap-4">
            <VoteButtons
              gameId={game.id}
              initialScore={tally?.score ?? 0}
              initialMyVote={myVote}
              signedIn={!!user}
            />
            <span className="text-sm text-neutral-500">{tally?.n ?? 0} votes</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {game.genres.map((g) => (
              <Link
                key={g}
                href={`/leaderboards/${encodeURIComponent(g)}`}
                className="rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs text-neutral-300 hover:border-violet-500"
              >
                {g}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Player logs</h2>
        {reviewRows.length === 0 ? (
          <p className="text-sm text-neutral-500">No logs yet. Be the first.</p>
        ) : (
          <div className="space-y-3">
            {reviewRows.map((r) => (
              <Card key={r.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-200">{r.username}</span>
                  <span className="font-mono text-sm text-violet-300">{r.rating}/10</span>
                </div>
                <div className="mb-2 text-xs text-neutral-500">
                  {[r.platform, r.length].filter(Boolean).join(" · ")}
                  {r.playstyle.length > 0 && (
                    <span> · {r.playstyle.join(", ")}</span>
                  )}
                </div>
                {r.body && <p className="text-sm text-neutral-300">{r.body}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
