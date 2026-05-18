import Link from "next/link";
import { and, asc, count, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { canonicalGenres, reviews, votes } from "@/lib/db/schema";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let score = 0;
  if (user) {
    const [r] = await db
      .select({ n: count() })
      .from(reviews)
      .where(and(eq(reviews.userId, user.id), eq(reviews.status, "approved")));
    const [v] = await db
      .select({ n: count() })
      .from(votes)
      .where(eq(votes.userId, user.id));
    score = (r?.n ?? 0) + (v?.n ?? 0);
  }
  const scoreLabel = score.toString().padStart(4, "0");

  const genreRows = await db
    .select({ name: canonicalGenres.name })
    .from(canonicalGenres)
    .orderBy(asc(canonicalGenres.name));

  return (
    <>
      {/* CRT overlays: scoped to landing only, unmount on navigation */}
      <div className="pointer-events-none fixed inset-0 z-50">
        <div className="crt-scanlines" />
        <div className="crt-vignette" />
      </div>

      <div className="relative left-1/2 -my-8 w-screen -translate-x-1/2 overflow-hidden">
        {/* ── ATTRACT BAR ── */}
        <div className="font-pixel relative z-10 border-y border-violet-900/40 bg-[#0a0c18]/80 px-6 py-2 text-[10px] tracking-widest text-violet-300/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <span>
              <span className="text-neon-cyan neon-cyan">P1</span>
              <span className="mx-2 text-violet-700">▮</span>
              {user ? "READY" : "INSERT COIN"}
            </span>
            <span className="hidden sm:inline">
              HI-SCORE <span className="neon-gold">{scoreLabel}</span>
            </span>
            <span>
              CREDITS <span className="text-neon-cyan neon-cyan">{user ? "01" : "00"}</span>
            </span>
          </div>
        </div>

        {/* ── HERO / TITLE SCREEN ── */}
        <section className="bg-grid relative overflow-hidden">
          <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 text-center sm:pt-28 sm:pb-32">
            {/* corner brackets */}
            <span className="font-pixel text-neon-violet absolute top-6 left-6 text-xs opacity-70">
              ┌
            </span>
            <span className="font-pixel text-neon-violet absolute top-6 right-6 text-xs opacity-70">
              ┐
            </span>
            <span className="font-pixel text-neon-violet absolute bottom-6 left-6 text-xs opacity-70">
              └
            </span>
            <span className="font-pixel text-neon-violet absolute right-6 bottom-6 text-xs opacity-70">
              ┘
            </span>

            <p className="font-terminal mb-4 text-xl tracking-[0.3em] text-violet-300/70">
              ─── NOW ENTERING ───
            </p>

            <h1 className="font-pixel chroma-split mb-6 text-4xl leading-[1.15] sm:text-6xl md:text-7xl">
              NEXT
              <br />
              QUEST
            </h1>

            <p className="font-terminal mx-auto mb-2 max-w-2xl text-2xl text-violet-100/90 sm:text-3xl">
              Log the games. Rate the bangers.
              <br />
              Climb the genre leaderboards.
            </p>
            <p className="font-terminal mx-auto mb-10 max-w-xl text-lg text-violet-300/60">
              A community-ranked top 20 for every genre. Every vote moves the needle.
              <span className="blink ml-1 text-neon-cyan">▮</span>
            </p>

            {/* menu CTAs — JRPG style */}
            <div className="font-pixel mx-auto mt-8 flex max-w-md flex-col items-stretch gap-3 text-xs sm:text-sm">
              <Link
                href="/signup"
                className="group relative flex items-center justify-between border-2 border-neon-violet bg-violet-950/30 px-5 py-4 text-violet-100 transition-all hover:bg-violet-900/40 hover:shadow-[0_0_24px_rgba(192,132,252,0.6)]"
              >
                <span className="flex items-center gap-3">
                  <span className="press-pulse text-neon-cyan neon-cyan">▶</span>
                  <span className="neon-violet">PRESS START</span>
                </span>
                <span className="absolute right-3 bottom-1.5 text-[10px] tracking-widest text-violet-400/70 sm:static sm:right-auto sm:bottom-auto sm:text-sm sm:tracking-normal sm:text-violet-400 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  NEW ACCOUNT
                </span>
              </Link>
              <Link
                href="/login"
                className="group relative flex items-center justify-between border-2 border-violet-800/60 px-5 py-4 text-violet-300/80 transition-all hover:border-violet-500 hover:text-violet-100"
              >
                <span className="flex items-center gap-3">
                  <span className="opacity-50 group-hover:opacity-100">▷</span>
                  <span>CONTINUE</span>
                </span>
                <span className="absolute right-3 bottom-1.5 text-[10px] tracking-widest text-violet-500/70 sm:static sm:right-auto sm:bottom-auto sm:text-sm sm:tracking-normal sm:text-violet-500 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  LOGIN
                </span>
              </Link>
              <Link
                href="/leaderboards"
                className="group flex items-center justify-between border-2 border-violet-800/60 px-5 py-4 text-violet-300/80 transition-all hover:border-violet-500 hover:text-violet-100"
              >
                <span className="flex items-center gap-3">
                  <span className="opacity-50 group-hover:opacity-100">▷</span>
                  <span>VIEW LEADERBOARDS</span>
                </span>
                <span className="text-violet-500 opacity-0 transition-opacity group-hover:opacity-100">
                  HALL OF FAME
                </span>
              </Link>
            </div>

            <p className="font-pixel mt-12 text-[10px] tracking-widest text-violet-500/60">
              © 1989 NEXTQUEST CORP · ALL RIGHTS RESERVED
            </p>
          </div>
        </section>

        {/* ── MARQUEE STRIP ── */}
        <div className="font-pixel marquee border-y-2 border-neon-violet/60 bg-violet-950/20 py-3 text-xs text-neon-violet neon-violet">
          <div className="marquee-track">
            ★ NOW PLAYING ★ COMMUNITY RANKED ★ TOP 20 PER GENRE ★ NEW QUESTS DAILY ★ LOG · RATE · VOTE · CLIMB ★ INSERT COIN TO CONTINUE ★ NOW PLAYING ★ COMMUNITY RANKED ★ TOP 20 PER GENRE ★ NEW QUESTS DAILY ★
          </div>
        </div>

        {/* ── QUEST OBJECTIVES (how it works) ── */}
        <section className="relative mx-auto max-w-7xl px-6 py-20">
          <header className="mb-10 flex items-end justify-between">
            <div>
              <p className="font-pixel text-[10px] tracking-widest text-neon-cyan neon-cyan">
                ── TUTORIAL ──
              </p>
              <h2 className="font-pixel mt-2 text-2xl text-violet-100 sm:text-3xl neon-violet">
                YOUR QUEST
              </h2>
            </div>
            <span className="font-terminal hidden text-xl text-violet-400/60 sm:inline">
              press [SPACE] to advance
            </span>
          </header>

          <ol className="grid gap-5 md:grid-cols-3">
            {[
              {
                code: "01",
                title: "LOG A GAME",
                body:
                  "Search any title — finished, abandoned, replayed. Slap on a rating from 1 to 10 and write a short take.",
                stat: "+10 XP",
                color: "violet",
              },
              {
                code: "02",
                title: "VOTE THE LIST",
                body:
                  "Upvote the bangers, downvote the duds. Every vote nudges the genre leaderboard.",
                stat: "+5 XP",
                color: "cyan",
              },
              {
                code: "03",
                title: "CLIMB RANKS",
                body:
                  "Top 20 per genre, refreshed live. Push your favorites in — and earn community cred.",
                stat: "+50 XP",
                color: "gold",
              },
            ].map((q) => (
              <li
                key={q.code}
                className="group relative border-2 border-violet-900/60 bg-[#0a0c18]/60 p-6 transition-all hover:border-neon-violet hover:bg-violet-950/30"
              >
                <div className="font-pixel mb-3 flex items-baseline justify-between text-[10px] text-violet-400/70">
                  <span>QUEST {q.code}</span>
                  <span
                    className={
                      q.color === "cyan"
                        ? "neon-cyan"
                        : q.color === "gold"
                          ? "neon-gold"
                          : "neon-violet"
                    }
                  >
                    {q.stat}
                  </span>
                </div>
                <h3 className="font-pixel mb-3 text-sm text-violet-100">{q.title}</h3>
                <p className="font-terminal text-xl leading-snug text-violet-200/80">{q.body}</p>
                <span className="font-pixel absolute right-4 bottom-4 text-[10px] text-violet-500 opacity-0 transition-opacity group-hover:opacity-100">
                  ▶ ENGAGE
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ── SELECT QUEST (genres) ── */}
        <section className="relative mx-auto max-w-7xl px-6 pb-24">
          <header className="mb-8 flex items-end justify-between">
            <div>
              <p className="font-pixel text-[10px] tracking-widest text-neon-cyan neon-cyan">
                ── SELECT ──
              </p>
              <h2 className="font-pixel mt-2 text-2xl text-violet-100 sm:text-3xl neon-violet">
                CHOOSE YOUR QUEST
              </h2>
            </div>
            <Link
              href="/leaderboards"
              className="font-pixel hidden text-[10px] tracking-widest text-violet-300 hover:text-neon-cyan sm:inline"
            >
              ALL BOARDS ▶
            </Link>
          </header>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {genreRows.map(({ name: g }, i) => {
              const num = String(i + 1).padStart(2, "0");
              return (
                <Link
                  key={g}
                  href={`/leaderboards/${encodeURIComponent(g)}`}
                  className="group relative block border-2 border-violet-900/60 bg-[#0a0c18]/60 p-4 transition-all hover:-translate-y-0.5 hover:border-neon-violet hover:bg-violet-950/40 hover:shadow-[0_4px_0_0_rgba(192,132,252,0.5)]"
                >
                  <div className="font-pixel text-[9px] text-violet-500 transition-colors group-hover:text-neon-cyan">
                    {num}
                  </div>
                  <div className="font-pixel mt-1 text-sm text-violet-100 transition-colors group-hover:text-violet-50">
                    {g.toUpperCase()}
                  </div>
                  <div className="font-pixel mt-3 flex items-center justify-between text-[9px]">
                    <span className="text-violet-700 group-hover:text-violet-400">▰▰▰▱▱</span>
                    <span className="text-violet-500 opacity-0 transition-opacity group-hover:opacity-100">
                      ENTER ▶
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── BOTTOM ATTRACT STRIP ── */}
        <div className="font-pixel border-t border-violet-900/40 bg-[#0a0c18]/80 px-6 py-3 text-center text-[10px] tracking-widest text-violet-400/80">
          <span className="neon-cyan">▮</span>
          <span className="mx-3">PRESS START TO PLAY</span>
          <span className="blink neon-cyan">▮</span>
        </div>
      </div>
    </>
  );
}
