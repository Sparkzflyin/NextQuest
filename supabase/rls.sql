-- NextQuest: RLS policies + auth.users → profiles bridge.
-- Run AFTER `npm run db:push` (or after applying the Drizzle migration) on your Supabase Postgres.

alter table public.profiles      enable row level security;
alter table public.games         enable row level security;
alter table public.reviews       enable row level security;
alter table public.votes         enable row level security;
alter table public.user_genres   enable row level security;
alter table public.user_playstyles enable row level security;

-- profiles: anyone can read, only the owner can write their own row.
drop policy if exists "profiles_read_all"     on public.profiles;
drop policy if exists "profiles_write_self"   on public.profiles;
create policy "profiles_read_all"   on public.profiles for select using (true);
create policy "profiles_write_self" on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- games: read by anyone, insert by any signed-in user (catalog gets populated on first log).
drop policy if exists "games_read_all"      on public.games;
drop policy if exists "games_insert_authed" on public.games;
create policy "games_read_all"      on public.games for select using (true);
create policy "games_insert_authed" on public.games for insert
  with check (auth.role() = 'authenticated');

-- reviews: public select only approved rows; authors also see their own (incl. pending/rejected);
-- admins see everything. Writes restricted to the author; admins may update moderation columns.
drop policy if exists "reviews_read_all"     on public.reviews;
drop policy if exists "reviews_read_public"  on public.reviews;
drop policy if exists "reviews_write_self"   on public.reviews;
drop policy if exists "reviews_admin_all"    on public.reviews;
create policy "reviews_read_public" on public.reviews for select using (
  status = 'approved'
  OR auth.uid() = user_id
  OR EXISTS (select 1 from public.profiles p where p.id = auth.uid() AND p.is_admin)
);
create policy "reviews_write_self" on public.reviews for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_admin_all" on public.reviews for all
  using (EXISTS (select 1 from public.profiles p where p.id = auth.uid() AND p.is_admin))
  with check (EXISTS (select 1 from public.profiles p where p.id = auth.uid() AND p.is_admin));

-- votes: read all (for tallies), write own.
drop policy if exists "votes_read_all"   on public.votes;
drop policy if exists "votes_write_self" on public.votes;
create policy "votes_read_all"   on public.votes for select using (true);
create policy "votes_write_self" on public.votes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_genres: read all (lets us show what someone's into), write own.
drop policy if exists "user_genres_read_all"   on public.user_genres;
drop policy if exists "user_genres_write_self" on public.user_genres;
create policy "user_genres_read_all"   on public.user_genres for select using (true);
create policy "user_genres_write_self" on public.user_genres for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_playstyles: read all, write own (same pattern as user_genres).
drop policy if exists "user_playstyles_read_all"   on public.user_playstyles;
drop policy if exists "user_playstyles_write_self" on public.user_playstyles;
create policy "user_playstyles_read_all"   on public.user_playstyles for select using (true);
create policy "user_playstyles_write_self" on public.user_playstyles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create a profile row whenever a new auth user signs up.
-- Username defaults to the part before @ in their email; user can rename in /profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1) || '-' || substr(new.id::text, 1, 6)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Leaderboard view: net votes per game, exploded by genre so we can filter.
drop view if exists public.game_leaderboard;
create view public.game_leaderboard as
select
  g.id          as game_id,
  g.rawg_id     as rawg_id,
  g.slug        as slug,
  g.title       as title,
  g.cover_url   as cover_url,
  g.genres      as genres,
  unnest(g.genres) as genre,
  coalesce(sum(v.value), 0)::int as score,
  count(v.*)::int                as vote_count
from public.games g
left join public.votes v on v.game_id = g.id
group by g.id;
