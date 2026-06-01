-- SpeakUp — Bài tập nghe (GĐ4). Mỗi bản ghi = 1 Activity có trên băng:
-- audio + câu hỏi/đáp án, chấm tự động. Audio để bucket private "lesson-audio".
-- Chạy trên Supabase SQL editor.

create table if not exists listening_exercises (
  id           uuid primary key default gen_random_uuid(),
  unit         int,                              -- 1..15
  section      text,                             -- "Telephone numbers"
  activity     int,                              -- số Activity trong section
  title        text not null,                    -- nhãn hiển thị
  level        text not null default 'A2',
  cd           int,                              -- map audio (đĩa)
  track        int,                              -- map audio (track)
  audio_path   text,                             -- file trong bucket lesson-audio
  instructions text,                             -- đề bài
  type         text not null default 'mc',       -- mc | fill | truefalse | ordering | speaking
  items        jsonb not null default '[]'::jsonb,
  transcript   text,                             -- tuỳ chọn (hiện sau khi làm)
  visible      boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists listening_exercises_order_idx
  on listening_exercises(unit, sort_order);

alter table listening_exercises enable row level security;

drop policy if exists "public read listening_exercises" on listening_exercises;
create policy "public read listening_exercises" on listening_exercises
  for select using (visible = true);

-- ── Hình dạng cột items (jsonb) theo từng type ─────────────────
--  mc        : [{ "prompt": "American Express", "options": ["890 Mount St","819 Mount St","89 Mount St"], "answer": 2 }]
--  fill      : [{ "prompt": "John Radcliffe Hospital", "answer": "Oxford 64711" }]
--  truefalse : [{ "prompt": "Hong Kong Restaurant 0435 7889", "answer": true }]   // right=true / wrong=false
--  ordering  : [{ "label": "George" }, { "label": "Gordon" }, ... ]  // thứ tự mảng = đáp án đúng
--  speaking  : [{ "text": "George Jones ..." }]                       // không chấm
-- ───────────────────────────────────────────────────────────────
