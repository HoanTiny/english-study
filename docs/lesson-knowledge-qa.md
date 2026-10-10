# Kiểm tra kiến thức bổ sung và tự luyện — 08/10/2026

## Website đang chạy

Đã mở `https://english-study-alpha-six.vercel.app` bằng Edge/Playwright ở kích thước 1440×1000 và 390×844.

- `/lesson/greetings` (A1), `/lesson/present-perfect` (A2), `/lesson/restaurant` (B1), `/lesson/relative-clauses` (B2): trang và các truy vấn CMS công khai trả về HTTP 200, hiển thị nội dung bài.
- Các trang được kiểm tra không có tràn ngang hoặc lỗi JavaScript không được xử lý.
- `/grammar` vẫn hiển thị 94 cấu trúc, 3 thì. Các bài chưa có mục “Hiểu sâu & vận dụng”: phiên bản mở rộng trong workspace chưa được triển khai.
- `/admin/lessons` hiển thị yêu cầu đăng nhập admin. Không kiểm tra hoặc thay đổi dữ liệu quản trị.
- Kiểm tra công khai chặn mọi yêu cầu ghi, bao gồm đăng nhập ẩn danh. Vì vậy thông báo `Failed to fetch` từ auth và trạng thái tải lộ trình trong phiên này do điều kiện kiểm tra; không kết luận đây là lỗi website. Không kiểm tra lưu tiến độ thật, tài khoản admin hay phát audio thật trong lượt này.

## Bản mới trên máy cục bộ

88 câu tự luyện thuộc 44 bài có ô nhập, kiểm tra/đối chiếu, lời giải và thử lại. Bảng đáp án tự động chỉ áp dụng cho các câu ngắn đã biên soạn; câu dịch, viết lại và câu mở còn lại dùng tự đối chiếu. Không dùng so khớp chuỗi để kết luận câu mở là sai.

Đã kiểm tra trình duyệt ở cả hai kích thước màn hình với CMS giả lập và cấu hình Supabase mẫu:

- Không nộp được đáp án rỗng; lời giải chưa lộ trước khi người học kiểm tra hoặc chủ động xem.
- Đáp án ngắn chưa khớp có lời giải, thử lại được; chấp nhận chữ hoa, khoảng trắng và dấu phân cách thông thường.
- Câu mở cho phép đối chiếu với đáp án mẫu; số câu tự đối chiếu hiển thị riêng với số câu đúng tự động.
- Chủ động xem lời giải không tăng số câu đúng. Làm lại toàn bộ xóa đáp án và phản hồi.
- Mở bài khác bắt đầu phiên luyện mới; bài CMS tùy chỉnh không có phần bổ sung vẫn hiển thị bình thường.
- CMS không xuất bản bài hoặc trả lỗi không làm xuất hiện phần kiến thức tĩnh.
- Quiz cuối bài vẫn mở được; tự luyện không ghi dữ liệu tiến độ hoặc đánh dấu hoàn thành.
- Kho thì hiển thị đủ 12 mẫu; không tràn ngang hoặc lỗi JavaScript không được xử lý.

122 unit tests đạt; TypeScript và ESLint trên các tệp tương tác mới đạt. Build sử dụng cấu hình mẫu; không thay thế kiểm tra môi trường sản xuất sau khi triển khai.

## Chạy lại

Các script trình duyệt dùng module `playwright` có sẵn hoặc đường dẫn trong biến `PLAYWRIGHT_MODULE`, cùng Microsoft Edge đã cài.

1. Khởi động Next.js cục bộ ở cổng 3108 với `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co` và anon key mẫu bất kỳ không rỗng.
2. Chạy `node scripts/check-knowledge-practice.mjs`. Script chỉ chấp nhận localhost/127.0.0.1, giả lập mọi backend và chặn các host khác.
3. Chạy `node scripts/check-public-lessons.mjs` để kiểm tra chỉ đọc website công khai.
4. Báo cáo JSON và ảnh chụp nằm trong `.next/qa-knowledge-practice` và `.next/qa-public-lessons` (không đưa vào Git).

Sau khi triển khai, cần kiểm tra lại bằng tài khoản hợp lệ để xác nhận lưu quiz/SRS, audio và luồng admin trên cấu hình thật.
