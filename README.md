# SpeakUp

Ứng dụng web học tiếng Anh từ **A1 → giao tiếp** (mục tiêu ~2h/ngày), mọi hoạt động đổ về **một hub ôn tập SRS** và theo dõi khoảng cách **Hiểu → Nói được**.

> Nội dung học là bản gốc (không copy giáo trình), gắn nhãn cấp độ theo Cambridge / CEFR-J.

## Tính năng chính

- **Vòng lặp lõi**: Sổ tay → Ôn tập SRS (FSRS) → Nhật ký → Shadowing.
- **Khoá học**: 40 mục trong lộ trình tĩnh; nội dung xuất bản lấy từ CMS, mở khoá động theo tiến độ; quiz cuối bài.
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

App chạy được ngay với chế độ **ẩn danh**; các tính năng AI / phát âm / push cần key tương ứng (thiếu key sẽ báo chưa sẵn sàng; không tạo điểm giả).

## Biến môi trường

Mẫu đầy đủ ở [`.env.example`](.env.example). Tóm tắt:

| Biến | Bắt buộc | Dùng cho |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Kết nối Supabase (auth + dữ liệu) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin / AI | CMS và hạn mức API (chỉ server) |
| `ADMIN_EMAILS` | Admin | Email quản trị khởi tạo; quyền bổ sung trong `profiles.role` |
| `GEMINI_API_KEY` (`GEMINI_MODEL`) | — | Nhật ký AI, roleplay, sinh câu ví dụ, từ điển |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | — | Chấm phát âm thật ở Shadowing |
| `OPENAI_COMPAT_*` hoặc `ANTHROPIC_API_KEY` | — | OCR ảnh → bài tập (Admin) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_CRON_SECRET` | — | Nhắc học qua Web Push |

> Mọi key AI chỉ ở server (không tiền tố `NEXT_PUBLIC_`). Azure dùng token ngắn hạn, key gốc không xuống client.

## Cơ sở dữ liệu (Supabase)

Chạy theo thứ tự trong SQL editor của Supabase (các file trong `db/`):

1. `schema.sql` — bảng cốt lõi
2. `policies.sql` — RLS policies
3. Các migration bổ sung tính năng: `migrate_journal_shadowing.sql`, `migrate_note_meaning.sql`, `migrate_onboarding.sql`, `fix_profiles_email.sql`, `migrate_push_subscriptions.sql`, `migrate_dictation_videos.sql`, `migrate_listen_videos.sql`, `migrate_lessons_cms.sql`, `migrate_listening_exercises.sql`, `migrate_error_log.sql`, `migrate_roles.sql`, `migrate_word_examples.sql`
4. `migrate_learning_integrity.sql` — bảo vệ role, quota API, ghi CMS nguyên tử, kết quả quiz, trạng thái FSRS đầy đủ
5. `migrate_personalized_study.sql` — luyện lỗi và hoạt động học theo ngày
6. `migrate_shadowing_history.sql` — lịch sử từng lượt chấm và chi tiết phát âm (dùng cho biểu đồ hoạt động)
7. `migrate_study_session_sync.sql` — đồng bộ buổi học theo tài khoản/ngày, chống ghi đè tiến độ và cách ly tài khoản

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

## Buổi học cá nhân hóa

- Xếp lớp điều chỉnh bài bắt đầu và gợi ý; bài nền tảng vẫn mở để ôn. Vào lại onboarding để kiểm tra/chọn lại trình độ; không tự đánh dấu các bài trước đó là hoàn thành.
- Trang Hôm nay tạo buổi 10/20/30 phút theo thẻ đến hạn, bài đang học và lỗi cần ôn. Thanh tiến độ theo người học qua các trang; bỏ qua bước không tính hoàn thành. Tiến độ buổi đồng bộ qua Supabase theo tài khoản/ngày; bản trên thiết bị giữ thay đổi chưa gửi để thử lại khi có mạng. Cần đăng nhập cùng tài khoản để tiếp tục trên thiết bị khác.
- Sổ lỗi: tự viết lại trước khi xem gợi ý, tự đánh giá và ôn lại theo lịch. Cần 3 lần đúng cách nhau để tự đánh dấu đã nắm; dữ liệu này không phải điểm AI.
- Chạy thêm `db/migrate_personalized_study.sql` sau migration integrity. Chức năng luyện lỗi cần migration này.
- Đồng bộ buổi học cần `db/migrate_study_session_sync.sql` trước khi deploy. Quy tắc xử lý xung đột, trạng thái ngoại tuyến và kiểm thử: [docs/study-session-sync.md](docs/study-session-sync.md).
- Kiểm tra trình duyệt tùy chọn: `node scripts/smoke-personalized.mjs` với Playwright có sẵn, app tại `http://localhost:3107` và build dùng Supabase placeholder `https://build-check.supabase.co` / `build-check-placeholder`. Test chặn toàn bộ backend bằng fixture; không kiểm tra DB thật. Có thể đặt `PLAYWRIGHT_MODULE`, `CHROME_PATH`, `SMOKE_BASE_URL` theo môi trường.

## Luyện phát âm và thống kê

- Shadowing chuẩn bị dịch vụ trước khi mở micro. Chờ trạng thái **Đang thu** rồi nói, bấm **Dừng và chấm** khi xong; tự dừng sau 30 giây. **Hủy** bỏ bản thu và không ghi điểm.
- Bản thu được chuyển sang WAV mono 16 kHz trước khi gửi Azure chấm. Có thể nghe lại trong phiên; lỗi lưu cho phép **Lưu lại** với cùng mã lượt để tránh nhân đôi lịch sử.
- Bấm một từ trong kết quả để xem IPA, nghe mẫu và luyện riêng. Điểm luyện từ chỉ tồn tại trong phiên, không thay điểm cả câu và không tính hoàn thành bài.
- Tra IPA giới hạn 5 giây cho dịch vụ từ điển, 8 giây trên trình duyệt; lỗi tạm thời không được cache. Khung luyện từ có nút **Thử lại phiên âm**.
- Biểu đồ ngày dùng `shadowing_history`, gồm cả các lần luyện lại cùng câu. Trung bình 7/14/30 ngày tính theo số lượt, dùng ngày địa phương; phần tổng quan từng câu vẫn hiển thị điểm mới nhất. Không thể khôi phục các lượt chưa được ghi trước khi cài migration lịch sử.
- Trang Thống kê có tổng kết 7 ngày so với 7 ngày trước: ngày hoạt động, lượt ôn, nhật ký và phát âm. Mức thay đổi phát âm chỉ so sánh các câu xuất hiện ở cả hai tuần; gợi ý luyện lại dựa trên điểm gần nhất trong tuần, dưới 80.
- Kiểm tra tích hợp tùy chọn: `node scripts/check-shadowing-browser.mjs`, cùng bản build local và biến Playwright như `smoke-personalized.mjs`. Cần Azure trong `.env.local`; dùng một lượng nhỏ quota cho giọng tổng hợp, không mở micro thật và giả lập toàn bộ Supabase. Kiểm tra dừng/hủy, chuyển định dạng, chấm thật, lưu lại, cách ly điểm luyện từ, thống kê và giao diện mobile.

## Triển khai bản sửa tính toàn vẹn (2026-10-04)

Chạy migration mới trước khi triển khai code. Seed bài học từ `/admin/lessons` nếu CMS còn trống; app không phục hồi bài đã ẩn/xóa từ file tĩnh. Chi tiết vận hành và kiểm tra DB: [docs/learning-integrity.md](docs/learning-integrity.md).

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
