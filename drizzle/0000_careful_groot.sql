CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rawg_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"cover_url" text,
	"released" text,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_rawg_id_unique" UNIQUE("rawg_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"difficulty" smallint,
	"length" text,
	"platform" text,
	"playstyle" text[] DEFAULT '{}'::text[] NOT NULL,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" BETWEEN 1 AND 10),
	CONSTRAINT "reviews_difficulty_range" CHECK ("reviews"."difficulty" IS NULL OR "reviews"."difficulty" BETWEEN 1 AND 5),
	CONSTRAINT "reviews_length_enum" CHECK ("reviews"."length" IS NULL OR "reviews"."length" IN ('short','medium','long','endless'))
);
--> statement-breakpoint
CREATE TABLE "user_genres" (
	"user_id" uuid NOT NULL,
	"genre" text NOT NULL,
	CONSTRAINT "user_genres_user_id_genre_pk" PRIMARY KEY("user_id","genre")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_user_id_game_id_pk" PRIMARY KEY("user_id","game_id"),
	CONSTRAINT "votes_value_pm1" CHECK ("votes"."value" IN (-1, 1))
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_genres" ADD CONSTRAINT "user_genres_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_genres_gin" ON "games" USING gin ("genres");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_user_game_uniq" ON "reviews" USING btree ("user_id","game_id");--> statement-breakpoint
CREATE INDEX "votes_game_idx" ON "votes" USING btree ("game_id");