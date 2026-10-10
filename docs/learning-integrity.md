# Bản sửa tính toàn vẹn — 2026-10-04

## Triển khai

1. Sao lưu DB, chạy các migration hiện có (bao gồm roles, CMS, journal/shadowing), sau đó chạy `db/migrate_learning_integrity.sql` trong Supabase SQL Editor.
2. Cấu hình `SUPABASE_SERVICE_ROLE_KEY` trên server. Hạn mức API cần key này; thiếu bảng/hàm quota sẽ trả 503, không gọi dịch vụ có phí.
3. Deploy code cùng bản migration. Nếu CMS trống, đăng nhập admin và seed bài học. CMS là nguồn nội dung xuất bản duy nhất; dữ liệu tĩnh chỉ dùng seed và hai công cụ IPA/hội thoại.
4. Kiểm tra bằng tài khoản thường: cập nhật tên được, thay `role` bằng insert/upsert/update phải thất bại. Admin đổi vai trò qua server vẫn hoạt động.
5. Kiểm tra CMS trên DB thử nghiệm: lưu cụm hợp lệ thành công; lỗi insert phải rollback toàn bộ thay đổi. Ẩn bài rồi kiểm tra cả lộ trình lẫn URL trực tiếp.

## Thay đổi dữ liệu và hành vi

- Quiz đạt ít nhất 80% mới hoàn thành bài; kết quả đạt được lưu theo user/slug. Dấu hoàn thành localStorage cũ không chuyển tự động vì không biết thuộc tài khoản nào và không có điểm chứng minh.
- Lưu cụm từ là đã bắt đầu bài, không đồng nghĩa vượt qua quiz. Công cụ IPA/hội thoại không nằm trong mẫu số phần trăm hoàn thành.
- Thẻ FSRS cũ được chuyển dần khi ôn tiếp; quá khứ không có đủ dữ liệu để phục dựng chính xác. Thẻ mới lưu đầy đủ trạng thái và thời điểm đến hạn trong `fsrs_card`.
- Điểm shadowing cũ được giữ nguyên, gắn `legacy` và không đưa vào thống kê vì trước đây điểm thật/giả không được phân biệt. Điểm mới từ luồng Azure gắn `azure`. Đây là nguồn do client ghi nhận, không phải chứng thực chống gian lận.
- Ngày học dùng múi giờ thiết bị. Nhật ký đã lưu theo UTC không đổi ngày hồi tố vì không có múi giờ gốc.
- Streak tăng sau hoạt động lưu thành công (ôn thẻ, nhật ký, shadowing, quiz đạt), không tăng chỉ vì mở app. Lịch sử streak cũ được giữ.
- API AI/Speech: 20 yêu cầu/phút và 200/ngày/user; trần 5.000/ngày toàn ứng dụng, gồm cả tài khoản ẩn danh. Giới hạn body 16 KB, URL 2 KB, hội thoại 40 lượt và 2.000 ký tự/lượt. Quota nằm trong Postgres nên dùng chung giữa các server. Yêu cầu bị từ chối quota vẫn tính vào bộ đếm chống lạm dụng. Điều chỉnh các ngưỡng trong SQL theo tải thực tế. Token Speech vẫn có thể được sử dụng trực tiếp trong thời gian sống của nó; hạn mức ở đây kiểm soát cấp token, không đo phút âm thanh Azure.
- Lỗi AI nhật ký không sinh phản hồi giả; nhật ký vẫn lưu được và thông báo AI chưa sẵn sàng. Lỗi lưu DB không hiển thị như đã lưu thành công.

## Xác minh

### Kiểm tra kết nối thật từ máy phát triển

Hai script đọc `.env.local` bằng `@next/env`, không in khóa hay token:

- `node scripts/check-live-services.mjs` (hoặc `npm run check:services`): kiểm tra các cột/bảng cần thiết bằng truy vấn `limit=0`, kiểm tra RPC qua schema REST và yêu cầu một token Azure. Không sửa DB, không đọc bản ghi người học. Mã thoát khác 0 khi thiếu cấu hình/schema hoặc kết nối thất bại. Kiểm tra này dùng service role nên **không chứng minh RLS**.
- `node scripts/check-azure-speech.mjs` (hoặc `npm run check:speech`): tạo một câu giọng tổng hợp ngắn rồi gửi tới Azure chấm phát âm; kiểm tra điểm tổng, điểm thành phần và chi tiết từ. Dùng một lượng nhỏ quota Speech. Không ghi âm microphone và không lưu dữ liệu vào Supabase.

