-- =====================================================================
-- RESPAWN — migration 0001: core schema + Row Level Security
--
-- STATUS: DRAFT. NOT executed against a database. NOT tested.
-- Review it, run it in a throw-away Supabase project first, and test the
-- policies with the checks in supabase/README.md before trusting it.
--
-- Where to run it (Supabase free project):
--   Dashboard -> SQL Editor -> New query -> paste this file -> Run.
--
-- Design rules:
--  * Row Level Security is ON for every table. Nothing here disables it.
--  * Users can never write coins, roles, verification, or moderation fields.
--  * No birth date, phone, address or precise location is stored anywhere.
--  * Ranks are self-reported; `verification_status` can only be raised by
--    the server (service role), never by the client.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- helpers -------------------------------------------------

-- Roles live in their own table that clients cannot write.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role    text not null check (role in ('moderator','organizer','admin')),
  granted_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;
-- no policies for anon/authenticated => no client access at all.
-- (service role bypasses RLS; grant roles from the dashboard or a server.)

create or replace function public.has_role(required text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and (r.role = required or (required = 'moderator' and r.role = 'admin') or (required = 'organizer' and r.role = 'admin'))
  );
$$;

-- ---------- game catalog --------------------------------------------

create table if not exists public.game_catalog (
  id        text primary key,
  name      text not null,
  active    boolean not null default true,
  modes     text[] not null default '{}',
  roles     text[] not null default '{}',
  ranks     text[] not null default '{}',
  cross_play boolean not null default false
);
alter table public.game_catalog enable row level security;
create policy game_catalog_read on public.game_catalog for select to anon, authenticated using (active);

insert into public.game_catalog (id, name, modes, roles, ranks, cross_play) values
 ('bgmi','BGMI','{Classic,TDM,Arena}','{IGL,Assaulter,Support,Sniper,Scout}','{Bronze,Silver,Gold,Platinum,Diamond,Crown,Ace,"Ace Master","Ace Dominator",Conqueror}',false),
 ('freefire','Free Fire MAX','{"Battle Royale","Clash Squad"}','{IGL,Rusher,Support,Sniper,Flanker}','{Bronze,Silver,Gold,Platinum,Diamond,Heroic,Grandmaster}',false),
 ('valorant','VALORANT','{Competitive,Unrated,"Spike Rush"}','{Duelist,Controller,Initiator,Sentinel}','{Iron,Bronze,Silver,Gold,Platinum,Diamond,Ascendant,Immortal,Radiant}',false),
 ('minecraft','Minecraft','{Survival,Creative,PvP,Minigames}','{Builder,Redstoner,Explorer,Fighter}','{Newcomer,Builder,Veteran,Expert}',true),
 ('roblox','Roblox','{"Any experience",Obby,Roleplay,Shooter}','{Builder,Explorer,Fighter,Strategist}','{Newcomer,Regular,Skilled,Expert}',true),
 ('codm','Call of Duty: Mobile','{Multiplayer,"Battle Royale",Ranked}','{Slayer,Objective,Anchor,Sniper,Support}','{Rookie,Veteran,Elite,Pro,Master,Grandmaster,Legendary}',false),
 ('fortnite','Fortnite','{"Battle Royale","Zero Build",Creative}','{Fragger,IGL,Support,Builder}','{Bronze,Silver,Gold,Platinum,Diamond,Elite,Champion,Unreal}',true)
on conflict (id) do nothing;

-- ---------- profiles ------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  username_norm text generated always as (lower(username)) stored,
  display_name  text check (char_length(display_name) <= 40),
  bio           text check (char_length(bio) <= 140),
  avatar_url    text,
  banner_url    text,
  visibility    text not null default 'private' check (visibility in ('private','public')),
  theme         text not null default 'violet',
  region        text,                                 -- coarse region only, e.g. 'North India'
  languages     text[] not null default '{}',
  mic           text check (mic in ('Speaks','Listens only','No mic')),
  lfg           boolean not null default false,
  show_bio      boolean not null default true,
  show_rank     boolean not null default true,
  show_region   boolean not null default true,
  show_languages boolean not null default true,
  suspended     boolean not null default false,       -- set by moderators only
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_username_norm_key unique (username_norm)
);
alter table public.profiles enable row level security;

-- Column-level grants: clients may only touch these columns.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert (id, username, display_name, bio, avatar_url, banner_url, visibility, theme, region, languages, mic, lfg, show_bio, show_rank, show_region, show_languages)
  on public.profiles to authenticated;
grant update (display_name, bio, avatar_url, banner_url, visibility, theme, region, languages, mic, lfg, show_bio, show_rank, show_region, show_languages)
  on public.profiles to authenticated;

