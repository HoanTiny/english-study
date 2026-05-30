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
- [x] **Gemini**: `GEMINI_API_KEY` đã cấu hình trong `.env.local` → nhật ký AI + roleplay chạy thật
- [x] **Azure Speech (Free F0)**: `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION=southeastasia` đã cấu hình → cấp token OK
- [x] Test thực tế 3 tính năng AI với key thật (2026-05-29): Azure token OK; Gemini 8/8 OK
  - Phát hiện Gemini Flash thỉnh thoảng trả 503 "high demand" → đã thêm **retry + backoff** (3 lần, 0.8s/1.6s) trong `src/lib/server/gemini.ts`

### Có thể làm thêm
- [x] Thêm link `/roleplay` ("Hội thoại") vào thanh Nav (sau Shadowing)
- [x] Tăng số cụm/câu cho các bài & shadowing (2026-05-29 → 30): tổng cụm **114 → 180**
  - [x] Shadowing: 5 → 16 câu (chia A1/A2/B1, khó tăng dần)
  - [x] Giai đoạn 1 (A1): 11 bài làm dày lên 7–9 cụm/bài
  - [x] Giai đoạn 2 (A2 Flyers): 7 bài làm dày lên 8 cụm/bài
  - [x] Giai đoạn 3–4 (B1/B1+): 4 bài làm dày lên 9 cụm/bài
- [x] **Gắn nhãn/kiểm tra cấp độ CEFR-J** (2026-05-30): dataset `data/cefrj-vocabulary-profile-1.5.csv` (7020 từ, license thương mại OK + ghi nguồn) + script QA `scripts/lint-cefr.mjs` (`npm run lint:cefr`) — dò từ vượt cấp trong câu mẫu, có xử lý hình thái từ (V-ing/-ed/-ly). Kết quả: chỉ còn từ vựng chủ đề tất yếu (đều có nghĩa Việt + ví dụ), không có lỗi nghiêm trọng.
- [x] **Luyện nghe YouTube theo cấp độ** (2026-05-30): mỗi bài có thẻ "🎧 Luyện nghe với người bản xứ" — kênh tự chọn theo CEFR (A1 Bob the Canadian · A2 VOA · B1 BBC · B1+ English with Lucy). Mặc định link tìm kiếm YouTube đã lọc kênh+chủ đề (hợp ToS, không chết link); có sẵn hạ tầng nhúng iframe `youtube-nocookie` qua trường tùy chọn `youtubeId`. (`ListeningResource.tsx`, `lib/listening.ts`)
- [x] **Phát âm thật từ Free Dictionary API** (2026-05-30): `GET /api/pronounce?word=` (proxy + cache trong RAM, TTL 7 ngày) trả IPA + audio mp3. Nút 🔊 ở bài học tự dùng audio người bản xứ cho từ đơn, fallback TTS cho cụm. Helper `src/lib/pronounce.ts`.
- [x] **Research nguồn tiếng Anh theo CEFR** (2026-05-30) → `docs/english-sources-research.md`
  - Stack an toàn: CEFR-J Wordlist (nhãn cấp độ, OK thương mại), Tatoeba (câu Anh–Việt, CC-BY), Free Dictionary API (IPA/audio), VOA (nghe, public domain), YouTube IFrame (nhúng video)
  - Tránh nhúng/copy: Oxford 3000/5000 & Cambridge EVP (chỉ tra cứu), British Council/BBC (chỉ link)
- [x] Nội dung sâu hơn cho Giai đoạn 3–4 (B1/B1+ lên 9 cụm/bài, ngôn ngữ hội thoại tự nhiên)
- [ ] Push notification thật (hiện chỉ nhắc khi tab đang mở)

### Polish giao diện (2026-05-30)
- [x] Sửa lỗi `animate-fadeIn` (dùng 17 chỗ nhưng chưa định nghĩa → hiệu ứng xuất hiện trang không chạy) + `scale-102` chưa định nghĩa
- [x] Thêm `prefers-reduced-motion` (tắt blob/animation cho người nhạy chuyển động), focus-ring bàn phím, scrollbar mảnh hợp tông, smooth scroll, màu bôi chọn thương hiệu
- [x] Thêm 2 nút CTA ở hero trang chủ ("Bắt đầu học hôm nay" → /today, "Học thử bài đầu tiên" → /lesson/greetings)
- [x] **Sửa Nav responsive cho mobile**: trước đây menu rộng ~811px tràn ngang ở màn hình <768px. Nay <md hiện nút hamburger + panel lưới 2 cột; ≥md giữ menu ngang. Đã soi thật trên Chrome (390px) — chuẩn. Đóng menu tự động khi chuyển trang.
- [x] Đã kiểm tra mobile các component trang chủ (Sprint/CoreLoop) — đã responsive sẵn (`flex-col md:flex-row`), không cần sửa.
- [x] `next build` sạch — 14 route

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
