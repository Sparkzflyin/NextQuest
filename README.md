# NextQuest

Letterboxd for video games. Log games you've played, rate them, vote on what others have logged, and watch them climb per-genre top-20 leaderboards. Get recommendations based on your favorite genres and the traits of games you've rated highly.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Supabase (Postgres + Auth)
- Drizzle ORM
- RAWG.io for the game catalog
- Zod + react-hook-form for forms

## Local setup

### 1. External accounts

- **Supabase** — https://supabase.com → create a project. From **Project Settings**:
  - **API** → copy `Project URL` and `anon public` key.
  - **Database → Connection string** → copy two URLs:
    - **Transaction pooler** (port `6543`) — for `DATABASE_URL`.
    - **Session pooler** (port `5432`) — for `DIRECT_URL`.
- **RAWG** — https://rawg.io/apidocs → register an app, copy the API key.

### 2. Environment

```bash
cp .env.local.example .env.local
# Fill in the four values.
```

### 3. Database schema

```bash
npm run db:push           # creates tables, indexes, checks
```

Then open the Supabase SQL editor and run **`supabase/rls.sql`** — enables row-level security, sets the policies, installs the `auth.users` → `profiles` trigger, and creates the `game_leaderboard` view.

### 4. Run

```bash
npm run dev
# http://localhost:3000
```

In Supabase **Authentication → Providers → Email**, turn off "Confirm email" for local dev so signup → profile flows without an inbox detour.

## Deploying to Vercel

1. **Push this repo to GitHub** (public is fine — `.gitignore` already excludes `.env*`).
2. **Import the repo into Vercel**. Auto-detects Next.js; no `vercel.json` needed.
3. **Add the four env vars** in Vercel's project settings → **Environment Variables**. Use the same values as your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL` *(transaction pooler, port 6543, with `?pgbouncer=true`)*
   - `RAWG_API_KEY`
   - `DIRECT_URL` is **not** needed in Vercel — it's only used by `drizzle-kit` locally for migrations.
4. **Deploy.** First deploy will fail at runtime until step 5.
5. **Tell Supabase about your Vercel URL.** In Supabase → **Authentication → URL Configuration**:
   - **Site URL** → your production domain (e.g. `https://nextquest.vercel.app`)
   - **Redirect URLs** → add both `https://nextquest.vercel.app/**` and any preview pattern you want (e.g. `https://nextquest-*.vercel.app/**`).
   This is what makes password-reset emails and any future OAuth flows land back on your site.
6. **Run migrations from your laptop** whenever you change `src/lib/db/schema.ts`:
   ```bash
   npm run db:generate    # produce a new SQL migration in drizzle/
   npm run db:push        # apply it to Supabase (uses DIRECT_URL)
   ```
   Don't run migrations from Vercel — keep that out of your build/runtime.

### Why two database URLs?

`DATABASE_URL` runs through Supabase's transaction-mode PgBouncer pool on port `6543`. That's the only safe way for short-lived Vercel function invocations to talk to Postgres without exhausting connections, but it disables prepared statements (which is why `src/lib/db/index.ts` sets `prepare: false`).

`DIRECT_URL` is a real connection on port `5432` (session pooler or direct). Drizzle migrations issue DDL and rely on stable, prepared-statement-capable connections, so they go through this URL instead. You only need it on your laptop.

## What's wired up

| Page | What it does |
|---|---|
| `/` | Marketing landing + genre grid |
| `/signup`, `/login` | Email + password auth via Supabase |
| `/profile` | Set username + pick favorite genres |
| `/log` | Search RAWG → log a game with rating, difficulty, length, platform, playstyle, body |
| `/games/[id]` | Game detail page, vote buttons (+1/-1/clear), list of player logs |
| `/leaderboards` | Index of all genres |
| `/leaderboards/[genre]` | Top 20 games for that genre, ordered by net votes |
| `/recommendations` | Personalized feed for the signed-in user |

## How the ranking works

- Each user can cast one vote per game: `+1`, `-1`, or no vote. Clicking the same arrow twice clears the vote.
- A game's leaderboard score = `SUM(votes.value)` across all users.
- A game appears on every genre leaderboard its `genres[]` array contains (per RAWG).

## How recommendations work (v1)

For each candidate game (excluding ones you've already reviewed):
```
match = 3 * (overlap with your favorite genres)
      + 2 * (overlap with genres of games you rated >= 8)
      + 1 * (overlap with tags of games you rated >= 8)
      + community_score
```
Pure SQL, no ML. Trade up to embeddings/collab-filtering once there's real traffic.

## Project layout

```
src/
  app/
    layout.tsx · page.tsx · globals.css
    login/ signup/ profile/      — auth + profile (with genre picker)
    log/                          — log-a-game form + server action
    games/[id]/                   — game detail + voting
    games/actions.ts              — vote server action
    leaderboards/                 — genre index + per-genre top-20
    recommendations/              — personalized feed
    api/rawg/search/              — proxied RAWG search
  components/
    ui/                           — Tailwind primitives (Button, Input, …)
    nav.tsx · logout-button.tsx
    game-search.tsx · vote-buttons.tsx
  lib/
    db/                           — Drizzle schema + client
    supabase/                     — browser, server, middleware helpers
    rawg.ts · constants.ts · utils.ts
  middleware.ts                   — auth session refresh + route gating
supabase/rls.sql                  — RLS policies + auth trigger + leaderboard view
drizzle/                          — generated migrations
```

## Known follow-ups

- Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts` — rename when you're ready (works as-is for now).
- Genres are hard-coded in `src/lib/constants.ts` to match RAWG's top-level genre list. If RAWG adds new genres you want to support, update that file.
