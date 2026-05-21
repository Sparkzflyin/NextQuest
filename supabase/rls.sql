-- NextQuest: RLS policies + auth.users → profiles bridge.
-- Run AFTER `npm run db:push` (or after applying the Drizzle migration) on your Supabase Postgres.

alter table public.profiles      enable row level security;
alter table public.games         enable row level security;
alter table public.reviews       enable row level security;
alter table public.votes         enable row level security;
alter table public.user_genres   enable row level security;
alter table public.user_playstyles enable row level security;
alter table public.user_excluded_genres enable row level security;
alter table public.user_excluded_tags   enable row level security;
alter table public.user_excluded_games  enable row level security;
alter table public.user_wishlist        enable row level security;
alter table public.user_currently_playing enable row level security;
alter table public.swipes               enable row level security;
alter table public.canonical_genres enable row level security;
alter table public.canonical_playstyles enable row level security;

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

-- user_excluded_{genres,tags}: same shape as user_playstyles; "never show me" lists.
drop policy if exists "user_excluded_genres_read_all"   on public.user_excluded_genres;
drop policy if exists "user_excluded_genres_write_self" on public.user_excluded_genres;
create policy "user_excluded_genres_read_all"   on public.user_excluded_genres for select using (true);
create policy "user_excluded_genres_write_self" on public.user_excluded_genres for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_excluded_tags_read_all"   on public.user_excluded_tags;
drop policy if exists "user_excluded_tags_write_self" on public.user_excluded_tags;
create policy "user_excluded_tags_read_all"   on public.user_excluded_tags for select using (true);
create policy "user_excluded_tags_write_self" on public.user_excluded_tags for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_excluded_games: PRIVATE — only the owner sees what they've hidden.
drop policy if exists "user_excluded_games_read_self"  on public.user_excluded_games;
drop policy if exists "user_excluded_games_write_self" on public.user_excluded_games;
create policy "user_excluded_games_read_self"  on public.user_excluded_games for select
  using (auth.uid() = user_id);
create policy "user_excluded_games_write_self" on public.user_excluded_games for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_wishlist: public (social signal), write own.
drop policy if exists "user_wishlist_read_all"   on public.user_wishlist;
drop policy if exists "user_wishlist_write_self" on public.user_wishlist;
create policy "user_wishlist_read_all"   on public.user_wishlist for select using (true);
create policy "user_wishlist_write_self" on public.user_wishlist for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_currently_playing: read all (public dashboard signal), write own.
drop policy if exists "user_currently_playing_read_all"   on public.user_currently_playing;
drop policy if exists "user_currently_playing_write_self" on public.user_currently_playing;
create policy "user_currently_playing_read_all"   on public.user_currently_playing for select using (true);
create policy "user_currently_playing_write_self" on public.user_currently_playing for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- swipes: PRIVATE — personal queue state.
drop policy if exists "swipes_read_self"  on public.swipes;
drop policy if exists "swipes_write_self" on public.swipes;
create policy "swipes_read_self"  on public.swipes for select using (auth.uid() = user_id);
create policy "swipes_write_self" on public.swipes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- canonical_{genres,playstyles}: read all; writes happen via server actions (service role)
-- only — RAWG auto-promote in logGame, threshold-promote in approveReview.
drop policy if exists "canonical_genres_read_all"     on public.canonical_genres;
drop policy if exists "canonical_playstyles_read_all" on public.canonical_playstyles;
create policy "canonical_genres_read_all"     on public.canonical_genres     for select using (true);
create policy "canonical_playstyles_read_all" on public.canonical_playstyles for select using (true);

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

-- Lock down the RPC surface. The function is only meant to fire from the
-- on_auth_user_created trigger; PostgREST would otherwise expose it at
-- /rest/v1/rpc/handle_new_user to anon + authenticated roles. Trigger
-- execution doesn't need EXECUTE on the function itself, so revoking is safe.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── Avatar storage bucket ──
-- Public-read bucket so any visitor can render an avatar from a plain URL
-- (no signed-URL dance for a public profile picture). Writes are owner-only:
-- every file lives at "<user_id>/avatar" and the policy compares the first
-- path segment to auth.uid().
--
-- No SELECT policy is created: public buckets serve object URLs without one,
-- and a broad SELECT would let clients call storage.objects.list() and
-- enumerate every user's files.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_read_all"   on storage.objects;
drop policy if exists "avatars_write_own"  on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

create policy "avatars_write_own" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_update_own" on storage.objects for update
  using (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_delete_own" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Leaderboard view: net votes per game, exploded by genre so we can filter.
-- security_invoker = true makes the view honor the caller's RLS on games/votes
-- instead of running as the view owner (default Postgres behavior, which
-- Supabase's advisor flags as SECURITY DEFINER).
drop view if exists public.game_leaderboard;
create view public.game_leaderboard
  with (security_invoker = true) as
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
