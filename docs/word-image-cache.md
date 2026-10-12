# Ảnh từ vựng do quản trị viên tải lên

Flashcard chỉ dùng ảnh được admin/biên tập viên chọn. Không tìm ảnh Openverse và không gọi AI. Nếu chưa có ảnh hoặc ảnh lỗi, bố cục tập trung vào từ và IPA, không giữ một khung tải ảnh trống.

## Cách sử dụng

Vào `/admin/vocabulary` (Quản trị → Ảnh từ vựng), tìm từ/nghĩa, chọn đúng mục, tải PNG/JPG/WebP tối đa 2 MB rồi bấm **Lưu ảnh**. Có thể thay hoặc gỡ ảnh. Một ảnh được dùng chung cho các thẻ có cùng từ và nghĩa; các nghĩa khác nhau có ảnh riêng.

## Lưu trữ

- Dùng bảng `word_images` từ `db/migrate_word_images.sql` đã có và bucket private `lesson-audio` của CMS. Không cần migration mới nếu đã tạo hai thành phần này.
- File thật được lưu vào `vocab-images/<hash>/<uuid>.<ext>` trong Supabase Storage. Bảng lưu đường dẫn, từ, nghĩa, marker `origin: upload`; không lưu binary trong SQL.
- Chỉ server có service-role được đọc/ghi. POST/DELETE kiểm tra quyền CMS, kích thước, MIME và chữ ký file. Không nhận SVG hoặc đường dẫn storage tùy ý từ client.
- Server ký URL ảnh trong một giờ. Trình duyệt cache metadata tối đa năm phút, cache mục chưa có ảnh 15 giây; trình duyệt quản trị làm mới ngay sau khi lưu. Người học có thể mở lại trang sau tối đa năm phút để nhận thay đổi từ admin khác.
- Cache tự tìm ảnh cũ không còn được đọc: đổi hash DB, namespace localStorage và phiên bản URL API. Không xóa các dòng Openverse cũ nhưng chúng không xuất hiện trên flashcard.
- Upload DB thất bại sẽ dọn file mới; thay ảnh thành công sẽ dọn file cũ. Gỡ ảnh xóa liên kết DB trước rồi dọn storage.

## Phát âm

Mặt trước flashcard hiện từ tiếng Anh và IPA nguồn, cùng hai nút US/UK. Dữ liệu accent lấy từ Free Dictionary API khi nguồn phân biệt được giọng qua audio. IPA PDF không được tự gán vào một accent. Nếu thiếu audio, dùng đúng voice `en-US` hoặc `en-GB` trên thiết bị; nếu thiết bị thiếu voice đó, thông báo rõ. Không dùng giọng Mỹ thay cho nút UK. Phiên âm thiếu không được AI tự suy đoán. Bản ghi micro chỉ ở trong trình duyệt.

Bản thu chờ quá 3 giây hoặc phát lỗi sẽ tự chuyển sang giọng thiết bị. Danh sách giọng được chờ tối đa 2 giây khi trình duyệt tải chậm; nếu giọng không bắt đầu đọc sau 4 giây, giao diện báo lỗi và cho thử lại trực tiếp bằng giọng thiết bị. Nút chỉ ở trạng thái đang phát khi playback thực sự bắt đầu. Đổi giọng hoặc rời thẻ sẽ hủy âm thanh và các lần chờ cũ. Không gọi Gemini hoặc dịch vụ TTS trả phí.
