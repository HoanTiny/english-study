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

### Áp dụng design Figma (2026-05-30)
> Thiết kế: file Figma "Untitled" (P8ts69z7…), kết nối qua Figma MCP. Hướng: re-skin theo design (teal/sáng/phẳng), pha chút liquid-glass.
- [x] **Design tokens**: bảng màu teal (`#2B788B` primary, `#C3DCE3` soft, `#945069/#F2D4DC` pink, nền `#F6F5F4`, viền `#E0E0E0`, chữ phụ `#757575`) cho cả light + dark (dark retune teal). Biến mới: `--primary-soft`, `--pink`, `--pink-soft`.
- [x] **Fonts**: thêm **Dela Gothic One** (heading, class `.font-display`) + **Montserrat** (body) — Google Fonts mở, hỗ trợ tiếng Việt.
- [x] **Class dùng chung** chuyển từ liquid-glass → phẳng mềm (cascade ra mọi trang): `liquid-glass-card` (thẻ trắng viền nhạt + bóng mềm), `liquid-glass-btn` (pill teal đặc), `liquid-nav` (thanh phẳng), tắt blob nền, `text-gradient-iridescent` → teal đặc.
- [x] **Nav**: thanh phẳng top-bar (logo Dela Gothic teal + active teal-soft), giữ hamburger mobile.
- [x] **Trang chủ `/`**: layout theo design (hero eyebrow + heading display + CTA teal + stats 180+/22+, 3 section xen kẽ mini-game/từ vựng/tiến độ), giữ showcase game + roadmap.
- [x] Đã xem trực tiếp trên Chrome (light + dark) — đồng nhất. `next build` sạch (15 route).
- [ ] (Tùy chọn) Bộ minh hoạ 3D bản quyền hợp lệ để thay emoji placeholder; restyle sâu các trang con nếu cần.
- Trang `/preview` giữ làm bản đối chiếu (có thể xoá sau).

