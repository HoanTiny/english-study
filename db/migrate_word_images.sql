-- Shared image metadata cache. Run once in the Supabase SQL Editor.
-- Photos stay at the original provider/CDN; do not store binary images in SQL.
-- Preserve creator, source and license for every image.
create table if not exists public.word_images (
  cache_key text primary key check (length(cache_key) = 64),
  word text not null check (length(word) <= 160),
  meaning text not null default '' check (length(meaning) <= 300),
  payload jsonb not null check (jsonb_typeof(payload -> 'results') = 'array'),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.word_images enable row level security;
-- Read and write only through the server; no user can poison the shared cache.
revoke all on public.word_images from anon, authenticated;
grant select, insert, update, delete on public.word_images to service_role;
create index if not exists word_images_expires_at_idx on public.word_images (expires_at);
comment on table public.word_images is 'Public vocabulary image URLs and attribution; no generative AI calls.';
