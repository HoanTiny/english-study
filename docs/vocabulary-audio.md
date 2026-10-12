# Audio từ vựng lưu sẵn

## Sử dụng

- Chạy `db/migrate_word_audio.sql` một lần. Dùng lại bucket private `lesson-audio`, không đổi quyền bucket hiện có.
- Vào **Quản trị → Từ vựng → Audio US/UK**. Có thể chuẩn bị bản thu miễn phí cho toàn bộ bộ từ hoặc cho từ đang chọn, tải file MP3/OGG/WAV tối đa 2 MB, nghe thử, thay hoặc gỡ riêng từng giọng. IPA từng giọng là trường tùy chọn; không tự suy ra từ IPA nguồn PDF.
- Bộ tài liệu có 943 mục khác nhau sau khi gộp các mục trùng. Không phải mục nào cũng có đủ hai giọng từ nguồn miễn phí, nhất là các cụm từ. Giao diện hiển thị số bản đã lưu thực tế và những lần nhập thiếu/lỗi.
- Giữ tab mở khi nhập qua quản trị. Dừng sẽ hoàn tất từ hiện tại; mở lại/chạy lại sẽ bỏ qua những bản đã có. Bản người biên tập tải lên không bị đợt nhập tự động ghi đè.

## Nhập bằng dòng lệnh

Tại thư mục dự án, sau khi cấu hình `.env.local`:

```powershell
node scripts/cache-vocabulary-audio.mjs
node scripts/cache-vocabulary-audio.mjs --import
node scripts/cache-vocabulary-audio.mjs --import --word=sister
node scripts/cache-vocabulary-audio.mjs --import --retry-missing
```

Lệnh đầu chỉ xem số lượng. Các lệnh `--import` lưu file thực lên Supabase. Báo cáo/checkpoint nằm trong `data/vocabulary-audio-report.json`; chạy lại tiếp tục các mục chưa kiểm tra hoặc có lỗi. `--retry-missing` tra lại cả mục nguồn trước đó chưa có. Import tuần tự, nghỉ giữa các từ và dừng khi nguồn trả 429; không tiếp tục bắn request vào nguồn đang giới hạn.

## Cách hoạt động

### Tạo giọng US/UK bằng Kokoro trên máy

Chạy từ thư mục source thật `D:\Work\english-study`. Nếu máy đã tạo bộ thử 20 từ, lệnh chuẩn bị dùng lại runtime đó. Để chuẩn bị trên máy mới:

```powershell
node scripts/setup-kokoro-audio.mjs
npm --prefix .audio-cache/runtime install
```

Script ghim bộ phiên âm Misaki ở commit `fba1236595f2d2bf21d414ba6e57d25256afada3`, tải cả giấy phép; runtime dùng `kokoro-js@1.2.1`. Mô hình ONNX sẽ tải trong lần tạo đầu tiên, sau đó dùng cache trên máy. Không đưa runtime/model vào bundle Next.js.

```powershell
# Chỉ xem kế hoạch và các mục chưa đủ căn cứ phát âm
node scripts/prepare-kokoro-audio.mjs
# Tạo và lưu tối đa 100 mục còn thiếu; chạy lại để tiếp tục đợt sau
node scripts/prepare-kokoro-audio.mjs --publish --limit=100 --batch-size=25
# Hoàn thành toàn bộ mục có phiên âm, theo các đợt 50 mục
node scripts/prepare-kokoro-audio.mjs --publish --limit=1000 --batch-size=50
# Chỉ tạo file cục bộ, chưa ghi Supabase
node scripts/prepare-kokoro-audio.mjs --generate --limit=20
```