#### Triển khai 11 màn Figma (đợt 2) — 2026-05-30
- [x] **Sprint game**: chỉnh màu theo design (Right=teal-soft, Wrong=pink-soft, bỏ gradient indigo); cấu trúc play+results vốn đã khớp design (timer tròn, x mult/điểm, "I know/I don't know").
- [x] **Trang Thống kê** `/statistics` (mới): tabs Hôm nay/Toàn thời gian (underline teal), số liệu THẬT từ `loadDashboard` (Ôn tập SRS + Shadowing), **biểu đồ recharts** điểm phát âm theo câu, empty state khi chưa có dữ liệu. Thêm link "Thống kê" vào Nav. Dep mới: `recharts`.
- [x] **Audio-call game** `/audio-call` (mới, build lại đúng design 6:946/1017/1054): game NGHE **trắc nghiệm + mạng** — nghe TTS → chọn nghĩa đúng trong 5 lựa chọn; 5 tim, chọn sai/"I don't know" mất 1 tim; sau khi chọn hiện ảnh (emoji) + nhãn từ + đáp án đúng (teal)/sai (pink) + Next; phím 1-5/Space/Enter; hết tim → kết quả (mạng còn + từ đã nghe + I know/I don't know). Link từ section mini-game trang chủ.
- [x] **Sprint welcome**: vòng cấp độ tô màu theo design (A1 lá · A2 vàng · B1 đỏ · B2 đỏ đậm · C1 tím · C2 teal).
- [x] `next build` sạch — 17 route.
- Lưu ý: 6 link Figma trỏ nhầm vào lớp Nav (không phải màn riêng) → chưa rõ có màn Audio-call/Classbook/About bản đầy đủ; Classbook (feed xã hội) khuyên cân nhắc vì lệch định vị app.

### Tính năng Từ vựng (Active Recall) — 2026-05-30
> Dựa trên doc người dùng cung cấp (Lexical Approach + Active Recall + Contextual Flashcard). Tách thành tính năng riêng.
- [x] **`/vocab` nâng thành THƯ VIỆN bộ thẻ** (2026-05-30, tham khảo Parroto): gom theo collection (Khởi đầu A1 / Mở rộng A2 / Giao tiếp B1+), mỗi bài = 1 bộ thẻ (bìa gradient + emoji + badge CEFR + số thẻ). Click bộ → vào phiên học. **Khác/hơn Parroto**: tất cả miễn phí (không PRO khóa), mỗi thẻ học bằng Active Recall + audio bản xứ + câu ví dụ AI (✨).
- [x] **Import từ vựng theo chủ đề + học theo TỪ ĐƠN** (2026-05-30):
  - (Lần 1, PDF) — bỏ: PDF lỗi font, đã thay bằng nguồn Excel sạch hơn.
  - (Lần 2, **Excel** — dùng) 21 file `.xlsx` người dùng gửi (mỗi file = 1 chủ đề). Đọc bằng SheetJS → **431 từ, 395 có IPA chuẩn + nghĩa Việt sạch** (kể cả mẫu câu chào hỏi). Script `scripts/import-xlsx.mjs` → `src/data/vocab.json`.
  - `/vocab` thêm collection **"Từ vựng theo chủ đề"** (21 chủ đề: Con vật nuôi, Cảm xúc, Máy tính & Internet, Trường học…; badge "Từ đơn" + số từ + IPA). Học **theo từ đơn** (không chỉ cụm) — cả 3 chế độ Flashcard/Đoán/Trắc nghiệm; guard khi thẻ không có câu ví dụ. Audio từ đơn = phát âm bản xứ (Free Dictionary). `next build` sạch (20 route).
- [x] **Nâng UI học từ vựng + nối Sổ tay/Ôn tập** (2026-05-30, theo ảnh Parroto): Flashcard reveal có **4 nút FSRS** (Học lại/Khó/Tốt/Dễ kèm nhãn thời gian) → bấm = lưu từ vào **Sổ tay (notes)** + đẩy vào **Ôn tập FSRS** với điểm tương ứng. Thêm **✓ Thành thạo** (đã thuộc, bỏ qua, không ôn) và **🔖 Lưu vào sổ tay** (lưu để xem lại). Chế độ Đoán/Trắc nghiệm cũng có nút "Lưu vào sổ tay" (từ sai → lịch ôn sớm). Có toast xác nhận. Đã kiểm chứng: từ lưu từ vocab xuất hiện ở `/review` với thanh Sức mạnh trí nhớ + 4 nút chấm.
- [x] **Học theo từng từ ĐA CHẾ ĐỘ** (2026-05-30, theo Parroto): tab chuyển 3 chế độ trong phiên học — **Flashcard** (lật, tự chấm), **Đoán/gõ** (gõ cụm + ô trống trong ví dụ + Gợi ý + kiểm tra), **Trắc nghiệm** (nghĩa → chọn 1/4 cụm, phản hồi đúng/sai màu). Dùng chung tiến độ + audio + (Flashcard) câu ví dụ AI. Đã xem 3 tab + Flashcard + Trắc nghiệm trên Chrome.
- [x] **Trang `/vocab` "Từ vựng"** (luồng học): luyện **nhớ chủ động** — hiện nghĩa Việt + nghe phát âm (audio người bản xứ cho từ đơn, fallback TTS) → người học tự bật ra cụm → "Hiện đáp án" lật xem cụm + IPA + câu ví dụ (ngữ cảnh) → tự chấm "Nhớ được / Chưa nhớ". Phiên 20 cụm, lọc cấp độ (Tất cả/A1/A2/B1+), nguồn = 180 cụm trong `lessonContent`, màn kết quả. Thêm "Từ vựng" vào Nav.
- [x] **Game Ghép cụm `/collocations`** (mới, theo Lexical Approach): ghép động từ ↔ tân ngữ đi kèm (make→a decision, take→a break…); mỗi vòng 5 động từ khác nhau, ghép đúng khóa teal + đọc cụm + hiện nghĩa, điểm số, vòng tiếp theo. Link từ trang Từ vựng. Không dùng cơ chế "tim" (theo khuyến nghị doc).
- [x] **Gemini sinh câu ví dụ đa dạng**: `POST /api/example-sentence` ({en,vi} → câu tiếng Anh mới + dịch, fallback khi chưa cấu hình key). Nút "✨ Câu ví dụ khác (AI)" ở mặt sau thẻ Từ vựng → tạo câu ngữ cảnh mới + đọc audio (chống học vẹt, theo doc). Đã test với key thật.
- [x] **Game Ghép cụm `/collocations`** (xem trên).
- [x] `next build` sạch — 20 route.
- [x] **Nâng SM-2 → FSRS** (2026-05-30): `src/lib/srs.ts` viết lại dùng **ts-fsrs** (mô hình difficulty/stability/retrievability). **Không migration DB** — tái dùng cột cũ: `ease_factor`↔difficulty, `interval_days`↔stability(làm tròn), `repetitions`↔reps, `due_date`. `reviewRepo`/UID giữ nguyên (4 nút Lại/Khó/Tốt/Dễ). "mastered" = stability ≥ 21 ngày. Thêm hàm `memoryStrength()` + thanh **"🧠 Sức mạnh trí nhớ"** trên thẻ ôn tập.
  - Kiểm chứng: node test (good→2→11→46→163d, again→2d, easy→8d) + e2e trên Chrome (đẩy thẻ → ôn → chấm Tốt → bar đổi "Thẻ mới"→"21%·~2d", lưu Supabase). `next build` sạch (20 route).
  - Lưu ý còn lại: doc phê phán cơ chế "tim/mạng" — cân nhắc ở Audio-call.

### Ngữ pháp (cấu trúc câu) + Mẫu câu giao tiếp — 2026-05-31
> Nguồn: 7 file Excel câu giao tiếp người dùng gửi (Restaurant, thời tiết, lời khen, du lịch, câu giao tiếp mọi tình huống…). 434 câu.
- [x] **Tính năng Grammar `/grammar`** (mới): dùng Gemini phân tích 434 câu → rút **28 cấu trúc câu** chuẩn (khung dạng `I'd like to [verb]`, `It's [adj] to [verb]`…) + giải thích cách dùng (VN) + ví dụ + cấp độ A1/A2/B1. Script `scripts/extract-grammar.mjs` → `src/data/grammar.json`. Trang có lọc cấp độ + audio ví dụ. Thêm "Ngữ pháp" vào Nav.
- [x] **Mẫu câu giao tiếp** trong `/vocab`: 434 câu (19 nhóm tình huống) thành collection deck "Câu" — học bằng Flashcard/Trắc nghiệm. `src/data/sentences.json` (script `import-xlsx.mjs` mở rộng đọc mọi sheet).
- [x] **Chế độ Luyện tập Grammar** (2026-05-31): tab "✍️ Luyện tập" trong `/grammar` — mỗi cấu trúc, người học **tự đặt câu** → `POST /api/grammar-check` (Gemini) chấm: ✓ Tốt lắm / ✗ Cần chỉnh + câu sửa gợi ý (có audio). Đã test e2e: câu đúng → khen, câu sai → sửa.
- [x] `next build` sạch — 22 route. Đã xem `/grammar` (tra cứu + luyện tập) trên Chrome.

### Bổ sung 3 tính năng (đối chiếu yêu cầu) — 2026-05-31
- [x] **Accent UK & US + thu âm nghe lại**: `/api/pronounce` tách `us`/`uk` (audio + IPA) từ Free Dictionary. Component `PronounceBar` (nút 🔊 UK / 🔊 US đối chiếu + 🎙️ Thu âm / ▶️ Nghe lại bằng MediaRecorder) gắn vào reveal Flashcard ở `/vocab`. (Đã test API: "water" → US /ˈwɔtəɹ/ + UK /ˈwɔːtə/.)
- [x] **Module "3 thì cơ bản"** trong `/grammar` (tab 🕐): Simple Present / Present Continuous / Simple Past — bảng công thức (KĐ/PĐ/NV), khi nào dùng, dấu hiệu, ví dụ có audio. Nội dung GỐC (`src/data/tenses.ts`), không copy giáo trình. Link sang Luyện tập đặt câu.
- [x] **Cambridge Dictionary**: không nhúng trực tiếp được (không có API miễn phí; scrape vi phạm ToS; iframe bị chặn). Giải pháp hợp lệ: nút **"📖 Tra trên Cambridge ↗"** trong `PronounceBar` → mở trang Cambridge Anh–Việt cho từ đó (tab mới). Audio/IPA trong app vẫn dùng Free Dictionary.
- [x] Phần "danh sách Cambridge/British Council": KHÔNG import (bản quyền) — dùng nguồn hợp lệ sẵn có + tính năng tra nghĩa/ví dụ/audio đã đủ chức năng tương đương.
- [x] `next build` sạch — 22 route. Đã xem `/grammar` (3 thì) trên Chrome.

### Luyện nghe theo chủ đề (2026-05-31, kiểu Parroto)
- [x] **Trang `/listening`** (mới, vào Nav "Luyện nghe"): chip chủ đề (Hội thoại hằng ngày · BBC 6 Minute English · Phát âm & IPA) → grid video (thumbnail i.ytimg + level + kênh) → click mở **trình phát YouTube nhúng** (`youtube-nocookie`, hợp lệ ToS) + hướng dẫn luyện (không phụ đề → có phụ đề → shadowing) + link sang Shadowing chấm điểm.
- [x] Nguồn UY TÍN, MIỄN PHÍ tìm qua WebSearch. **Mở rộng 7 chủ đề** (`src/data/listenVideos.ts`, ~30 video): Hội thoại hằng ngày (VOA), Du lịch, Truyện cho trẻ em (Fairy Tales), Phát âm & IPA (Rachel's English), BBC 6 Minute English, TED-Ed, Luyện thi IELTS. Mỗi video gắn cấp độ A1/A2/B1/B2.
- [x] **Bộ lọc cấp độ** (Tất cả/A1/A2/B1/B2) trên trang Luyện nghe — lọc video trong chủ đề đang chọn. Đã test: chọn A2 → chỉ còn video A2.
- [x] **Bài tập nghe – Chép chính tả** `/dictation` (2026-05-31): nghe audio (TTS) câu giao tiếp → gõ lại → chấm (khớp 100% hoặc ≥90% từ = đúng, ≥50% = "gần đúng") + hiện đáp án + nghĩa Việt. Gamify: **điểm + chuỗi đúng 🔥 + tiến độ + màn kết quả** (đúng/chuỗi tốt nhất/điểm). Chọn chủ đề (19 nhóm câu) hoặc tất cả; phiên 10 câu; có nút Nghe lại / Gợi ý / Bỏ qua. Link nổi bật từ trang Luyện nghe. Đã test e2e trên Chrome.
- [x] **Chép chính tả – nâng cấp kiểu Parroto** `/dictation` (2026-05-31): bố cục 3 vùng (nghe | gõ | Bản chép). **Ô che TỪNG TỪ**, bấm 👁 lộ riêng từng từ (lộ thì không tính điểm); độ khó **Easy/Normal/Hard** (hiện chữ đầu / che theo độ dài / giấu cả độ dài); cột **Bản chép** liệt kê các đoạn, click nhảy đoạn + **thanh tiến độ %**; chấm tô xanh (đúng)/hồng (sai). 2 NGUỒN: **(a) Kho câu (TTS)** câu của app — hợp lệ 100%; **(b) Video YouTube** — dán link video có phụ đề → route `/api/yt-transcript` (lib `youtube-transcript`, endpoint timedtext không chính thức, học cá nhân) lấy transcript, đồng bộ phát đúng đoạn qua **YouTube IFrame Player API** (`YtPlayer.tsx`, seek + dừng sau N giây).
- [x] `next build` sạch — 26 route.

### Từ điển tra cứu trong app (2026-05-31, kiểu Parroto, nguồn FREE)
- [x] **`/api/dict?q=`**: Gemini cho nghĩa Việt + định nghĩa + ví dụ (tra cả **Anh→Việt và Việt→Anh**, tối đa 3 mục) + Free Dictionary cho **audio/IPA US-UK** thật. Không cần Cambridge (không có API free).
- [x] **`DictionaryModal`** + nút **"🔎 Tra từ"** trên Nav (mở popup tra). Mỗi kết quả: từ + loại từ + 🔊 UK/US + nghĩa Việt + định nghĩa EN + ví dụ EN/VI + **"+ Lưu"** (vào Sổ tay + Ôn tập FSRS). Đã test e2e: "xin chào"→hello/hi; "improve"→3 nghĩa, có audio.
- [x] **Bôi đen → tra nhanh** (2026-05-31): `SelectionLookup` (gắn ở layout, toàn app) — chọn 1 từ/cụm bất kỳ → hiện nút "🔎 Tra …" nổi cạnh chỗ chọn → mở `DictionaryModal` (nhận `initialQuery`, tự tra). Bỏ qua khi chọn trong ô nhập. Đã test e2e: double-click "meet" → tra ra 3 nghĩa + audio UK/US.
- [x] `next build` sạch — 23 route.

### Sửa UX trang Từ vựng (2026-05-31)
- [x] `/vocab` trước đây 1 trang cuộn dài (~62 bộ thẻ) → khó tìm. Nay có **3 tab danh mục lớn** ở đầu (📗 Theo bài học · 🔤 Từ theo chủ đề · 💬 Mẫu câu giao tiếp) kèm số bộ; chỉ hiện danh mục đang chọn. Thêm **ô tìm kiếm** lọc bộ thẻ theo tên. Component `DeckGrid` dùng chung. Đã xem trên Chrome — chuyển tab + lọc hoạt động.

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
