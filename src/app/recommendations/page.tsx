import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { userGenres } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { browseByGenres } from "@/lib/rawg";
import { Card } from "@/components/ui/card";

const TARGET_RESULTS = 24;

export default async function RecommendationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // match_score =
  //   (favorite genres ∩ game.genres) * 3                       -- explicit
  // + (favorite playstyles ∩ game's review playstyles) * 3       -- explicit
  // + (loved-games genres ∩ game.genres) * 2                     -- inferred
  // + (loved-games playstyles ∩ game's review playstyles) * 2    -- inferred
  // + (loved-games RAWG tags ∩ game.tags) * 1
  // + community score
  // Exclude games already reviewed by this user.
  const rows = await db.execute(sql`
    with
      fav_genres as (
        select genre from public.user_genres where user_id = ${user.id}
      ),
      fav_playstyles as (
        select playstyle from public.user_playstyles where user_id = ${user.id}
      ),
      loved as (
        select g.id as game_id, g.genres, g.tags
        from public.reviews r
        join public.games g on g.id = r.game_id
        where r.user_id = ${user.id} and r.rating >= 8
      ),
      loved_tags as (
        select distinct unnest(tags) as tag from loved
      ),
      loved_genres as (
        select distinct unnest(genres) as genre from loved
      ),
      loved_playstyles as (
        select distinct unnest(r.playstyle) as playstyle
        from public.reviews r
        join loved l on l.game_id = r.game_id
        where r.status = 'approved'
      ),
      game_playstyles as (
        select r.game_id, array_agg(distinct ps) as playstyles
        from public.reviews r,
             lateral unnest(r.playstyle) as ps
        where r.status = 'approved'
        group by r.game_id
      ),
      reviewed as (
        select game_id from public.reviews where user_id = ${user.id}
      ),
      tallies as (
        select game_id, coalesce(sum(value), 0)::int as score
        from public.votes
        group by game_id
      )
    select
      g.id, g.rawg_id, g.title, g.cover_url, g.genres, g.released,
      coalesce(t.score, 0) as community_score,
      (
        coalesce(cardinality(array(select unnest(g.genres) intersect select genre from fav_genres)), 0) * 3
        + coalesce(cardinality(array(select unnest(coalesce(gp.playstyles, '{}'::text[])) intersect select playstyle from fav_playstyles)), 0) * 3
        + coalesce(cardinality(array(select unnest(g.genres) intersect select genre from loved_genres)), 0) * 2
        + coalesce(cardinality(array(select unnest(coalesce(gp.playstyles, '{}'::text[])) intersect select playstyle from loved_playstyles)), 0) * 2
        + coalesce(cardinality(array(select unnest(g.tags)   intersect select tag   from loved_tags)),   0)
        + coalesce(t.score, 0)
      )::int as match_score
    from public.games g
    left join tallies t on t.game_id = g.id
    left join game_playstyles gp on gp.game_id = g.id
    where g.id not in (select game_id from reviewed)
    order by match_score desc, community_score desc
    limit ${TARGET_RESULTS}
  `);

  type LocalRow = {
    id: string;
    rawg_id: number;
    title: string;
    cover_url: string | null;
    genres: string[];
    released: string | null;
    community_score: number;
    match_score: number;
  };
  const localRecs = (rows as unknown as LocalRow[]) ?? [];

  // RAWG fallback: when the local catalog can't fill the page, query RAWG by
  // the user's favorite genres. Playstyles don't apply here (different vocab).
  const favGenreRows = await db
    .select({ name: userGenres.genre })
    .from(userGenres)
    .where(eq(userGenres.userId, user.id));
  const favGenres = favGenreRows.map((r) => r.name);

  type RawgRec = {
    rawgId: number;
    title: string;
    coverUrl: string | null;
    genres: string[];
    released: string | null;
  };
  let rawgFill: RawgRec[] = [];
  const fillNeeded = TARGET_RESULTS - localRecs.length;
  if (fillNeeded > 0 && favGenres.length > 0) {
    const reviewed = await db.execute<{ rawg_id: number }>(sql`
      select g.rawg_id
      from public.reviews r
      join public.games g on g.id = r.game_id
      where r.user_id = ${user.id}
    `);
    const excludeIds = [
      ...localRecs.map((r) => r.rawg_id),
      ...(reviewed as unknown as { rawg_id: number }[]).map((r) => r.rawg_id),
    ];
    try {
      rawgFill = await browseByGenres({
        genreNames: favGenres,
        excludeIds,
        limit: fillNeeded,
      });
    } catch {
      // Soft-fail: a RAWG outage shouldn't blank the whole page.
      rawgFill = [];
    }
  }

  const hasAny = localRecs.length + rawgFill.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">For you</h1>
        <p className="text-sm text-neutral-400">
          Picked from your favorite genres and the traits of games you&apos;ve rated highly. The{" "}
          <span className="font-pixel text-[10px] tracking-widest text-neon-cyan">RAWG</span>{" "}
          badge means it&apos;s a catalog match nobody&apos;s logged yet — click to log it and pull
          it into the community board.
        </p>
      </div>
      {!hasAny ? (
        <Card>
          <p className="text-sm text-neutral-400">
            We need a bit more from you first.{" "}
            <Link href="/profile" className="text-violet-400 hover:underline">
              Pick some favorite genres
            </Link>{" "}
            or{" "}
            <Link href="/log" className="text-violet-400 hover:underline">
              log a game
            </Link>{" "}
            you&apos;ve played.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {localRecs.map((g) => (
            <Link key={`local-${g.id}`} href={`/games/${g.id}`}>
              <Card className="relative h-full hover:border-violet-500">
                {g.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.cover_url}
                    alt=""
                    className="mb-3 h-32 w-full rounded object-cover"
                  />
                )}
                <div className="font-medium">{g.title}</div>
                <div className="text-xs text-neutral-500">
                  {g.released ?? "—"} · {g.genres.slice(0, 3).join(", ")}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-violet-300">
                  <span>match {g.match_score}</span>
                  {g.community_score !== 0 && (
                    <span className="text-neutral-500">· {g.community_score} net votes</span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
          {rawgFill.map((g) => (
            <Link
              key={`rawg-${g.rawgId}`}
              href={`/log?rawgId=${g.rawgId}`}
              title="Log this game to add it to the community board"
            >
              <Card className="relative h-full border-cyan-900/60 hover:border-neon-cyan">
                <span className="font-pixel absolute right-2 top-2 z-10 border border-cyan-500/70 bg-[#0a0c18]/90 px-1.5 py-0.5 text-[9px] tracking-widest text-neon-cyan">
                  RAWG
                </span>
                {g.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.coverUrl}
                    alt=""
                    className="mb-3 h-32 w-full rounded object-cover"
                  />
                )}
                <div className="font-medium">{g.title}</div>
                <div className="text-xs text-neutral-500">
                  {g.released ?? "—"} · {g.genres.slice(0, 3).join(", ")}
                </div>
                <div className="mt-2 text-xs text-cyan-300">
                  + Log this to add it to the community board
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
