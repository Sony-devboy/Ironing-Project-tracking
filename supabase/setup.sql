-- IRON Project Tracking: database schema + Row Level Security
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run at any time (idempotent) — run the whole file again after updates.
--
-- Security model: every table has RLS enabled. Only authenticated (logged-in)
-- users can read or write anything; anonymous API calls get zero rows.
-- The history table is append-only through the API (no update/delete policies).

-- ============ Profiles (custom display names) ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "members can read profiles" on public.profiles;
create policy "members can read profiles"
  on public.profiles for select to authenticated using (true);
drop policy if exists "users can create own profile" on public.profiles;
create policy "users can create own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ============ Features ============
create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.features enable row level security;

drop policy if exists "members can read features" on public.features;
create policy "members can read features"
  on public.features for select to authenticated using (true);
drop policy if exists "members can add features" on public.features;
create policy "members can add features"
  on public.features for insert to authenticated with check (true);
drop policy if exists "members can update features" on public.features;
create policy "members can update features"
  on public.features for update to authenticated using (true) with check (true);
drop policy if exists "members can delete features" on public.features;
create policy "members can delete features"
  on public.features for delete to authenticated using (true);

-- ============ Tickets (tasks needed to build a feature) ============
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  feature_id uuid not null references public.features (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  created_at timestamptz not null default now()
);

-- Ticket ownership (added after initial release; safe on fresh installs too)
alter table public.tickets add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.tickets add column if not exists owner_name text;

alter table public.tickets enable row level security;

drop policy if exists "members can read tickets" on public.tickets;
create policy "members can read tickets"
  on public.tickets for select to authenticated using (true);
drop policy if exists "members can add tickets" on public.tickets;
create policy "members can add tickets"
  on public.tickets for insert to authenticated with check (true);
drop policy if exists "members can update tickets" on public.tickets;
create policy "members can update tickets"
  on public.tickets for update to authenticated using (true) with check (true);
drop policy if exists "members can delete tickets" on public.tickets;
create policy "members can delete tickets"
  on public.tickets for delete to authenticated using (true);

-- ============ History (immutable audit log + archive) ============
create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null default auth.uid(),
  actor_name text not null default '',
  action text not null,
  entity_type text not null,
  entity_name text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.history enable row level security;

drop policy if exists "members can read history" on public.history;
create policy "members can read history"
  on public.history for select to authenticated using (true);
drop policy if exists "members can append history" on public.history;
create policy "members can append history"
  on public.history for insert to authenticated with check (true);
-- No update/delete policies on purpose: the log cannot be altered via the API.

-- ============ Local Chat ============
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid(),
  author_name text not null default '',
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "members can read messages" on public.messages;
create policy "members can read messages"
  on public.messages for select to authenticated using (true);
drop policy if exists "members can send messages" on public.messages;
create policy "members can send messages"
  on public.messages for insert to authenticated with check (auth.uid() = author_id);

-- Helpful indexes
create index if not exists tickets_feature_id_idx on public.tickets (feature_id);
create index if not exists tickets_owner_id_idx on public.tickets (owner_id);
create index if not exists history_created_at_idx on public.history (created_at desc);
create index if not exists messages_created_at_idx on public.messages (created_at desc);
