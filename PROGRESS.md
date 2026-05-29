# SpeakUp — Tiến độ dự án

> Cập nhật: 2026-05-29 · App học tiếng Anh A1 → giao tiếp (2h/ngày), mọi hoạt động đổ về 1 hub ôn tập SRS, theo dõi khoảng cách **Hiểu → Nói được**.

## Stack
- Next.js 16.2.6 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4
- Supabase (Postgres + Auth ẩn danh + RLS)
- SRS thuật toán SM-2
- Web APIs: SpeechSynthesis (TTS), MediaRecorder
- AI: Google Gemini Flash (nhật ký + roleplay) · Azure Speech (chấm phát âm)

## Đã hoàn thành ✅

### Nền tảng & dữ liệu
- [x] Schema DB + RLS policies (`db/*.sql`)
- [x] Auth ẩn danh (Supabase) + AuthProvider
- [x] Migrate toàn bộ sang Supabase: Notes, Review (SRS), Journal, Shadowing
- [x] Dashboard "Hôm nay": thanh Hiểu→Nói được, thẻ đến hạn, streak nhật ký, điểm phát âm TB

### Core learning loop
- [x] Sổ tay (Notes) → đẩy cụm vào ôn tập
- [x] Hub Ôn tập SRS (SM-2): recognized vs mastered
- [x] Nhật ký 5–10 câu/ngày
- [x] Shadowing (nghe → nhại → chấm điểm)

### Nội dung khoá học (gốc, không copy giáo trình)
- [x] **Giai đoạn 1 — A1 Movers**: 11/11 bài
- [x] **Giai đoạn 2 — A2 Flyers**: 7/7 bài
- [x] **Giai đoạn 3 — B1**: 3/3 bài (restaurant, travel, opinions)
- [x] **Giai đoạn 4 — B1+**: think-in-english ✓ · ai-roleplay (trang riêng) ✓
- [x] Trang bài học `/lesson/[slug]` (cụm + câu mẫu + TTS + đẩy vào ôn tập)
- [x] Lộ trình cập nhật theo Cambridge "Pre A1 Starters/A1 Movers/A2 Flyers"

### Tính năng nâng cao
- [x] **Mở khoá bài học động** theo tiến độ SRS (chỉ bài đầu mở; bài kế mở khi bài trước được bắt đầu)
- [x] **Nhắc học hằng ngày** (Notification API, chọn giờ, banner trong app)
- [x] **Phản hồi nhật ký bằng Gemini** — `POST /api/journal-feedback` (fallback mock)
- [x] **Hội thoại AI roleplay** — `/roleplay` + `POST /api/roleplay` (5 tình huống, TTS)
- [x] **Chấm phát âm thật Azure** — `GET /api/speech-token` + Speech SDK ở shadowing (fallback mock)

## Đang chờ / cần làm 🔜

### Cấu hình API key (người dùng tự lấy — không tạo tài khoản hộ)
- [ ] **Gemini**: `GEMINI_API_KEY` (lấy ở aistudio.google.com/apikey) → bật nhật ký AI + roleplay thật
- [ ] **Azure Speech (Free F0)**: `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION=southeastasia` → bật chấm phát âm thật
  - Đang tạo Speech resource trên Azure (gói Free F0, Region Southeast Asia)
- [ ] Test thực tế 3 tính năng AI khi đã có key (chưa test với key thật)

### Có thể làm thêm
- [ ] Thêm link `/roleplay` vào thanh Nav
- [ ] Tăng số cụm/câu cho các bài & shadowing
- [ ] Nội dung sâu hơn cho Giai đoạn 3–4
- [ ] Push notification thật (hiện chỉ nhắc khi tab đang mở)

## Biến môi trường (`.env.local`)
Xem mẫu đầy đủ ở `.env.example`. Tóm tắt:
```
NEXT_PUBLIC_SUPABASE_URL=...        # đã có
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # đã có
GEMINI_API_KEY=                     # cần thêm
AZURE_SPEECH_KEY=                   # cần thêm
AZURE_SPEECH_REGION=southeastasia   # cần thêm
```
> Mọi key AI chỉ ở server (không có tiền tố `NEXT_PUBLIC_`). Azure dùng token ngắn hạn, key gốc không xuống client.

## Trạng thái build
✅ `next build` sạch — 13 route (gồm 3 API route: journal-feedback, roleplay, speech-token).
