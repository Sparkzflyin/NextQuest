export const TAG_MAX_LEN = 32;

// Allowed in a custom tag: letters, numbers, hyphens, spaces. Collapse runs of
// whitespace, trim, cap length. Returns "" if nothing valid is left — callers
// treat falsy as "don't add this".
export function sanitizeTag(input: string): string {
  return input
    .replace(/[^\p{L}\p{N}\- ]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TAG_MAX_LEN);
}

// Filter a chip list by query, but always keep currently-selected chips visible
// so users don't lose sight of their picks while typing.
export function filterTags(all: string[], selected: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter((t) => selected.includes(t) || t.toLowerCase().includes(q));
}
