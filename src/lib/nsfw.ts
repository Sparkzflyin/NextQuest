// Single source of truth for "is this RAWG game adult-only?".
// Used at insert/upsert time in logGame + addCurrentlyPlaying to stamp
// games.is_nsfw, and at runtime to filter the swipe deck's RAWG fallback
// (where we don't have games.is_nsfw because the row doesn't exist yet).
//
// Conservative on purpose: when in doubt, flag it. The 0011 migration's
// backfill SQL mirrors this list — keep them in sync if you add a term.

const NSFW_TAG_SET = new Set([
  "nudity",
  "sexual content",
  "sexual-content",
  "nsfw",
  "hentai",
  "partial nudity",
  "partial-nudity",
  "mature",
]);

const NSFW_GENRE_SET = new Set(["adult", "hentai"]);

export function isNsfwFromRawg(input: {
  genres?: readonly string[] | null;
  tags?: readonly string[] | null;
}): boolean {
  const tags = input.tags ?? [];
  for (const t of tags) {
    if (NSFW_TAG_SET.has(t.toLowerCase())) return true;
  }
  const genres = input.genres ?? [];
  for (const g of genres) {
    if (NSFW_GENRE_SET.has(g.toLowerCase())) return true;
  }
  return false;
}