Giọng US là `af_heart`, UK là `bf_emma`. Script dùng phiên âm riêng từng giọng từ lexicon, chọn nghĩa đã đối chiếu với khóa học cho từ đồng tự, và hiệu đính một số từ theo Oxford (bao gồm husband, triplet, aunt). Các từ vay mượn có mục từ rõ ràng được bổ sung sau khi đối chiếu: [banh mi — Oxford](https://www.oxfordlearnersdictionaries.com/definition/english/banh-mi), [Tet — Collins](https://www.collinsdictionary.com/dictionary/english/tet), mancala theo [Merriam-Webster US](https://www.merriam-webster.com/dictionary/mancala) và [Collins UK](https://www.collinsdictionary.com/dictionary/english/mancala). Từ ngoài lexicon/tên riêng chưa xác định sẽ được giữ lại để duyệt; không đoán rồi tự xuất bản. IPA hiển thị được lấy riêng từ bộ tham chiếu đã hiệu đính, không chuyển ký hiệu mô hình thành IPA cho học viên. Việc hiệu đính IPA không có nghĩa từng file đã được người biên tập nghe duyệt.

Mỗi file được kiểm tra token phiên âm không bị rơi, waveform không im lặng, thời lượng, âm lượng và hash. Synthesis chạy tuần tự trên CPU; tối đa 3 lượt lưu Supabase cùng lúc. Không dùng Gemini/Azure hoặc token API khi tạo/nghe, nhưng vẫn sử dụng dung lượng và băng thông Supabase.

- `.audio-cache/kokoro-progress.json`: checkpoint để tiếp tục, cùng kết quả/lỗi từng giọng.
- `.audio-cache/kokoro-plan.json`: phiên âm và các mục cần duyệt.
- `.audio-cache/audio/`: WAV gốc đã tạo; file hợp lệ được dùng lại khi tiếp tục.
- `public/audio-trial/batch-progress.json`: số lượng thực tế, cập nhật mỗi 10 mục. Trang nghe thử đọc số liệu mỗi 15 giây.
- Các thư mục cache/bộ thử đều bị Git bỏ qua. Các file học viên dùng được lưu bền vững trên Supabase.

Chạy lại lệnh sẽ bỏ qua mọi bản đã có trong DB, kể cả bản người thật hoặc file tải thủ công, và chỉ lưu phần còn thiếu. File mới được ghi rõ là giọng tổng hợp trong nguồn âm thanh. Admin có thể nghe và tải bản thu tốt hơn lên để thay từng giọng.

Dùng Ctrl+C với tiến trình đang chạy để dừng sau phần đang xử lý. Nếu bị tắt đột ngột, kiểm tra PID trong `.audio-cache/kokoro.lock`; chỉ xóa file khóa khi PID không còn chạy, rồi chạy lại lệnh cũ. Không chạy hai job cùng lúc. `--refresh-trial` chỉ dùng khi bộ 20 từ và manifest đã tồn tại; cập nhật mẫu cùng tham số phiên bản URL để tránh nghe nhầm cache cũ.

Tham khảo: [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), [Misaki](https://github.com/hexgrad/misaki).

### Hiệu đính IPA và thay bản AI

Phiên bản `2026-10-12.1` có 933/943 mục riêng biệt với cả IPA US và UK; 10 tên riêng được giữ lại, không đọc bằng cách đoán. `src/data/vocabulary-pronunciation.json` lưu nguồn từng mục; `vocabulary-ipa.json` là bản nhỏ dùng trên mobile. Xem giấy phép trong `data/PRONUNCIATION-LICENSE.md`.

Sau khi đã tải dữ liệu tham chiếu vào `.audio-cache/ipa-review`, có thể tái lập và áp dụng đợt sửa:

```powershell
node scripts/build-pronunciation-reference.mjs --write
node scripts/select-reviewed-recordings.mjs
node scripts/fetch-reviewed-recordings.mjs
# Cần Playwright/Edge; đặt PLAYWRIGHT_MODULE nếu runtime nằm ngoài dự án
node scripts/validate-reviewed-recordings.mjs
node scripts/repair-vocabulary-audio.mjs
node scripts/repair-vocabulary-audio.mjs --apply
node scripts/refresh-audio-trial.mjs
```

Lệnh sửa mặc định chỉ xem kế hoạch. `--apply` sao lưu toàn bộ metadata trước khi ghi, chỉ thay đúng phiên bản bản AI đã kiểm tra, bảo vệ bản người thật và file tải thủ công. Upload file mới trước, đổi con trỏ DB sau, giữ file cũ để khôi phục. Nếu có chỉnh sửa đồng thời thì bỏ qua thay vì ghi đè. Chạy lại an toàn để tiếp tục. Backup và báo cáo nằm trong `.audio-cache/ipa-review/db-before-*.json` và `db-repair-*.json`; cần giữ chúng khi dọn cache nếu muốn khôi phục.

Bản thu tham chiếu được lọc theo nhãn quốc gia của chính file, nghĩa từ, trọng âm và phiên âm nguồn; kiểm tra giải mã, thời lượng, âm lượng, hash trước khi lưu. Công cụ nhận diện âm vị chỉ dùng sàng lọc, không đo được độ tự nhiên hay xác nhận mọi trọng âm. Các bản AI còn lại vẫn được ghi rõ là tổng hợp, chưa được coi là đã nghe duyệt toàn bộ.

Kết quả đợt 12/10/2026: 1.866 file cho 933 cặp US/UK, gồm 841 bản người thật và 1.025 bản AI. Đã thay 818 bản AI, giữ nguyên 23 bản người thật có sẵn. `data/pronunciation-review.json` ghi số liệu và giới hạn kiểm tra; `data/pronunciation-review-queue.json` liệt kê 462 bản AI được công cụ sàng lọc gắn cờ để ưu tiên nghe, không phải 462 lỗi đã xác nhận. Bộ thử 20 từ hiện có 31 bản người thật và 9 bản AI. Các số liệu này là ảnh chụp tại thời điểm kiểm tra, không phải thống kê trực tiếp.

### Kho audio và phát lại

`word_audio` lưu một đường dẫn file theo `(word, accent)`, IPA nếu có và thông tin nguồn. File thực có tên phiên bản riêng dưới `vocab-audio/`; upload xong mới cập nhật DB, lỗi DB sẽ dọn file mới và giữ liên kết cũ. Server kiểm tra quyền CMS cho mọi thao tác ghi. Học viên chỉ nhận URL ký có hạn, không nhận service-role key hoặc quyền truy cập tùy ý bucket.

API phát âm ưu tiên bản đã lưu trước mọi cache từ điển. Khi có bản lưu, không chờ nguồn từ điển. Giọng chưa có dùng cơ chế dự phòng của thiết bị. Cache metadata trình duyệt tối đa 5 phút, URL ký 1 giờ; sau khi admin thay file, học viên có thể tải lại trang để cập nhật ngay.

Flashcard tải trước tối đa audio của thẻ hiện tại và thẻ tiếp theo (4 file), dùng lại media element đã đệm khi bấm nghe. Chỉ tải trước file đã lưu, tôn trọng chế độ tiết kiệm dữ liệu nếu trình duyệt cung cấp. Rời trang sẽ hủy các lượt tải trước. Đây là kho dùng chung trên Supabase, không phải chế độ học offline.

Nguồn nhập lấy bản thu có nhãn US/UK rõ ràng và giấy phép CC BY, CC BY-SA hoặc public domain từ Wikimedia Commons. Giữ tác giả, giấy phép và liên kết bản gốc, hiển thị trong **Nguồn âm thanh** trên thẻ. Ưu tiên MP3; dùng bản OGG gốc nếu MP3 không tải được. Không tạo âm thanh bằng Gemini/Azure; lượt nhập và nghe chỉ dùng lưu trữ/băng thông hiện có.

Tham khảo: [Supabase: serving assets](https://supabase.com/docs/guides/storage/serving/downloads), [Free Dictionary API](https://dictionaryapi.dev/), [Wikimedia: API etiquette](https://www.mediawiki.org/wiki/API:Etiquette).
