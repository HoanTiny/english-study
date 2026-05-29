-- SpeakUp — Postgres / Supabase schema
-- Triết lý: mọi thứ user học (từ, câu, note, journal, shadowing) đều có thể
-- chảy về MỘT hồ ôn tập chung (review_items) chạy Spaced Repetition (SM-2).
-- Mỗi item theo dõi 2 trạng thái: hiểu (recognized) và nói được (mastered).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- NGƯỜI DÙNG
-- ─────────────────────────────────────────────────────────────
create table profiles (
  id            uuid primary key default gen_random_uuid(), -- = auth.users.id khi dùng Supabase
  email         text unique,                    -- null khi đăng nhập ẩn danh
  display_name  text,
  native_lang   text not null default 'vi',
  current_stage int  not null default 1,          -- giai đoạn 1..4
  streak_count  int  not null default 0,
  last_active   date,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- LỘ TRÌNH: 4 giai đoạn → bài học → đơn vị học (cụm/câu)
-- ─────────────────────────────────────────────────────────────
create table stages (
  id          int primary key,                    -- 1..4
  slug        text unique not null,
  title       text not null,
  cefr_level  text not null,                       -- A1, A2, B1...
  goal        text not null,
  sort_order  int  not null
);

create table lessons (
  id          uuid primary key default gen_random_uuid(),
  stage_id    int  not null references stages(id),
  slug        text unique not null,
  title       text not null,
  topic       text not null,                        -- 'gia đình', 'nhà hàng'...
  sort_order  int  not null,
  created_at  timestamptz not null default now()
);

-- Đơn vị học cốt lõi: ưu tiên CỤM TỪ + CÂU MẪU, không phải từ lẻ.
create type item_kind as enum ('chunk', 'sentence', 'word');

create table vocab_items (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid references lessons(id) on delete cascade,
  kind          item_kind not null default 'chunk',
  text_en       text not null,                      -- "It depends on..."
  meaning_vi    text not null,
  example_en    text,                               -- câu ví dụ đầy đủ
  ipa           text,                               -- phiên âm
  audio_url     text,                               -- giọng bản xứ
  sort_order    int not null default 0
);

create table user_lesson_progress (
  user_id      uuid not null references profiles(id) on delete cascade,
  lesson_id    uuid not null references lessons(id) on delete cascade,
  status       text not null default 'locked',      -- locked | available | in_progress | done
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

-- ─────────────────────────────────────────────────────────────
-- HỒ ÔN TẬP CHUNG (SRS) — trái tim của app
-- Bất kỳ nguồn nào (vocab, note, câu journal, câu shadowing) đều tạo ra
-- một review_item trỏ về nguồn gốc qua (source_type, source_id).
-- ─────────────────────────────────────────────────────────────
create type review_source as enum ('vocab', 'note', 'journal_sentence', 'shadowing');

create table review_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  source_type   review_source not null,
  source_id     uuid not null,                       -- id ở bảng nguồn tương ứng
  -- Trạng thái kép: passive vs active
  recognized    boolean not null default false,      -- đã hiểu
  mastered      boolean not null default false,      -- đã NÓI được
  -- Tham số SM-2
  ease_factor   numeric(4,2) not null default 2.5,
  interval_days int not null default 0,
  repetitions   int not null default 0,
  due_date      date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);
create index on review_items (user_id, due_date);

-- Lịch sử mỗi lần ôn (để vẽ biểu đồ tiến bộ)
create table review_logs (
  id             uuid primary key default gen_random_uuid(),
  review_item_id uuid not null references review_items(id) on delete cascade,
  quality        int not null,                        -- 0..5 (chất lượng nhớ lại, SM-2)
  pronunciation_score numeric(5,2),                   -- điểm Azure nếu là lần NÓI
  reviewed_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- DAILY JOURNAL (5–10 câu/ngày)
-- ─────────────────────────────────────────────────────────────
create table journal_prompts (
  id        uuid primary key default gen_random_uuid(),
  stage_id  int references stages(id),
  prompt_en text not null,                            -- "What did you do today?"
  prompt_vi text
);

create table journal_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  prompt_id     uuid references journal_prompts(id),
  entry_date    date not null default current_date,
  body          text not null,
  sentence_count int not null default 0,
  ai_feedback   jsonb,                                -- [{sentence, issue, suggestion}]
  read_aloud_recording_id uuid,                       -- FK gán sau (recordings)
  created_at    timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- ─────────────────────────────────────────────────────────────
-- NOTES — sổ tay cấu trúc câu & từ mới (đẩy được vào SRS)
-- ─────────────────────────────────────────────────────────────
create type note_kind as enum ('structure', 'word');

create table notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  kind         note_kind not null,
  content      text not null,                          -- "It's worth + V-ing"
  example      text,
  tags         text[] not null default '{}',
  in_review    boolean not null default false,          -- đã đẩy vào SRS chưa
  created_at   timestamptz not null default now()
);
create index on notes using gin (tags);

-- ─────────────────────────────────────────────────────────────
-- SHADOWING
-- ─────────────────────────────────────────────────────────────
create table shadowing_items (
  id          uuid primary key default gen_random_uuid(),
  stage_id    int references stages(id),
  text_en     text not null,
  audio_url   text not null,                            -- bản xứ
  cefr_level  text not null
);

create table shadowing_attempts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  shadowing_item_id uuid not null references shadowing_items(id) on delete cascade,
  recording_id      uuid,                               -- FK -> recordings
  pronunciation_score numeric(5,2),
  speed_rate        numeric(3,2) not null default 1.0,  -- 0.5 / 0.75 / 1.0
  created_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- GHI ÂM (dùng chung cho journal read-aloud, shadowing, core loop)
-- ─────────────────────────────────────────────────────────────
create table recordings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  storage_url text not null,                            -- Supabase Storage / R2
  transcript  text,
  azure_result jsonb,                                   -- kết quả chấm phát âm chi tiết
  created_at  timestamptz not null default now()
);

alter table journal_entries
  add constraint fk_journal_recording
  foreign key (read_aloud_recording_id) references recordings(id) on delete set null;

alter table shadowing_attempts
  add constraint fk_shadowing_recording
  foreign key (recording_id) references recordings(id) on delete set null;
