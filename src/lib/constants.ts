export const GENRES = [
  "Action",
  "Adventure",
  "RPG",
  "Shooter",
  "Strategy",
  "Puzzle",
  "Platformer",
  "Racing",
  "Sports",
  "Fighting",
  "Simulation",
  "Indie",
  "Casual",
  "Arcade",
  "Family",
  "Board Games",
  "Educational",
  "Card",
  "Massively Multiplayer",
] as const;

export type Genre = (typeof GENRES)[number];

export const LENGTHS = ["short", "medium", "long", "endless"] as const;
export type Length = (typeof LENGTHS)[number];

export const PLAYSTYLES = [
  "Story-driven",
  "Competitive",
  "Co-op",
  "Exploration",
  "Stealth",
  "Combat-heavy",
  "Puzzle-solving",
  "Open-world",
  "Linear",
  "Replayable",
  "Atmospheric",
  "Speedrun-friendly",
] as const;

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
