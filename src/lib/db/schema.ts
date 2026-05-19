import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  check,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull().unique(),
  avatarUrl: text("avatar_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rawgId: integer("rawg_id").notNull().unique(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    coverUrl: text("cover_url"),
    released: text("released"),
    genres: text("genres").array().notNull().default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    // RAWG plain-text description, lazy-cached on first info-button open.
    // Nullable so existing rows don't need a backfill — null just means
    // "fetch from RAWG next time someone asks".
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("games_genres_gin").using("gin", t.genres)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    // Optional per-axis subscores. Nullable so legacy reviews still render.
    gameplayRating: smallint("gameplay_rating"),
    narrativeRating: smallint("narrative_rating"),
    designRating: smallint("design_rating"),
    // Optional per-axis expand-on-it notes. Filling all three (≥ 40 chars each)
    // plus all three subscores unlocks the +10 "in-depth review" credit bonus
    // — see CREDITS_PER_IN_DEPTH_REVIEW in src/lib/credits.ts.
    gameplayNotes: text("gameplay_notes"),
    narrativeNotes: text("narrative_notes"),
    designNotes: text("design_notes"),
    difficulty: smallint("difficulty"),
    length: text("length"),
    platform: text("platform"),
    playstyle: text("playstyle").array().notNull().default(sql`'{}'::text[]`),
    body: text("body"),
    status: text("status").notNull().default("pending"),
    // Admin lever for credit accounting. NULL = use the default (25 + 10 if
    // in-depth). 0 = penalty for low-effort/farming. See src/lib/credits.ts.
    creditOverride: smallint("credit_override"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    moderatedBy: uuid("moderated_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("reviews_user_game_uniq").on(t.userId, t.gameId),
    index("reviews_status_idx").on(t.status),
    check("reviews_rating_range", sql`${t.rating} BETWEEN 1 AND 10`),
    check("reviews_credit_override_range", sql`${t.creditOverride} IS NULL OR ${t.creditOverride} BETWEEN 0 AND 100`),
    check("reviews_gameplay_range", sql`${t.gameplayRating} IS NULL OR ${t.gameplayRating} BETWEEN 1 AND 10`),
    check("reviews_narrative_range", sql`${t.narrativeRating} IS NULL OR ${t.narrativeRating} BETWEEN 1 AND 10`),
    check("reviews_design_range", sql`${t.designRating} IS NULL OR ${t.designRating} BETWEEN 1 AND 10`),
    check("reviews_gameplay_notes_len", sql`${t.gameplayNotes} IS NULL OR char_length(${t.gameplayNotes}) <= 1000`),
    check("reviews_narrative_notes_len", sql`${t.narrativeNotes} IS NULL OR char_length(${t.narrativeNotes}) <= 1000`),
    check("reviews_design_notes_len", sql`${t.designNotes} IS NULL OR char_length(${t.designNotes}) <= 1000`),
    check("reviews_difficulty_range", sql`${t.difficulty} IS NULL OR ${t.difficulty} BETWEEN 1 AND 5`),
    check("reviews_length_enum", sql`${t.length} IS NULL OR ${t.length} IN ('short','medium','long','endless')`),
    check("reviews_status_enum", sql`${t.status} IN ('pending','approved','rejected')`),
  ],
);

export const votes = pgTable(
  "votes",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.gameId] }),
    check("votes_value_pm1", sql`${t.value} IN (-1, 1)`),
    index("votes_game_idx").on(t.gameId),
  ],
);

export const userGenres = pgTable(
  "user_genres",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    genre: text("genre").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.genre] })],
);

export const userPlaystyles = pgTable(
  "user_playstyles",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    playstyle: text("playstyle").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.playstyle] })],
);

// "Never show me this." Genres are canonical-list-only; tags are free-form
// (matched against games.tags from RAWG, lowercased compare in the recs query).
export const userExcludedGenres = pgTable(
  "user_excluded_genres",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    genre: text("genre").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.genre] })],
);

export const userExcludedTags = pgTable(
  "user_excluded_tags",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tag] })],
);

// Per-game "not interested" — keyed on rawg_id so it filters both local and
// RAWG-only FYP cards. Private (RLS = read self only).
export const userExcludedGames = pgTable(
  "user_excluded_games",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    rawgId: integer("rawg_id").notNull(),
    excludedAt: timestamp("excluded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.rawgId] })],
);

// Wishlist — same rawg_id keying as exclusions. Public so it can become a
// social signal later (friends' wishlists, etc.).
export const userWishlist = pgTable(
  "user_wishlist",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    rawgId: integer("rawg_id").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.rawgId] })],
);

// Swipe events. One row per directional action on the swipe deck. Used to
// suppress repeats in the queue, drive daily-capped credit reward, and keep
// an audit trail of likes/dislikes/wishlist adds.
export const swipes = pgTable(
  "swipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    rawgId: integer("rawg_id").notNull(),
    action: text("action").notNull(),
    swipedAt: timestamp("swiped_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("swipes_user_time_idx").on(t.userId, t.swipedAt.desc()),
    index("swipes_user_rawg_idx").on(t.userId, t.rawgId),
    check("swipes_action_enum", sql`${t.action} IN ('like','dislike','wishlist','skip')`),
  ],
);

// "Currently playing" dashboard — surfaced on profile. References local games.id
// because we want to link straight to the community page for the title.
export const userCurrentlyPlaying = pgTable(
  "user_currently_playing",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gameId] })],
);

export const canonicalGenres = pgTable("canonical_genres", {
  name: text("name").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const canonicalPlaystyles = pgTable("canonical_playstyles", {
  name: text("name").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
