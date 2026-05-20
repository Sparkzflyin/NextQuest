const BASE = "https://api.rawg.io/api";

type RawgGame = {
  id: number;
  slug: string;
  name: string;
  released: string | null;
  background_image: string | null;
  genres: { id: number; name: string; slug: string }[];
  tags?: { id: number; name: string; slug: string }[];
  // Only present on the single-game detail endpoint, not on list endpoints.
  description_raw?: string;
};

function key() {
  const k = process.env.RAWG_API_KEY;
  if (!k) throw new Error("RAWG_API_KEY is not set");
  return k;
}

export async function searchGames(query: string, limit = 10) {
  if (!query.trim()) return [];
  const url = new URL(`${BASE}/games`);
  url.searchParams.set("key", key());
  url.searchParams.set("search", query);
  url.searchParams.set("page_size", String(limit));
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`RAWG search failed: ${res.status}`);
  const json = (await res.json()) as { results: RawgGame[] };
  return json.results.map((g) => ({
    rawgId: g.id,
    slug: g.slug,
    title: g.name,
    coverUrl: g.background_image,
    released: g.released,
    genres: g.genres.map((x) => x.name),
    // Surface tags so callers can NSFW-gate the search picker before showing
    // results to a user whose allow_nsfw is off.
    tags: (g.tags ?? []).slice(0, 20).map((x) => x.name),
  }));
}

// Most of our genre names slugify cleanly (lowercase + space→hyphen). A few
// of RAWG's slugs don't match — keep overrides here when they crop up.
const GENRE_SLUG_OVERRIDES: Record<string, string> = {
  RPG: "role-playing-games-rpg",
};

function genreToRawgSlug(name: string): string {
  return GENRE_SLUG_OVERRIDES[name] ?? name.toLowerCase().replace(/\s+/g, "-");
}

export async function browseByGenres({
  genreNames,
  excludeIds = [],
  limit = 24,
  page = 1,
}: {
  genreNames: string[];
  excludeIds?: number[];
  limit?: number;
  // RAWG's exclude_games param is unreliable on its own — it tends to scope
  // to the current result page rather than the whole catalog. Callers should
  // paginate by bumping this when they've already shown everything on page 1.
  page?: number;
}) {
  if (!genreNames.length) return [];
  const slugs = genreNames.map(genreToRawgSlug).join(",");
  const url = new URL(`${BASE}/games`);
  url.searchParams.set("key", key());
  url.searchParams.set("genres", slugs);
  url.searchParams.set("ordering", "-rating");
  url.searchParams.set("page_size", String(Math.min(limit, 40)));
  url.searchParams.set("page", String(page));
  if (excludeIds.length) {
    // RAWG caps URL length around ~2KB. ~30 IDs of 6 digits each is fine; if a
    // user has reviewed hundreds of games we'll silently drop the overflow.
    // Also: don't rely on this alone — callers should filter client-side too.
    url.searchParams.set("exclude_games", excludeIds.slice(0, 200).join(","));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`RAWG browse failed: ${res.status}`);
  const json = (await res.json()) as { results: RawgGame[] };
  return json.results.map((g) => ({
    rawgId: g.id,
    slug: g.slug,
    title: g.name,
    coverUrl: g.background_image,
    released: g.released,
    genres: g.genres.map((x) => x.name),
    // Surface a few tags so callers can NSFW-gate before persisting the row.
    // RAWG's list endpoint already returns tags inline — no extra round-trip.
    tags: (g.tags ?? []).slice(0, 20).map((x) => x.name),
  }));
}

// Upcoming releases in user's favorite genres. RAWG's `dates` filter is
// inclusive on both ends; `-added` orders by how many users have added to a
// collection, which is a reasonable hype proxy for unreleased titles.
export async function browseUpcomingByGenres({
  genreNames,
  excludeIds = [],
  limit = 12,
}: {
  genreNames: string[];
  excludeIds?: number[];
  limit?: number;
}) {
  if (!genreNames.length) return [];
  const slugs = genreNames.map(genreToRawgSlug).join(",");
  const today = new Date().toISOString().slice(0, 10);
  const inAYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const url = new URL(`${BASE}/games`);
  url.searchParams.set("key", key());
  url.searchParams.set("genres", slugs);
  url.searchParams.set("dates", `${today},${inAYear}`);
  url.searchParams.set("ordering", "-added");
  url.searchParams.set("page_size", String(Math.min(limit, 40)));
  if (excludeIds.length) {
    url.searchParams.set("exclude_games", excludeIds.slice(0, 200).join(","));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`RAWG upcoming failed: ${res.status}`);
  const json = (await res.json()) as { results: RawgGame[] };
  return json.results.map((g) => ({
    rawgId: g.id,
    slug: g.slug,
    title: g.name,
    coverUrl: g.background_image,
    released: g.released,
    genres: g.genres.map((x) => x.name),
    tags: (g.tags ?? []).slice(0, 20).map((x) => x.name),
  }));
}

export async function fetchGame(rawgId: number) {
  const url = new URL(`${BASE}/games/${rawgId}`);
  url.searchParams.set("key", key());
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`RAWG fetch failed: ${res.status}`);
  const g = (await res.json()) as RawgGame;
  return {
    rawgId: g.id,
    slug: g.slug,
    title: g.name,
    coverUrl: g.background_image,
    released: g.released,
    genres: g.genres.map((x) => x.name),
    tags: (g.tags ?? []).slice(0, 20).map((x) => x.name),
    description: g.description_raw ?? null,
  };
}
