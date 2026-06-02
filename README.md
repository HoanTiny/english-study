# SpeakUp

Ứng dụng web học tiếng Anh từ **A1 → giao tiếp** (mục tiêu ~2h/ngày), mọi hoạt động đổ về **một hub ôn tập SRS** và theo dõi khoảng cách **Hiểu → Nói được**.

> Nội dung học là bản gốc (không copy giáo trình), gắn nhãn cấp độ theo Cambridge / CEFR-J.

## Tính năng chính

- **Vòng lặp lõi**: Sổ tay → Ôn tập SRS (FSRS) → Nhật ký → Shadowing.
- **Khoá học**: 31 bài / 253 cụm, mở khoá động theo tiến độ; quiz cuối bài.
- **Học từ vựng**: thư viện bộ thẻ, Active Recall đa chế độ (Flashcard / Đoán / Trắc nghiệm), ghép cụm (Lexical Approach).
- **Ngữ pháp**: 28 cấu trúc câu + 3 thì cơ bản + luyện đặt câu (chấm bằng AI).
- **Nghe**: Luyện nghe theo chủ đề (YouTube nhúng), Chép chính tả (kho câu TTS hoặc transcript YouTube).
- **Nói**: Shadowing + chấm phát âm thật (Azure Speech), Hội thoại AI roleplay.
- **Trò chơi**: Sprint, Audio-call, Collocations.
- **Hệ thống**: từ điển tra cứu (bôi đen → tra), thống kê tiến bộ, đăng nhập (ẩn danh / Email / Google OAuth), onboarding xếp lớp, nhắc học qua Web Push, Admin CMS.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** · **Tailwind v4**
- **Supabase** (Postgres + Auth + RLS)
- **FSRS** (`ts-fsrs`) cho lặp lại ngắt quãng
- **AI**: Google Gemini (nhật ký / roleplay / sinh câu) · Azure Speech (chấm phát âm) · provider OpenAI-compatible hoặc Anthropic (OCR ảnh → bài tập)
- Web APIs: SpeechSynthesis (TTS), MediaRecorder, Web Push (service worker)

> ⚠️ Đây **không** phải Next.js như tài liệu cũ — xem `AGENTS.md`. Đọc guide trong `node_modules/next/dist/docs/` trước khi viết code.

## Bắt đầu

```bash
npm install
cp .env.example .env.local   # rồi điền các key (xem bên dưới)
npm run dev                  # http://localhost:3000
```

App chạy được ngay với chế độ **ẩn danh**; các tính năng AI / phát âm / push cần key tương ứng (đều có fallback khi thiếu key).

## Biến môi trường

Mẫu đầy đủ ở [`.env.example`](.env.example). Tóm tắt:

| Biến | Bắt buộc | Dùng cho |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Kết nối Supabase (auth + dữ liệu) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin | Ghi dữ liệu ở Admin CMS (chỉ server) |
| `ADMIN_PASSCODE` | Admin | Mật mã vào `/admin/*` |
| `GEMINI_API_KEY` (`GEMINI_MODEL`) | — | Nhật ký AI, roleplay, sinh câu ví dụ, từ điển |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | — | Chấm phát âm thật ở Shadowing |
| `OPENAI_COMPAT_*` hoặc `ANTHROPIC_API_KEY` | — | OCR ảnh → bài tập (Admin) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_CRON_SECRET` | — | Nhắc học qua Web Push |

> Mọi key AI chỉ ở server (không tiền tố `NEXT_PUBLIC_`). Azure dùng token ngắn hạn, key gốc không xuống client.

## Cơ sở dữ liệu (Supabase)

Chạy theo thứ tự trong SQL editor của Supabase (các file trong `db/`):

1. `schema.sql` — bảng cốt lõi
2. `policies.sql` — RLS policies
3. Các migration bổ sung tính năng: `migrate_journal_shadowing.sql`, `migrate_note_meaning.sql`, `migrate_onboarding.sql`, `fix_profiles_email.sql`, `migrate_push_subscriptions.sql`, `migrate_dictation_videos.sql`, `migrate_listen_videos.sql`, `migrate_lessons_cms.sql`, `migrate_listening_exercises.sql`, `migrate_error_log.sql`

Seed video Luyện nghe (sau khi đã có `migrate_listen_videos.sql` + service-role key):

```bash
node scripts/seed-listen-videos.mjs
```

## Scripts

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy dev server (Turbopack) |
| `npm run build` / `npm start` | Build & chạy production |
| `npm run lint` | ESLint |
| `npm run lint:cefr` | Dò từ vượt cấp CEFR trong câu mẫu |
| `npm test` / `npm run test:watch` | Vitest (unit test logic thuần) |

## Kiểm thử

Test thuần (không cần DB/AI) cho phần logic dễ vỡ — đặt trong `tests/`:

- `srs.test.ts` — thuật toán FSRS: trạng thái hợp lệ, đến hạn, đơn điệu interval, sức mạnh trí nhớ.
- `utils.test.ts` — `countSentences`, `parseJsonLoose` (bóc JSON từ output AI).

```bash
npm test
```

## Tài liệu

- [`PROGRESS.md`](PROGRESS.md) — nhật ký tiến độ & quyết định thiết kế chi tiết.
- [`docs/english-sources-research.md`](docs/english-sources-research.md) — nghiên cứu nguồn tiếng Anh hợp lệ theo CEFR.
- [`AGENTS.md`](AGENTS.md) — lưu ý cho người/agent sửa code.
