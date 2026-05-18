const BASE = "https://api.rawg.io/api";

type RawgGame = {
  id: number;
  slug: string;
  name: string;
  released: string | null;
  background_image: string | null;
  genres: { id: number; name: string; slug: string }[];
  tags?: { id: number; name: string; slug: string }[];
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
}: {
  genreNames: string[];
  excludeIds?: number[];
  limit?: number;
}) {
  if (!genreNames.length) return [];
  const slugs = genreNames.map(genreToRawgSlug).join(",");
  const url = new URL(`${BASE}/games`);
  url.searchParams.set("key", key());
  url.searchParams.set("genres", slugs);
  url.searchParams.set("ordering", "-rating");
  url.searchParams.set("page_size", String(Math.min(limit, 40)));
  if (excludeIds.length) {
    // RAWG caps URL length around ~2KB. ~30 IDs of 6 digits each is fine; if a
    // user has reviewed hundreds of games we'll silently drop the overflow.
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
  };
}
