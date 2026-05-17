import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export default async function RecommendationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Score = (genre overlap with user's favorites) * 3
  //       + (trait overlap with games user rated >= 8) * 2
  //       + net community score
  // Exclude games already reviewed by this user.
  const rows = await db.execute(sql`
    with
      fav_genres as (
        select genre from public.user_genres where user_id = ${user.id}
      ),
      loved as (
        select g.genres, g.tags
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
      reviewed as (
        select game_id from public.reviews where user_id = ${user.id}
      ),
      tallies as (
        select game_id, coalesce(sum(value), 0)::int as score
        from public.votes
        group by game_id
      )
    select
      g.id, g.title, g.cover_url, g.genres, g.released,
      coalesce(t.score, 0) as community_score,
      (
        coalesce(cardinality(array(select unnest(g.genres) intersect select genre from fav_genres)), 0) * 3
        + coalesce(cardinality(array(select unnest(g.genres) intersect select genre from loved_genres)), 0) * 2
        + coalesce(cardinality(array(select unnest(g.tags)   intersect select tag   from loved_tags)),   0)
        + coalesce(t.score, 0)
      )::int as match_score
    from public.games g
    left join tallies t on t.game_id = g.id
    where g.id not in (select game_id from reviewed)
    order by match_score desc, community_score desc
    limit 24
  `);

  type Row = {
    id: string;
    title: string;
    cover_url: string | null;
    genres: string[];
    released: string | null;
    community_score: number;
    match_score: number;
  };
  const recs = (rows as unknown as Row[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">For you</h1>
        <p className="text-sm text-neutral-400">
          Picked from games you haven&apos;t logged, weighted by your favorite genres and the
          traits of games you&apos;ve rated highly.
        </p>
      </div>
      {recs.length === 0 ? (
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
          {recs.map((g) => (
            <Link key={g.id} href={`/games/${g.id}`}>
              <Card className="h-full hover:border-violet-500">
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
                <div className="mt-2 text-xs text-violet-300">match {g.match_score}</div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
