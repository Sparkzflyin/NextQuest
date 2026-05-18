import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { canonicalGenres } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export default async function LeaderboardsIndex() {
  // Game count per genre — games.genres is a text[] so we lateral-unnest and group.
  const rows = await db.execute<{ name: string; game_count: number }>(sql`
    select cg.name as name, count(g.id)::int as game_count
    from public.canonical_genres cg
    left join public.games g on cg.name = any(g.genres)
    group by cg.name
    order by cg.name asc
  `);

  const totalGames = rows.reduce((sum, r) => sum + r.game_count, 0);

  return (
    <div className="space-y-8">
      {/* ── Attract header ── */}
      <header className="border-b-2 border-violet-900/60 pb-6">
        <div className="font-pixel mb-3 flex items-center gap-3 text-[10px] tracking-widest text-violet-400/80">
          <span className="neon-cyan">▮</span>
          <span>SELECT YOUR BOARD</span>
          <span className="text-violet-700">▰▰▰▱▱</span>
        </div>
        <h1 className="font-pixel chroma-split text-2xl sm:text-3xl">LEADERBOARDS</h1>
        <p className="font-terminal mt-3 text-lg text-violet-200/80">
          &gt; Top 20 games per genre, ranked by net upvotes.
        </p>
        <div className="font-pixel mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[10px] tracking-widest text-violet-500">
          <span>
            BOARDS: <span className="text-neon-cyan neon-cyan">{rows.length}</span>
          </span>
          <span>
            GAMES LOGGED: <span className="text-neon-cyan neon-cyan">{totalGames}</span>
          </span>
        </div>
      </header>

      {/* ── Cabinet grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((g, i) => {
          const slot = String(i + 1).padStart(2, "0");
          const empty = g.game_count === 0;
          return (
            <Link
              key={g.name}
              href={`/leaderboards/${encodeURIComponent(g.name)}`}
              className={cn(
                "group relative block border-2 bg-[#0a0c18]/60 p-4 transition-all",
                empty
                  ? "border-violet-900/30 opacity-60 hover:border-violet-700 hover:opacity-100"
                  : "border-violet-900/60 hover:-translate-y-0.5 hover:border-neon-violet hover:bg-violet-950/40 hover:shadow-[0_4px_0_0_rgba(192,132,252,0.5)]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[9px] text-violet-500 transition-colors group-hover:text-neon-cyan">
                  SLOT {slot}
                </span>
                <span
                  className={cn(
                    "font-pixel text-[9px]",
                    empty ? "text-violet-800" : "text-violet-600",
                  )}
                >
                  {g.game_count} {g.game_count === 1 ? "GAME" : "GAMES"}
                </span>
              </div>
              <div className="font-pixel mt-3 text-sm leading-tight text-violet-100 transition-colors group-hover:text-violet-50">
                {g.name.toUpperCase()}
              </div>
              <div className="font-pixel mt-3 flex items-center justify-between text-[9px]">
                <span
                  className={cn(
                    "transition-colors",
                    empty ? "text-violet-900" : "text-violet-700 group-hover:text-violet-400",
                  )}
                >
                  {empty ? "▱▱▱▱▱" : "▰▰▰▱▱"}
                </span>
                <span className="text-violet-500 opacity-0 transition-opacity group-hover:opacity-100">
                  {empty ? "EMPTY ▶" : "ENTER ▶"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Bottom attract strip ── */}
      <div className="font-pixel border-t border-violet-900/40 bg-[#0a0c18]/80 px-6 py-3 text-center text-[10px] tracking-widest text-violet-400/80">
        <span className="neon-cyan">▮</span>
        <span className="mx-3">PICK A BOARD TO ENTER</span>
        <span className="blink neon-cyan">▮</span>
      </div>
    </div>
  );
}
