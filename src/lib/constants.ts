// Genre + playstyle vocabularies live in the canonical_{genres,playstyles}
// tables now (seeded in drizzle/0003_canonical_tags.sql, grown by logGame for
// genres and approveReview for playstyles). Pages fetch them at request time.

export const LENGTHS = ["short", "medium", "long", "endless"] as const;
export type Length = (typeof LENGTHS)[number];

export const PLATFORMS = [
  "PC",
  "PlayStation 5",
  "PlayStation 4",
  "Xbox Series X/S",
  "Xbox One",
  "Nintendo Switch",
  "Steam Deck",
  "Mobile",
  "Other",
] as const;
