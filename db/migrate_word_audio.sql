-- Run once in Supabase SQL Editor. Audio files use the existing private lesson-audio bucket.
create table if not exists public.word_audio (
  word text not null check (length(word) between 1 and 160 and word = lower(trim(word))),
  accent text not null check (accent in ('us', 'uk')),
  audio_path text not null check (audio_path ~ '^vocab-audio/[a-f0-9]{64}/[a-f0-9-]+\.(mp3|ogg|wav)$'),
  ipa text,
  origin text not null check (origin in ('upload', 'dictionary')),
  attribution jsonb not null default '{}'::jsonb check (jsonb_typeof(attribution) = 'object'),
  bytes integer not null check (bytes > 0 and bytes <= 2097152),
  updated_at timestamptz not null default now(),
  primary key (word, accent)
);
alter table public.word_audio enable row level security;
revoke all on public.word_audio from anon, authenticated;
grant select, insert, update, delete on public.word_audio to service_role;
comment on table public.word_audio is 'Reusable vocabulary recordings per word and US/UK accent; server-only writes, source attribution preserved.';
