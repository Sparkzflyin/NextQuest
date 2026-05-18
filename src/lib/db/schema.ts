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
    difficulty: smallint("difficulty"),
    length: text("length"),
    platform: text("platform"),
    playstyle: text("playstyle").array().notNull().default(sql`'{}'::text[]`),
    body: text("body"),
    status: text("status").notNull().default("pending"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    moderatedBy: uuid("moderated_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("reviews_user_game_uniq").on(t.userId, t.gameId),
    index("reviews_status_idx").on(t.status),
    check("reviews_rating_range", sql`${t.rating} BETWEEN 1 AND 10`),
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
