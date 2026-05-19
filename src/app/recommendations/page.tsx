import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  userExcludedGames,
  userExcludedGenres,
  userGenres,
  userWishlist,
} from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { browseByGenres, browseUpcomingByGenres } from "@/lib/rawg";
import { loadLocalRecommendations } from "@/lib/recommendations";
import { Card } from "@/components/ui/card";
import { CardActions } from "./card-actions";

const TARGET_RESULTS = 24;
const UPCOMING_LIMIT = 6;

export default async function RecommendationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Ranking happens in loadLocalRecommendations (shared with /swipe). Helper
  // normalizes Postgres text[] columns into real JS string arrays.
  const localRecs = await loadLocalRecommendations(user.id, TARGET_RESULTS);

  // RAWG fallback: when the local catalog can't fill the page, query RAWG by
  // the user's favorite genres. Playstyles don't apply here (different vocab).
  const favGenreRows = await db
    .select({ name: userGenres.genre })
    .from(userGenres)
    .where(eq(userGenres.userId, user.id));
  // Pulled here so we can post-filter the RAWG fallback (which doesn't know
  // about user exclusions). Tag exclusion already runs in the SQL above.
  const excludedGenreRows = await db
    .select({ name: userExcludedGenres.genre })
    .from(userExcludedGenres)
    .where(eq(userExcludedGenres.userId, user.id));
  const excludedGameRows = await db
    .select({ rawgId: userExcludedGames.rawgId })
    .from(userExcludedGames)
    .where(eq(userExcludedGames.userId, user.id));
  const wishlistRows = await db
    .select({ rawgId: userWishlist.rawgId })
    .from(userWishlist)
    .where(eq(userWishlist.userId, user.id));
  const excludedGenreSet = new Set(excludedGenreRows.map((r) => r.name.toLowerCase()));
  const excludedRawgSet = new Set(excludedGameRows.map((r) => r.rawgId));
  const wishlistSet = new Set(wishlistRows.map((r) => r.rawgId));
  const favGenres = favGenreRows
    .map((r) => r.name)
    .filter((g) => !excludedGenreSet.has(g.toLowerCase()));

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
      ...excludedGameRows.map((r) => r.rawgId),
    ];
    try {
      // Ask RAWG for a few extra so we can post-filter excluded genres without
      // shrinking the page below TARGET_RESULTS.
      const overFetch = Math.min(fillNeeded + excludedGenreSet.size * 4, fillNeeded * 3);
      const raw = await browseByGenres({
        genreNames: favGenres,
        excludeIds,
        limit: overFetch,
      });
      rawgFill = raw
        .filter(
          (g) =>
            !g.genres.some((gn) => excludedGenreSet.has(gn.toLowerCase())) &&
            !excludedRawgSet.has(g.rawgId),
        )
        .slice(0, fillNeeded);
    } catch {
      // Soft-fail: a RAWG outage shouldn't blank the whole page.
      rawgFill = [];
    }
  }

  // ── Upcoming row ── released after today, ranked by RAWG's "added" count
  // as a hype proxy. Same exclusion rules apply.
  let upcoming: RawgRec[] = [];
  if (favGenres.length > 0) {
    try {
      const raw = await browseUpcomingByGenres({
        genreNames: favGenres,
        excludeIds: [...excludedRawgSet],
        limit: UPCOMING_LIMIT * 2,
      });
      upcoming = raw
        .filter(
          (g) =>
            !g.genres.some((gn) => excludedGenreSet.has(gn.toLowerCase())) &&
            !excludedRawgSet.has(g.rawgId),
        )
        .slice(0, UPCOMING_LIMIT);
    } catch {
      upcoming = [];
    }
  }

  const hasAny = localRecs.length + rawgFill.length > 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">For you</h1>
        <p className="text-sm text-neutral-400">
          Picked from your favorite genres and the traits of games you&apos;ve rated highly. The{" "}
          <span className="font-pixel text-[10px] tracking-widest text-neon-cyan">RAWG</span>{" "}
          badge means it&apos;s a catalog match nobody&apos;s logged yet — click to log it and pull
          it into the community board. Hit{" "}
          <span className="text-rose-400">♥</span> to wishlist or{" "}
          <span className="text-red-400">×</span> to hide.
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
            <div key={`local-${g.id}`} className="relative">
              <CardActions rawgId={g.rawg_id} initialWishlisted={wishlistSet.has(g.rawg_id)} />
              <Link href={`/games/${g.id}`}>
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
            </div>
          ))}
          {rawgFill.map((g) => (
            <div key={`rawg-${g.rawgId}`} className="relative">
              <CardActions rawgId={g.rawgId} initialWishlisted={wishlistSet.has(g.rawgId)} />
              <Link
                href={`/log?rawgId=${g.rawgId}`}
                title="Log this game to add it to the community board"
              >
                <Card className="relative h-full border-cyan-900/60 hover:border-neon-cyan">
                  <span className="font-pixel absolute left-2 top-2 z-10 border border-cyan-500/70 bg-[#0a0c18]/90 px-1.5 py-0.5 text-[9px] tracking-widest text-neon-cyan">
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
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">Coming soon</h2>
            <p className="text-sm text-neutral-400">
              Unreleased titles in your favorite genres. Wishlist them to keep an eye on release day.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((g) => (
              <div key={`upcoming-${g.rawgId}`} className="relative">
                <CardActions rawgId={g.rawgId} initialWishlisted={wishlistSet.has(g.rawgId)} />
                <Link
                  href={`/log?rawgId=${g.rawgId}`}
                  title="Log this when you play it"
                >
                  <Card className="relative h-full border-amber-900/60 hover:border-amber-500">
                    <span className="font-pixel absolute left-2 top-2 z-10 border border-amber-500/70 bg-[#0a0c18]/90 px-1.5 py-0.5 text-[9px] tracking-widest text-amber-300">
                      UPCOMING
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
                      {g.released ?? "TBA"} · {g.genres.slice(0, 3).join(", ")}
                    </div>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
