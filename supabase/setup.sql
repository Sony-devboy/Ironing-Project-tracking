-- IRON Project Tracking: database schema + Row Level Security
-- Run this ONCE in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Security model: every table has RLS enabled. Only authenticated (logged-in)
-- users can read or write anything; anonymous API calls get zero rows.
-- The history table is append-only through the API (no update/delete policies).

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

create policy "members can read features"
  on public.features for select to authenticated using (true);
create policy "members can add features"
  on public.features for insert to authenticated with check (true);
create policy "members can update features"
  on public.features for update to authenticated using (true) with check (true);
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

alter table public.tickets enable row level security;

create policy "members can read tickets"
  on public.tickets for select to authenticated using (true);
create policy "members can add tickets"
  on public.tickets for insert to authenticated with check (true);
create policy "members can update tickets"
  on public.tickets for update to authenticated using (true) with check (true);
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

create policy "members can read history"
  on public.history for select to authenticated using (true);
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

create policy "members can read messages"
  on public.messages for select to authenticated using (true);
create policy "members can send messages"
  on public.messages for insert to authenticated with check (auth.uid() = author_id);

-- Helpful indexes
create index if not exists tickets_feature_id_idx on public.tickets (feature_id);
create index if not exists history_created_at_idx on public.history (created_at desc);
create index if not exists messages_created_at_idx on public.messages (created_at desc);
