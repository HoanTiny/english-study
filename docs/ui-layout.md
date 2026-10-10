# Bố cục các màn học

Các trang học dùng chung các lớp trong `src/app/globals.css`:

- `study-page`: rộng tối đa 88rem, lề co theo màn hình, khoảng cách đầu trang thống nhất.
- `study-page--focused`: tối đa 58rem cho bài học và bài luyện tập.
- `study-page--reading`: tối đa 48rem cho thẻ ôn tập cần tập trung đọc.
- `study-grid`: tự chọn số cột theo chiều rộng thực tế còn lại sau sidebar.
- `study-workspace`: vùng làm bài cạnh vùng tham khảo từ 1280px; xếp dọc ở màn nhỏ. Sổ tay dùng biến thể `study-workspace--notes` để đặt form nhỏ bên trái.
- `study-panel`, `page-heading`, `study-tabs`, `study-field`: dùng màu theme hiện có, nhãn rõ ràng và khoảng cách nhất quán.

Sổ tay hiển thị form và ghi chú song song; Nhật ký hiển thị trình soạn và lịch sử song song. Ngữ pháp, Shadowing, từ vựng, video và bài nghe dùng lưới thích ứng. Màn luyện tập giữ giới hạn chiều rộng riêng. Bộ lọc mục đích của Ngữ pháp có thể thu gọn trên điện thoại.

Mobile chỉ có một thanh công cụ. Menu bắt đầu bên dưới thanh này, cuộn riêng, khóa cuộn và tương tác với phần nội dung nền, giữ focus trong vùng điều hướng, đóng bằng Esc hoặc khi chọn trang. Khi chuyển sang chiều rộng desktop, menu tự đóng. Khung CMS dùng menu riêng.

Đã sửa thêm tiêu đề Tài khoản dùng cỡ chữ không tồn tại, input tên làm tràn cột, vòng tiến độ SVG có kích thước cố định, ảnh icon lỗi trước khi hydration và chủ đề Nhật ký lệch ngày giữa build và trình duyệt. Không thay đổi schema hoặc API học tập.

## Kiểm tra local

Build với public Supabase placeholders, rồi chạy server trên cổng riêng. Dùng các biến `PLAYWRIGHT_MODULE` và `CHROME_PATH` nếu máy chưa cài Playwright tại project.

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = 'https://build-check.supabase.co'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = 'build-check-placeholder'
npm run build -- --webpack
npm run start -- -p 3117 --hostname 127.0.0.1
```

Trong terminal khác:

```powershell
$env:SMOKE_BASE_URL = 'http://127.0.0.1:3117'
node scripts/check-app-layout.mjs
```

Script dùng tài khoản/dữ liệu giả và chặn mọi request dịch vụ ngoài local. Không chạy trên production. Mặc định kiểm tra 28 đường dẫn ở 1440, 768, 390, 320px, phát hiện tràn ngang, lỗi JavaScript và kiểm tra menu mobile. Screenshot và báo cáo JSON lưu tại `.next/qa-app-layout`; build tiếp theo có thể xóa chúng.

- `SMOKE_DARK=1`: kiểm tra giao diện tối.
- `SMOKE_INTERACTIONS=1`: thêm các trạng thái lưu ghi chú/nhật ký, bộ lọc, mở chi tiết, chuyển tab, bài nghe, thẻ từ, chép chính tả và editor CMS.
- `SMOKE_ROUTES`: các đường dẫn ngăn bằng dấu phẩy; `SMOKE_WIDTHS`: các chiều rộng ngăn bằng dấu phẩy.
- `SMOKE_OUTPUT`: thư mục lưu kết quả riêng để so sánh các lượt kiểm tra.
- `SMOKE_BASELINE=1`: chỉ thu thập kết quả trước sửa, không dùng làm tiêu chí xác nhận đạt.

Nhật ký được kiểm tra với ngày trình duyệt khác ngày build để bắt lỗi hydration. Các API lưu dữ liệu trong bài kiểm tra đều là mock; kết quả không xác nhận dịch vụ AI, microphone hay Supabase production.

Các kiểm tra bổ sung: `scripts/check-roleplay-layout.mjs`, `scripts/smoke-personalized.mjs`, ESLint, production build và bộ 138 unit tests.

## Kết quả đợt rà soát

- 28 màn ở 1440px và 320px, gồm thao tác mở/lưu/làm bài: 84 lượt chụp và đo bố cục đạt, không tràn ngang hoặc lỗi JavaScript.
- 28 màn ở 768px và 390px với giao diện tối: 56 lượt đạt. Sau chỉnh sửa cuối, kiểm tra lại Ngữ pháp và Tài khoản cùng các trạng thái mở ở hai chiều rộng này: 10 lượt đạt.
- Hội thoại AI: 9 cấu hình 320–1647px, sáng/tối, cuộn hội thoại, ô nhập và phản hồi đạt.
- Luồng học cá nhân: nhiệm vụ A2, tiếp tục buổi học, ôn thẻ, luyện lỗi, xử lý lỗi dịch vụ Shadowing đạt bằng mock.
- Production build 55 routes và 138 unit tests đạt. ESLint toàn bộ `src` không có lỗi; còn 31 cảnh báo từ code hiện có.
