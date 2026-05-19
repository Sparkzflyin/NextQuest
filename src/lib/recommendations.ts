import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Shape returned by both /recommendations and /swipe queue queries. Tags
// included so the swipe deck can display a couple as chips and the FYP page
// can ignore them.
export type RecommendationRow = {
  id: string;
  rawg_id: number;
  title: string;
  cover_url: string | null;
  genres: string[];
  tags: string[];
  released: string | null;
  community_score: number;
  match_score: number;
};

// Postgres text[] columns come back as a literal string ("{Action,RPG}") when
// queried via raw SQL with `prepare: false` (Supabase pooler mode). This
// normalizes both representations into a real JS string[].
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === "string");
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return [];
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];
  // Postgres quotes elements that contain commas/braces/whitespace with double
  // quotes; we strip those. Genre/tag names rarely need this, but doesn't hurt.
  const out: string[] = [];
  let buf = "";
  let inQuotes = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '"' && inner[i - 1] !== "\\") {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      const s = buf.trim();
      if (s) out.push(s);
      buf = "";
      continue;
    }
    buf += ch;
  }
  const last = buf.trim();
  if (last) out.push(last);
  return out;
}

// Local-catalog recommendations, ranked by the same match_score the FYP page
// uses. excludeSwiped=true drops anything the user has ever swiped on so the
// feed never resurfaces a game they already responded to.
export async function loadLocalRecommendations(
  userId: string,
  limit: number,
  opts: { excludeSwiped?: boolean } = {},
): Promise<RecommendationRow[]> {
  const swipeFilter = opts.excludeSwiped
    ? sql`and g.rawg_id not in (
        select rawg_id from public.swipes where user_id = ${userId}
      )`
    : sql``;

  const rows = await db.execute(sql`
    with
      fav_genres as (
        select genre from public.user_genres where user_id = ${userId}
      ),
      fav_playstyles as (
        select playstyle from public.user_playstyles where user_id = ${userId}
      ),
      excluded_genres as (
        select genre from public.user_excluded_genres where user_id = ${userId}
      ),
      excluded_tags as (
        select tag from public.user_excluded_tags where user_id = ${userId}
      ),
      excluded_rawg_ids as (
        select rawg_id from public.user_excluded_games where user_id = ${userId}
      ),
      loved as (
        select g.id as game_id, g.genres, g.tags
        from public.reviews r
        join public.games g on g.id = r.game_id
        where r.user_id = ${userId} and r.rating >= 8
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
        select game_id from public.reviews where user_id = ${userId}
      ),
      tallies as (
        select game_id, coalesce(sum(value), 0)::int as score
        from public.votes
        group by game_id
      )
    select
      g.id, g.rawg_id, g.title, g.cover_url, g.genres, g.tags, g.released,
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
      and g.rawg_id not in (select rawg_id from excluded_rawg_ids)
      and not exists (
        select 1 from excluded_genres eg where eg.genre = any(g.genres)
      )
      and not exists (
        select 1 from excluded_tags et where et.tag = any(g.tags)
      )
      ${swipeFilter}
    order by match_score desc, community_score desc
    limit ${limit}
  `);
  // Normalize array columns — see toStringArray above.
  const raw = rows as unknown as (Omit<RecommendationRow, "genres" | "tags"> & {
    genres: unknown;
    tags: unknown;
  })[];
  return raw.map((r) => ({
    ...r,
    genres: toStringArray(r.genres),
    tags: toStringArray(r.tags),
  }));
}
