-- MEOW Agent — run once in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Everything is accessed only by the Vercel functions with the service role key,
-- so Row Level Security is ON with no public policies (the browser never talks to the DB).

-- 1) Team-wide daily scan counter
create table if not exists public.meow_usage (
  day text primary key,          -- YYYY-MM-DD in America/Los_Angeles (Gemini reset time)
  count integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.meow_usage enable row level security;

create or replace function public.meow_increment_usage(p_day text, p_n integer default 1)
returns integer language plpgsql security definer set search_path = public as $$
declare new_count integer;
begin
  insert into public.meow_usage(day, count) values (p_day, p_n)
  on conflict (day) do update set count = meow_usage.count + excluded.count, updated_at = now()
  returning count into new_count;
  return new_count;
end $$;
revoke all on function public.meow_increment_usage(text, integer) from public, anon, authenticated;

-- 2) Vaults: the same password opens the same history on every device.
--    Only keyed hashes (HMAC) of the password / recovery code are stored.
create table if not exists public.meow_vaults (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  recovery_hash text unique,
  created_at timestamptz not null default now()
);
alter table public.meow_vaults enable row level security;

create table if not exists public.meow_vault_documents (
  vault_id uuid not null references public.meow_vaults(id) on delete cascade,
  id text not null,
  title text,
  data jsonb not null,           -- document without image bytes (images live in Storage)
  updated_at timestamptz not null default now(),
  primary key (vault_id, id)
);
alter table public.meow_vault_documents enable row level security;
create index if not exists meow_vault_documents_updated on public.meow_vault_documents (vault_id, updated_at desc);

-- 3) Shared form/table templates for the whole team
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  structure jsonb not null,      -- page structure (headings, table headers, empty cells)
  created_at timestamptz not null default now()
);
alter table public.templates enable row level security;

-- 4) Private bucket for page images: <vault_id>/<doc_id>/<page_id>.jpg
insert into storage.buckets (id, name, public) values ('meow-pages', 'meow-pages', false)
on conflict (id) do nothing;

-- Documents older than 7 days (and their images) are removed by the app
-- whenever someone with that password opens it.
-- Optional nightly clean-up of old counters (enable the pg_cron extension first):
-- select cron.schedule('meow-usage-cleanup', '0 3 * * *',
--   $$ delete from public.meow_usage where updated_at < now() - interval '30 days' $$);