create policy profiles_read on public.profiles for select to anon, authenticated
  using (visibility = 'public' or id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- no delete policy: account deletion goes through auth (cascade) via a server action.

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- ---------- user_games ----------------------------------------------

create table if not exists public.user_games (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_id    text not null references public.game_catalog(id),
  rank       text,
  level      int check (level between 1 and 999),
  role       text,
  mode       text,
  platform   text,
  playstyle  text check (playstyle in ('Casual','Competitive','Both')),
  communication text,
  slots      text[] not null default '{}',
  server     text,
  verification_status text not null default 'self_reported'
             check (verification_status in ('self_reported','organizer_verified','game_confirmed')),
  stats_source text not null default 'self_reported',
  is_main    boolean not null default false,
  primary key (user_id, game_id)
);
alter table public.user_games enable row level security;
revoke all on public.user_games from anon, authenticated;
grant select on public.user_games to anon, authenticated;
grant insert (user_id, game_id, rank, level, role, mode, platform, playstyle, communication, slots, server, is_main) on public.user_games to authenticated;
grant update (rank, level, role, mode, platform, playstyle, communication, slots, server, is_main) on public.user_games to authenticated;
grant delete on public.user_games to authenticated;
-- NOTE: verification_status / stats_source are NOT in any client grant => clients cannot self-verify.

create policy user_games_read on public.user_games for select to anon, authenticated
  using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = user_id and p.visibility = 'public'));
create policy user_games_write_own on public.user_games for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Private in-game IDs live in their own owner-only table so they can never
-- leak through a `select *` on user_games or through any public profile query.
create table if not exists public.user_game_handles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.game_catalog(id),
  handle  text not null check (char_length(handle) between 1 and 30),
  primary key (user_id, game_id)
);
alter table public.user_game_handles enable row level security;
revoke all on public.user_game_handles from anon, authenticated;
grant select, insert, update, delete on public.user_game_handles to authenticated;
create policy handles_own on public.user_game_handles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- blocks --------------------------------------------------

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.blocks x where (x.blocker_id = a and x.blocked_id = b) or (x.blocker_id = b and x.blocked_id = a)); $$;

-- ---------- posts, likes, comments, follows, saves --------------------

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 280),
  game_id     text references public.game_catalog(id),
  media_path  text,                                    -- object path in Storage, never raw bytes
  kind        text not null default 'text' check (kind in ('text','screenshot','victory','achievement','announcement')),
  moderation_status text not null default 'visible' check (moderation_status in ('visible','hidden','removed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists posts_feed_idx on public.posts (created_at desc) where moderation_status = 'visible';
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert (author_id, body, game_id, media_path, kind) on public.posts to authenticated;
grant update (body, game_id) on public.posts to authenticated;
grant delete on public.posts to authenticated;

create policy posts_read on public.posts for select to anon, authenticated using (
  moderation_status = 'visible'
  and (author_id = (select auth.uid())
       or (exists (select 1 from public.profiles p where p.id = author_id and p.visibility = 'public')
           and not public.is_blocked_between(author_id, (select auth.uid()))))
);
create policy posts_insert_own on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and not exists (select 1 from public.profiles p where p.id = author_id and p.suspended));
create policy posts_update_own on public.posts for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy posts_delete_own on public.posts for delete to authenticated using (author_id = (select auth.uid()));
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
create policy post_likes_read on public.post_likes for select to authenticated using (true);
create policy post_likes_own on public.post_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy post_likes_del on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 200),
  moderation_status text not null default 'visible' check (moderation_status in ('visible','hidden','removed')),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);
alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select on public.comments to authenticated;
grant insert (post_id, author_id, parent_id, body) on public.comments to authenticated;
grant delete on public.comments to authenticated;
create policy comments_read on public.comments for select to authenticated using (
  moderation_status = 'visible' and not public.is_blocked_between(author_id, (select auth.uid()))
  and exists (select 1 from public.posts p where p.id = post_id));       -- inherits posts RLS
create policy comments_insert_own on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id = post_id));
create policy comments_delete_own on public.comments for delete to authenticated using (author_id = (select auth.uid()));

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id), check (follower_id <> followee_id)
);
alter table public.follows enable row level security;
create policy follows_read on public.follows for select to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));
create policy follows_insert on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and not public.is_blocked_between(follower_id, followee_id));
create policy follows_delete on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.saved_posts enable row level security;
create policy saved_own on public.saved_posts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- reports & moderation -------------------------------------

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','user','clip','event')),
  target_id   text not null,
  category    text not null check (char_length(category) <= 60),
  details     text check (char_length(details) <= 500),
  status      text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  created_at  timestamptz not null default now()
);
create index if not exists reports_queue_idx on public.reports (status, created_at);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, category, details) on public.reports to authenticated;
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.has_role('moderator'));

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null,
  target_type text, target_id text, details jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_logs enable row level security;
create policy audit_read on public.admin_audit_logs for select to authenticated using (public.has_role('admin'));
-- Insert only through the moderation functions below / service role. Append-only: no update/delete policies.

-- Moderator action: hides a post and writes the audit row in one transaction.
create or replace function public.moderate_post(p_post uuid, p_status text, p_note text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_role('moderator') then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_status not in ('visible','hidden','removed') then raise exception 'invalid status'; end if;
  update public.posts set moderation_status = p_status where id = p_post;
  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values ((select auth.uid()), 'moderate_post', 'post', p_post::text, jsonb_build_object('status', p_status, 'note', left(coalesce(p_note,''), 300)));
end $$;
revoke all on function public.moderate_post(uuid, text, text) from public, anon;
grant execute on function public.moderate_post(uuid, text, text) to authenticated;   -- the function itself enforces the role

-- ---------- notifications --------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  body text not null check (char_length(body) <= 200),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;
create policy notif_read on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notif_mark_read on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Rows are created by server-side triggers/functions only (no client insert grant).