Kết quả ngày 2026-10-04: Azure cấp token HTTP 200; chấm mẫu tổng hợp thành công (85.8 tổng, 92 chính xác, 79 trôi chảy, 100 đầy đủ, 6 từ). Endpoint Supabase trong cấu hình trả DNS `ENOTFOUND`; chưa chạy migration, chưa kiểm tra lưu/tải lại hay RLS trên hai tài khoản thật. Cần xác nhận trạng thái dự án và URL trong Dashboard trước khi tiếp tục; lỗi DNS chưa đủ để kết luận dự án bị xóa hoặc tạm dừng.

**Cập nhật sau khi khởi chạy lại Supabase (2026-10-04):** Dự án `qsmazqhmwfohaauimvkv` đã kết nối được. Sau xác nhận của chủ dự án, đã áp dụng ba migration `learning_integrity`, `personalized_study`, `shadowing_history` trong một giao dịch qua SQL Editor trên production. Kiểm tra lại REST: toàn bộ 9 bảng/cột kiểm tra trả HTTP 200 và 4 RPC cần thiết đều tồn tại.

Kiểm thử thật bằng hai tài khoản tạm đã đạt: đăng nhập, lưu trình độ, ngăn tự nâng role, lưu/đọc lịch sử Shadowing và chống trùng khi retry, ngăn đọc/ghi chéo tài khoản, lịch ôn lỗi và từ chối luyện lặp khi chưa đến hạn, quiz, giữ nguyên JSON FSRS, streak không cộng hai lần/ngày, giới hạn quyền gọi hàm server, rollback cập nhật cụm CMS khi insert lỗi, giữ audio cũ và ẩn bài CMS. Tài khoản và dữ liệu tạm đã được xóa sau kiểm tra. API `/api/speech-token` của ứng dụng localhost đã được kiểm tra với kết nối thật: chưa đăng nhập trả 401; có phiên hợp lệ thì kiểm tra quota qua DB, nhận token Azure và trả `Cache-Control: no-store`. Lượt kiểm tra hợp lệ này được tính trong quota chung ngày.

Để chạy lại kiểm thử có ghi dữ liệu: `node scripts/check-live-learning.mjs --write --project-ref=<project-ref>`. Có thể thêm `--app-url=http://127.0.0.1:3108` khi ứng dụng local đã chạy với cấu hình thật. Script tạo hai tài khoản tạm và một bài CMS ẩn, kiểm tra bằng JWT người học, rồi chỉ xóa các ID được tạo trong lượt chạy đó; không gửi email. Khi cleanup thất bại, script in ID cần dọn và trả mã lỗi. Không dùng script này nếu chưa cho phép ghi dữ liệu thử trên dự án đích.

Giới hạn còn lại: kiểm tra Azure dùng âm thanh tổng hợp; chưa xác minh quyền microphone/giọng người dùng trên thiết bị thực. Việc cập nhật DB không tự triển khai mã nguồn lên website production.

Sau khi kết nối Supabase hoạt động, kiểm tra các migration nền đã có, rồi áp dụng lần lượt `migrate_learning_integrity.sql`, `migrate_personalized_study.sql`, `migrate_shadowing_history.sql`. Chạy lại kiểm tra schema, sau đó xác minh lưu/lấy kết quả bằng tài khoản người học A và xác minh tài khoản B không đọc hoặc sửa được dữ liệu đó. Không dùng service role làm bằng chứng cách ly tài khoản.

Unit test kiểm tra trạng thái FSRS qua JSON, thời điểm đến hạn, lọc bài ẩn, tiến độ quiz, cách ly user, lỗi lưu và guard API. Cần kiểm tra migration/RLS trên Supabase thử nghiệm và các dịch vụ Azure/Gemini thực tế trước khi đưa lên production. Unit test không thay thế kiểm tra DB hoặc microphone trên trình duyệt.

## Buổi học cá nhân hóa

