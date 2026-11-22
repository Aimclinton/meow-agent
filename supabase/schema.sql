-- MEOW Agent — run once in Supabase: Dashboard → SQL Editor → New query → Run

-- 1) Team-wide daily scan counter (used by /api/ocr with the service role key)
create table if not exists public.meow_usage (
  day text primary key,          -- YYYY-MM-DD in America/Los_Angeles (Gemini reset time)
  count integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.meow_usage enable row level security;   -- only the service role may write

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

-- 2) Per-user document history (synced across a user's devices)
create table if not exists public.meow_documents (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  title text,
  data jsonb not null,           -- document without image bytes (images live in Storage)
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.meow_documents enable row level security;
drop policy if exists "own documents" on public.meow_documents;
create policy "own documents" on public.meow_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists meow_documents_updated on public.meow_documents (user_id, updated_at desc);

-- 3) Private bucket for page images: <user_id>/<doc_id>/<page_id>.jpg
insert into storage.buckets (id, name, public) values ('meow-pages', 'meow-pages', false)
on conflict (id) do nothing;
drop policy if exists "own page images" on storage.objects;
create policy "own page images" on storage.objects
  for all to authenticated
  using (bucket_id = 'meow-pages' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'meow-pages' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4) Housekeeping: the app removes documents (and their images) older than 7 days
--    each time a user opens it. Old usage rows can be cleared with pg_cron if wanted:
-- select cron.schedule('meow-usage-cleanup', '0 3 * * *',
--   $$ delete from public.meow_usage where updated_at < now() - interval '30 days' $$);
