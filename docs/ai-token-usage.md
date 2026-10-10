# Token Gemini và hạn mức người dùng

## Bật tính năng

1. Trong Supabase SQL Editor, chạy toàn bộ `db/migrate_ai_token_usage.sql`. Có thể chạy lại an toàn. Không gửi SQL hoặc service-role key xuống trình duyệt.
2. Chạy ứng dụng từ `D:\Work\english-study`; bản triển khai online cần cập nhật mã nguồn mới.
3. Đăng nhập admin, mở `/admin/users`. Chọn tháng để xem Input, Output, Suy luận, Tổng token, số lượt và chi tiết theo model/tính năng.
4. Đặt hạn mức cho từng tài khoản, bấm **Lưu hạn mức**. Để trống = không giới hạn; 0 = không cho sinh nội dung Gemini. Hạn mức gồm tổng token, áp dụng mỗi tháng theo UTC+7 (Asia/Bangkok, cùng giờ Việt Nam). Hạ hạn mức không xóa dữ liệu và không hủy các yêu cầu đã được chấp nhận trước đó.

Mặc định các tài khoản không giới hạn. Chưa có cơ chế hạn mức mặc định toàn hệ thống hoặc áp dụng hàng loạt. Người dùng và editor không được xem thống kê toàn hệ thống hoặc sửa hạn mức; cả API và RPC/database đều kiểm tra quyền.

## Cách tính

- Dùng `usageMetadata` của Gemini: `promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount`, `totalTokenCount`. Suy luận hiển thị riêng để không nhầm với văn bản đầu ra. Tổng lấy từ nhà cung cấp; không quy đổi thành tiền.
- Dữ liệu bắt đầu từ khi bật tính năng, không khôi phục lịch sử chưa ghi nhận. Lưu user ID, model, tính năng, thời gian và số token; không lưu prompt, câu trả lời, email hoặc API key trong bảng usage.
- Áp dụng mọi đường gọi qua `geminiGenerate`, gồm hội thoại, dịch, nhận xét, nhật ký, ngữ pháp, từ điển, ví dụ, truy vấn ảnh và OCR dùng Gemini. Azure Speech, OpenAI-compatible và Anthropic chưa có thống kê/hạn mức token ở đây. Nếu Gemini báo lỗi hạn mức nội bộ, ứng dụng không tự chuyển provider để né giới hạn đó.
- Đọc nội dung cache không gọi Gemini nên không phát sinh dòng token mới.

## Trước và sau khi gọi Gemini

- Xác thực tài khoản trước. Gọi `countTokens` để tính đầu vào, bao gồm system instruction và ảnh. Đây là một request đếm token bổ sung, không phải lượt sinh câu trả lời thứ hai.
- Database khóa theo user, trừ cả token đã dùng và đang tạm giữ. Giữ token input cộng 64 token dự phòng và tối đa 8192 token output/suy luận; gần hết hạn mức thì giảm `maxOutputTokens`. Nếu không còn ít nhất 256 token đầu ra sau phần input/dự phòng, từ chối yêu cầu trước khi sinh nội dung.
- Số đếm trước là dự toán; số thống kê cuối cùng luôn theo Gemini. Nếu provider báo sử dụng lớn hơn dự toán, vẫn ghi đủ thực tế và chặn các lượt sau. Đây là giới hạn ngân sách của ứng dụng, không phải cam kết trần hóa đơn của Google.
- Khi nhận phản hồi, cập nhật số thực tế đúng một lần và bỏ khoản tạm giữ tương ứng. Ngay cả đầu ra không parse được hoặc không có nội dung, usage hợp lệ vẫn được ghi nhận.
- Lỗi từ chối chắc chắn (400/401/403/404/429) giải phóng khoản giữ. Timeout, lỗi mạng, 5xx hoặc thiếu usage giữ khoản ngân sách với trạng thái chưa xác định. Không tự retry sinh nội dung để tránh tính nhiều lần mà không biết.
- Nếu chưa migrate hoặc database hỏng, không cho sinh nội dung mà bỏ qua kiểm tra hạn mức. Nếu lưu kết quả thất bại, reservation vẫn nằm trong database.

## Đối soát yêu cầu chưa xác định

Các dòng `pending` hoặc `uncertain` được hiển thị riêng dưới dạng token tạm giữ, không giả làm số thực tế. Không tự giải phóng theo thời gian vì provider có thể đã xử lý yêu cầu.

Quản trị database kiểm tra `ai_token_usage` theo ID, user, model và thời gian rồi đối chiếu nguồn sử dụng nếu có. Chỉ khi biết chắc kết quả mới gọi `settle_ai_tokens`: `completed` với đủ số thực tế hoặc `released` nếu xác nhận không phát sinh. Gọi lặp với dòng đã hoàn tất không cộng trùng. Không cung cấp nút tự xóa ngân sách chưa xác định trong UI.

## Kiểm thử

- `npm test`: kiểm thử ghi nhận, chặn quota, quyền admin, output cap, giữ/release ngân sách và dữ liệu sai.
- `node scripts/check-token-db.mjs`: database PostgreSQL cô lập qua PGlite; migration chạy lại, reservation, idempotency, chuyển tháng và quyền RPC/bảng. Cài dependency tạm bằng `npm install --prefix .next/token-db-test --no-audit --no-fund --package-lock=false @electric-sql/pglite` hoặc cung cấp `PGLITE_MODULE`.
- `scripts/check-token-admin.mjs`: Playwright, tài khoản/API giả lập, desktop/mobile, hạn mức số/0/null, dữ liệu sai, lỗi database. Dùng `SMOKE_BASE_URL=http://localhost:3000` và `PLAYWRIGHT_MODULE` khi Playwright không cài trong dự án.
- Không dùng tài khoản thật hoặc sinh token Gemini thật trong các bài kiểm thử tự động.

Tài liệu provider: https://ai.google.dev/api/tokens và https://ai.google.dev/api/generate-content#UsageMetadata.
