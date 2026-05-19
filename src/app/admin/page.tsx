import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { games, profiles, reviews } from "@/lib/db/schema";
import { defaultReviewCredits } from "@/lib/credits";
import { isInDepthReview } from "@/lib/reviews";
import { ModerationButtons } from "./moderation-buttons";

export const metadata = { title: "Moderation · NextQuest" };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [me] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.id, user.id));
  if (!me?.isAdmin) notFound();

  const pending = await db
    .select({
      id: reviews.id,
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
      createdAt: reviews.createdAt,
      username: profiles.username,
      gameId: games.id,
      gameTitle: games.title,
    })
    .from(reviews)
    .innerJoin(profiles, eq(profiles.id, reviews.userId))
    .innerJoin(games, eq(games.id, reviews.gameId))
    .where(eq(reviews.status, "pending"))
    .orderBy(desc(reviews.createdAt))
    .limit(100);

  return (
    <div className="space-y-8 py-2">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-pixel text-[10px] tracking-widest text-neon-cyan neon-cyan">
            ── ADMIN ──
          </p>
          <h1 className="heading-pixel mt-3 text-xl sm:text-2xl">MODERATION QUEUE</h1>
          <p className="font-terminal mt-2 text-lg text-violet-300/70">
            {pending.length === 0
              ? "Queue empty. Nice."
              : `${pending.length} review${pending.length === 1 ? "" : "s"} awaiting review.`}
          </p>
        </div>
        <span className="font-pixel hidden text-[10px] tracking-widest text-violet-400/70 sm:inline">
          P1 <span className="blink text-neon-green">●</span> ADMIN
        </span>
      </header>

      {pending.length === 0 ? (
        <div className="font-terminal border-2 border-violet-900/60 bg-[#0a0c18]/60 p-10 text-center text-xl text-violet-300/70">
          ─── ALL CLEAR ───
          <br />
          <span className="text-base text-violet-400/60">
            New submissions will appear here pending your call.
          </span>
        </div>
      ) : (
        <ul className="space-y-4">
          {pending.map((r) => (
            <li
              key={r.id}
              className="border-2 border-amber-700/50 bg-[#0a0c18]/70 p-5 transition-colors hover:border-amber-500/70"
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <Link
                    href={`/games/${r.gameId}`}
                    className="font-pixel text-sm text-violet-100 hover:text-neon-cyan"
                  >
                    {r.gameTitle}
                  </Link>
                  <span className="font-terminal text-lg text-violet-300/70">
                    by {r.username}
                  </span>
                  <span className="font-pixel border border-amber-500/60 px-1.5 py-0.5 text-[9px] tracking-widest text-amber-300">
                    PENDING
                  </span>
                </div>
                <span className="font-pixel text-[10px] tracking-widest text-neon-gold neon-gold">
                  {r.rating}/10
                </span>
              </div>
              {(r.gameplayRating != null ||
                r.narrativeRating != null ||
                r.designRating != null) && (
                <div className="font-terminal mb-2 text-base text-violet-300/80">
                  {[
                    r.gameplayRating != null && `Gameplay ${r.gameplayRating}`,
                    r.narrativeRating != null && `Narrative ${r.narrativeRating}`,
                    r.designRating != null && `Design ${r.designRating}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}
              <div className="font-terminal mb-3 text-base text-violet-400/70">
                {[r.platform, r.length].filter(Boolean).join(" · ")}
                {r.playstyle.length > 0 && <span> · {r.playstyle.join(", ")}</span>}
                <span className="ml-2 text-violet-500/60">
                  · submitted {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
              {r.body && (
                <p className="font-terminal mb-4 text-xl leading-snug text-violet-100/90 whitespace-pre-wrap">
                  {r.body}
                </p>
              )}
              {(r.gameplayNotes || r.narrativeNotes || r.designNotes) && (
                <div className="font-terminal mb-4 space-y-2 border-l-2 border-violet-900/60 pl-3 text-lg text-violet-200/90">
                  {r.gameplayNotes && (
                    <div>
                      <div className="font-pixel text-[10px] tracking-widest text-violet-300/80">
                        GAMEPLAY
                      </div>
                      <p className="whitespace-pre-wrap">{r.gameplayNotes}</p>
                    </div>
                  )}
                  {r.narrativeNotes && (
                    <div>
                      <div className="font-pixel text-[10px] tracking-widest text-violet-300/80">
                        NARRATIVE
                      </div>
                      <p className="whitespace-pre-wrap">{r.narrativeNotes}</p>
                    </div>
                  )}
                  {r.designNotes && (
                    <div>
                      <div className="font-pixel text-[10px] tracking-widest text-violet-300/80">
                        DESIGN
                      </div>
                      <p className="whitespace-pre-wrap">{r.designNotes}</p>
                    </div>
                  )}
                </div>
              )}
              <ModerationButtons
                reviewId={r.id}
                defaultCredits={defaultReviewCredits(isInDepthReview(r))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
