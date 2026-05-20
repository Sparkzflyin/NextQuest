import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { games, reviews, votes, profiles } from "@/lib/db/schema";
import { eq, sum, count, desc, and, or } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { isInDepthReview } from "@/lib/reviews";
import { cn } from "@/lib/utils";
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
  let viewerIsAdmin = false;
  if (user) {
    const [mine] = await db
      .select({ value: votes.value })
      .from(votes)
      .where(and(eq(votes.userId, user.id), eq(votes.gameId, id)));
    if (mine) myVote = mine.value === 1 ? 1 : -1;
    const [me] = await db
      .select({ isAdmin: profiles.isAdmin })
      .from(profiles)
      .where(eq(profiles.id, user.id));
    viewerIsAdmin = !!me?.isAdmin;
  }

  // Privacy filter for reviews: hide private reviewers from everyone except
  // themselves and admins. Stacks with the existing status filter so a private
  // user still sees their own pending/rejected logs.
  const statusFilter = user
    ? or(eq(reviews.status, "approved"), eq(reviews.userId, user.id))!
    : eq(reviews.status, "approved");
  const privacyFilter = viewerIsAdmin
    ? undefined
    : user
      ? or(eq(profiles.isPrivate, false), eq(reviews.userId, user.id))!
      : eq(profiles.isPrivate, false);

  const reviewRows = await db
    .select({
      id: reviews.id,
      userId: reviews.userId,
      rating: reviews.rating,
      gameplayRating: reviews.gameplayRating,
      narrativeRating: reviews.narrativeRating,
      designRating: reviews.designRating,
      gameplayNotes: reviews.gameplayNotes,
      narrativeNotes: reviews.narrativeNotes,
      designNotes: reviews.designNotes,
      body: reviews.body,
      length: reviews.length,
      platform: reviews.platform,
      playstyle: reviews.playstyle,
      status: reviews.status,
      createdAt: reviews.createdAt,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
    })
    .from(reviews)
    .innerJoin(profiles, eq(profiles.id, reviews.userId))
    .where(
      privacyFilter
        ? and(eq(reviews.gameId, id), statusFilter, privacyFilter)
        : and(eq(reviews.gameId, id), statusFilter),
    )
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
            <div className="flex flex-col items-start">
              <span
                className="text-[10px] uppercase tracking-widest text-neutral-500"
                title="Community thumbs up/down. Distinct from each reviewer's 1–10 rating."
              >
                Recommend?
              </span>
              <div className="flex items-center gap-3">
                <VoteButtons
                  gameId={game.id}
                  initialScore={tally?.score ?? 0}
                  initialMyVote={myVote}
                  signedIn={!!user}
                />
                <span className="text-sm text-neutral-500">
                  {tally?.n ?? 0} recommendation{(tally?.n ?? 0) === 1 ? "" : "s"}
                </span>
              </div>
            </div>
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
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Player logs</h2>
          <p className="text-xs text-neutral-500">
            <span className="text-violet-300">Rating</span> is each reviewer&apos;s 1–10 score.{" "}
            <span className="text-emerald-400">Recommend</span> is the community signal above.
          </p>
        </div>
        {reviewRows.length === 0 ? (
          <p className="text-sm text-neutral-500">No logs yet. Be the first.</p>
        ) : (
          <div className="space-y-3">
            {reviewRows.map((r) => {
              const isMine = !!user && r.userId === user.id;
              const subscores = [
                r.gameplayRating != null && `Gameplay ${r.gameplayRating}`,
                r.narrativeRating != null && `Narrative ${r.narrativeRating}`,
                r.designRating != null && `Design ${r.designRating}`,
              ].filter(Boolean) as string[];
              const axisNotes = [
                r.gameplayRating != null || r.gameplayNotes
                  ? { axis: "Gameplay", score: r.gameplayRating, note: r.gameplayNotes }
                  : null,
                r.narrativeRating != null || r.narrativeNotes
                  ? { axis: "Narrative", score: r.narrativeRating, note: r.narrativeNotes }
                  : null,
                r.designRating != null || r.designNotes
                  ? { axis: "Design", score: r.designRating, note: r.designNotes }
                  : null,
              ].filter((x): x is { axis: string; score: number | null; note: string | null } => !!x);
              const hasNotes = axisNotes.some((a) => a.note);
              const inDepth = isInDepthReview(r);
              return (
                <Card key={r.id} className="relative">
                  {inDepth && (
                    <span className="absolute right-3 top-3 rounded border border-emerald-500/70 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-300">
                      In Depth Review
                    </span>
                  )}
                  <div className={cn("mb-1 flex items-center justify-between gap-2", inDepth && "pr-32")}>
                    <span className="flex items-center gap-2 text-sm font-medium text-neutral-200">
                      <Link
                        href={`/users/${encodeURIComponent(r.username)}`}
                        className="group inline-flex items-center gap-2 hover:text-neon-cyan"
                      >
                        <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-violet-800/60 bg-neutral-900">
                          {r.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-pixel flex h-full w-full items-center justify-center text-[10px] text-violet-300/70">
                              {r.username.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="group-hover:underline">{r.username}</span>
                      </Link>
                      {isMine && (
                        <span className="rounded border border-violet-700/60 px-1.5 py-0.5 text-[9px] tracking-widest text-violet-200">
                          YOU
                        </span>
                      )}
                      {r.status === "pending" && (
                        <span className="font-pixel border border-amber-500/60 px-1.5 py-0.5 text-[9px] tracking-widest text-amber-300">
                          PENDING
                        </span>
                      )}
                      {r.status === "rejected" && (
                        <span className="font-pixel border border-red-500/60 px-1.5 py-0.5 text-[9px] tracking-widest text-red-300">
                          REJECTED
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-sm text-violet-300">{r.rating}/10</span>
                  </div>
                  {!hasNotes && subscores.length > 0 && (
                    <div className="mb-2 text-xs text-violet-300/80">{subscores.join(" · ")}</div>
                  )}
                  <div className="mb-2 text-xs text-neutral-500">
                    {[r.platform, r.length].filter(Boolean).join(" · ")}
                    {r.playstyle.length > 0 && <span> · {r.playstyle.join(", ")}</span>}
                  </div>
                  {r.body && <p className="text-sm text-neutral-300">{r.body}</p>}
                  {hasNotes && (
                    <div className="mt-3 space-y-2 border-l-2 border-violet-900/40 pl-3">
                      {axisNotes.map((a) => (
                        <div key={a.axis} className="space-y-0.5">
                          <div className="text-xs font-medium text-violet-300/90">
                            {a.axis}
                            {a.score != null && (
                              <span className="ml-1.5 font-mono text-neutral-500">
                                {a.score}/10
                              </span>
                            )}
                          </div>
                          {a.note && (
                            <p className="text-sm text-neutral-300 whitespace-pre-wrap">
                              {a.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {isMine && (
                    <div className="mt-3">
                      <Link
                        href={`/log?gameId=${game.id}`}
                        className="text-xs text-violet-400 hover:underline"
                      >
                        Edit your log
                      </Link>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