Sau migration integrity, chạy `db/migrate_personalized_study.sql` để bổ sung lịch ôn Sổ lỗi. Migration không xóa lỗi cũ. Lỗi chưa giải quyết được đưa vào hàng đợi ngay; lỗi từng tự đánh dấu đã nắm vẫn giữ nguyên trạng thái.

Buổi học 10/20/30 phút là kế hoạch theo số hoạt động, không phải đồng hồ bắt buộc. Hoạt động chỉ tăng tiến độ sau khi lưu thành công. Các mục tiêu được tính theo số thẻ/cụm/câu khác nhau; luyện lặp lại cùng một mục không tăng số lượng trong cùng buổi. Bước bỏ qua không được tính hoàn thành. Sau `migrate_study_session_sync.sql`, buổi học đồng bộ qua Supabase theo user/ngày và giữ bản trên thiết bị để thử gửi lại; hết hiệu lực khi sang ngày mới. Xem [quy tắc đồng bộ và triển khai](study-session-sync.md). Kết quả học và lịch ôn lỗi lưu trong Supabase.

Kết quả xếp lớp mở bài đầu của cấp tương ứng, giữ bài thấp hơn để ôn, không tự cấp chứng nhận hoàn thành bài cũ. Có thể vào lại `/onboarding` để xếp lớp lại. Khi lưu trình độ thất bại, không chuyển trang hay cập nhật cấp học trên giao diện.

Luyện lỗi dùng **tự đánh giá**, không so khớp cứng với một đáp án và không gọi AI chấm mới. Lịch: cần ôn lại → 10 phút; đúng lần 1 → 1 ngày; đúng lần 2 → 3 ngày; đúng lần 3 → đã nắm. SQL khóa hàng khi lưu và từ chối lỗi chưa đến hạn, tránh cộng liên tiếp bằng nhiều lần bấm. Người học vẫn có thể tự đánh dấu hoặc mở lại lỗi bằng nút riêng.

Kiểm tra DB thử nghiệm sau migration: tài khoản B không gọi được `practice_error` cho lỗi của A; hai lần gọi liên tiếp chỉ lần đầu được ghi; lỗi chưa đến hạn bị từ chối; nhánh cần ôn lại đưa chuỗi đúng về 0. Browser smoke dùng fixture kiểm tra điều hướng, lưu lỗi thất bại, phục hồi buổi sau tải lại và giao diện mobile; không xác minh những ràng buộc SQL này trên DB thật.
# Shadowing: lịch sử và nghe lại

Sau các migration trước đó, chạy `db/migrate_shadowing_history.sql` trước khi triển khai bản giao diện mới. Migration giữ bảng điểm mới nhất và thêm lịch sử qua trigger trong cùng giao dịch; khóa lượt luyện giữ nguyên khi thử lưu lại để tránh trùng lịch sử. RLS chỉ cho người dùng đọc lịch sử của mình. Lịch sử bắt đầu từ lần luyện mới sau migration, không thể khôi phục những lần cũ đã bị ghi đè.

Giao diện hiển thị 10 lượt gần nhất mỗi câu, điểm thành phần, từ cần sửa và chênh lệch hai lượt cuối. Câu có điểm mới nhất dưới 80 được ưu tiên từ ngày kế tiếp theo giờ thiết bị, kể cả trong gợi ý buổi học. 80 là ngưỡng luyện tập, không phải chứng nhận trình độ.

Bản thu chỉ giữ trong bộ nhớ trình duyệt để nghe lại lượt vừa thu; rời trang hoặc thu lượt mới sẽ xóa bản thu này. Âm thanh được gửi tới Azure để chấm, không được tải lên Supabase Storage. Chưa hỗ trợ nghe lại âm thanh của các lượt cũ. Luồng thu, dừng và chấm hiện tại cần MediaRecorder và Web Audio; thiết bị thiếu hỗ trợ sẽ hiển thị lỗi, không tạo điểm thay thế.

Kiểm thử tự động dùng dữ liệu giả lập. Cần cấu hình Supabase/Azure thật, áp dụng migration, rồi xác nhận quyền microphone, kết quả từng từ, lịch sử sau tải lại và cách ly dữ liệu giữa hai tài khoản trên môi trường triển khai.
