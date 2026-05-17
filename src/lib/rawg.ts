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
