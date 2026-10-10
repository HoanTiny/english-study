# Đồng bộ buổi học và tổng kết tuần

## Triển khai

Sau các migration hiện có, chạy `db/migrate_study_session_sync.sql` trong Supabase SQL Editor, rồi deploy mã nguồn. Migration chạy trong một giao dịch, có thể chạy lại; thêm bảng và hàm mới, không xóa hay sửa dữ liệu học hiện có. Không cần biến môi trường mới.

- `study_sessions`: một dòng cho mỗi tài khoản/ngày, gồm kế hoạch JSON, số phiên bản tăng dần và thời điểm cập nhật. RLS cho tài khoản đăng nhập (kể cả tài khoản ẩn danh) đọc đúng dữ liệu của mình; không cấp quyền ghi trực tiếp.
- `sync_study_session`: chỉ nhận đúng tài khoản từ JWT, kiểm tra cấu trúc kế hoạch và khóa dòng khi so sánh phiên bản. Trả về bản mới nhất nếu có xung đột để trình duyệt gộp và gửi lại. Tham số tài khoản ngăn yêu cầu chờ từ phiên đăng nhập cũ ghi nhầm tài khoản mới.
- Dừng buổi lưu một dòng có `session = null` và tăng phiên bản; không xóa dòng. Thiết bị cũ có dữ liệu ngoại tuyến không thể khôi phục buổi đã dừng.

Nếu code được deploy trước migration, buổi học vẫn giữ bản trên thiết bị và báo chưa đồng bộ, có nút thử lại. Không được coi đây là đã đồng bộ thành công.

## Hành vi

- Đăng nhập cùng tài khoản trên hai thiết bị để tiếp tục buổi đang học. Tài khoản khách ẩn danh riêng trên hai thiết bị không tự hợp nhất.
- Đồng bộ khi mở app, có hoạt động, trở lại cửa sổ, có mạng và mỗi 30 giây. Mỗi yêu cầu có giới hạn 10 giây. Đây không phải kết nối Realtime.
- Trong cùng buổi, gộp các mục đã làm, loại trùng. Hoàn thành mục tiêu được ưu tiên hơn một thao tác bỏ qua đồng thời. Hoạt động chỉ được ghi vào buổi sau khi dữ liệu học gốc đã lưu thành công.
- Khi một thiết bị đã đổi sang buổi khác hoặc dừng buổi, thiết bị cũ nhận buổi hiện hành và hiển thị thông báo. Nếu hai thiết bị ngoại tuyến tự tạo hai buổi riêng, buổi được đồng bộ lên trước được giữ. Kết quả ôn thẻ/phát âm đã lưu vẫn còn dù kế hoạch cũ được thay.
- Thay đổi chưa gửi được giữ trong localStorage và gửi lại sau tải trang/kết nối lại. Nếu trình duyệt chặn hoặc hết dung lượng lưu, app báo rõ; dữ liệu còn trong bộ nhớ tab không được đảm bảo sau khi đóng tab.
- Buổi cũ chỉ có localStorage được chuyển khi mở app nếu chưa có buổi cloud khác. Buổi hết hiệu lực khi sang ngày mới theo múi giờ thiết bị; thiết bị có ngày khác nhau sẽ dùng buổi khác nhau.
- Hỗ trợ giữ và gửi lại tiến độ buổi; không cam kết toàn bộ bài học hoạt động ngoại tuyến. API AI, phát âm và lưu kết quả học vẫn cần kết nối.

## Tổng kết tuần

Dùng 14 ngày trong dữ liệu thống kê hiện có, chia hai khoảng 7 ngày không chồng lấp. Ngày có hoạt động gồm ôn thẻ, nhật ký hoặc chấm Shadowing; chưa bao gồm mọi loại hoạt động trong app. Điểm trung bình tính theo tất cả lượt chấm. Khi so sánh tiến bộ, lấy thay đổi điểm trung bình của từng câu được luyện ở cả hai tuần, rồi lấy trung bình các thay đổi đó để không đánh đồng việc đổi câu dễ/khó với tiến bộ. Không có câu chung thì báo chưa đủ dữ liệu.

Gợi ý luyện lại tối đa ba câu có điểm gần nhất trong tuần dưới 80. Không tính điểm luyện từng từ. Phân trang lịch sử ôn thẻ và phát âm để không bỏ qua các lượt sau giới hạn 1.000 bản ghi.

## Xác minh

- `npm test`: kiểm tra gộp tiến độ, xung đột/reset, thay đổi khi yêu cầu đang chờ, chuyển tài khoản, lưu cục bộ, phân trang, so sánh tuần và timeout/retry IPA.
- `node scripts/smoke-study-sync.mjs`: bản build placeholder giống `smoke-personalized.mjs`, địa chỉ mặc định `http://127.0.0.1:3107`; ba phiên trình duyệt biệt lập với Supabase giả lập. Kiểm tra tiếp tục buổi, ngoại tuyến/tải lại/thử lại, buổi bị thay ở thiết bị khác, tài khoản riêng, IPA lỗi rồi thử lại, tổng kết tuần và mobile. Cấu hình `PLAYWRIGHT_MODULE`, `CHROME_PATH`, `SMOKE_BASE_URL` nếu cần; `SMOKE_SYNC_SCREENSHOT` lưu ảnh tổng kết.
- `node scripts/check-study-sync-db.mjs`: chạy đúng migration hai lần trên PostgreSQL tạm trong bộ nhớ bằng PGlite. Cài `@electric-sql/pglite` ở thư mục công cụ riêng và đặt `PGLITE_MODULE` tới thư mục package; không dùng dữ liệu production. Kiểm tra RLS, quyền RPC, khóa phiên bản, reset và payload sai.
- `node scripts/check-live-study-sync.mjs --write --project-ref=<project-ref>`: chỉ chạy sau khi được phép ghi dữ liệu kiểm thử trên dự án đích. Dùng `.env.local`, tạo hai tài khoản tạm, đăng nhập với JWT người học để kiểm tra lưu/đọc, xung đột, reset và RLS; chỉ xóa các tài khoản/dữ liệu vừa tạo, không gửi email và không in token/key. Báo lỗi cùng ID cần dọn nếu cleanup thất bại.

Kiểm thử giả lập trình duyệt và PostgreSQL cục bộ không thay thế xác minh trên Supabase triển khai thực tế.

### Kết quả ngày 2026-10-07

Sau xác nhận của chủ dự án, đã chạy đúng `migrate_study_session_sync.sql` trên production `qsmazqhmwfohaauimvkv`; SQL Editor trả thành công. Kiểm thử bằng hai tài khoản tạm và hai phiên đăng nhập cho cùng một tài khoản đã qua: lưu/đọc từ phiên khác, chỉ một thao tác thắng khi ghi đồng thời cùng phiên bản, lưu tiến độ gộp, RLS cách ly tài khoản, từ chối reset từ tài khoản khác, từ chối ghi trực tiếp và truy cập không đăng nhập, từ chối payload sai, không phục hồi buổi cũ sau reset. Cả hai tài khoản và dữ liệu tạm đã được dọn thành công.

115 unit test đạt; TypeScript và build webpack đạt; ESLint không có lỗi (31 cảnh báo). Kiểm thử trình duyệt với Supabase giả lập đạt, gồm mobile không tràn ngang. DB production đã sẵn sàng; kết quả này không có nghĩa mã nguồn mới đã được deploy lên Vercel.
