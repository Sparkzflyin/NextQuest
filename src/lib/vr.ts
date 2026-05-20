// Single source of truth for "is this RAWG game a VR title?".
// Used at insert/upsert time to stamp games.is_vr — the VR leaderboard reads
// that column directly (RAWG has no "VR" genre to match on). Keep the list in
// sync with the 0013 migration's backfill UPDATE.

const VR_TAG_SET = new Set([
  "vr",
  "virtual reality",
  "vr only",
  "vr-only",
  "vr required",
  "vr-required",
  "vr support",
  "vr-support",
  "vr mod",
]);

export function isVrFromRawg(input: { tags?: readonly string[] | null }): boolean {
  const tags = input.tags ?? [];
  for (const t of tags) {
    if (VR_TAG_SET.has(t.toLowerCase())) return true;
  }
  return false;
}
