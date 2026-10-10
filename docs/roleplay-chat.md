# Chat chữ, luyện nói và hỗ trợ tiếng Việt

## Cách sử dụng

1. Mở `/roleplay`, chọn tình huống. Mặc định là **Chat chữ**, không tự phát âm thanh.
2. Gõ câu tiếng Anh rồi bấm **Gửi** hoặc Enter; Shift + Enter xuống dòng.
3. Chuyển sang **Luyện nói** khi tiện. Bấm mic để nhận diện tiếng Anh, kiểm tra/sửa văn bản rồi gửi. Tự đọc câu AI có thể bật/tắt. Trình duyệt không hỗ trợ mic vẫn dùng ô gõ được.
4. Dùng một ô nhập cho cả tiếng Anh và tiếng Việt. Khi bấm **Gửi**, Gemini nhận diện ngôn ngữ, chuyển ý tiếng Việt sang tiếng Anh, giải thích cách dùng và trả lời hội thoại trong **một lượt gọi**. Không gọi API trong lúc gõ.
5. Câu tiếng Anh giữ nguyên để nhận xét năng lực thật. Câu tiếng Việt hoặc trộn Việt–Anh có nhãn **Có hỗ trợ dịch**, giải thích **Vì sao dùng câu này?** và ý gốc mở xem được.
6. Nếu ý chưa rõ, trợ lý hỏi lại và giữ bản nháp để sửa. Lỗi xử lý cũng giữ bản nháp; bấm Gửi để thử lại, không tạo tin trùng.
7. Nút **Dịch** dưới câu AI dịch sang tiếng Việt theo yêu cầu. Mở lại bản dịch đã xem dùng bộ nhớ trong phiên.

Đổi chế độ giữ lịch sử, dừng mic và âm thanh đang phát. Đổi tình huống bắt đầu cuộc trò chuyện mới. Lịch sử và bản nháp hiện chỉ giữ trong phiên, chưa đồng bộ cơ sở dữ liệu.

## Nhận xét và lỗi

- Nhận xét chỉ đánh giá các câu tự diễn đạt trong ngữ cảnh gần đây; câu dịch chỉ cung cấp ngữ cảnh. Câu sửa từ AI phải trích đúng câu tự diễn đạt mới được đưa vào Sổ lỗi.
- Không đưa điểm phát âm hoặc kết quả xếp lớp từ văn bản. Câu nhận diện giọng nói cũng chỉ được nhận xét trên văn bản nhận diện.
- Không nhận xét nếu tất cả các câu gần đây đều có hỗ trợ dịch.
- Lỗi gửi giữ bản nháp. Lỗi mở đầu hội thoại có nút thử lại. Chặn gửi đồng thời.

## Tích hợp

- API `POST /api/roleplay-translate`, direction `auto`: nhận text, scenario và context (chỉ câu AI gần nhất); trả assisted, english, explanation và reply. Kiểm tra đăng nhập, hạn mức và cấu trúc kết quả. Chỉ dùng Gemini.
- Một lần Gửi gọi Gemini một lần; token gồm đầu vào, prompt, bản dịch/giải thích khi cần và câu AI trả lời. Ngữ cảnh ngắn giúp tiết kiệm nhưng AI có thể không nhớ chi tiết từ các lượt cũ.
- API hội thoại cũ dùng để mở đầu tình huống. Không gửi ý gốc hoặc giải thích vào API nhận xét.
- API nhận xét chấp nhận thêm `assisted?: boolean`; các client cũ vẫn hoạt động với mặc định không có hỗ trợ.
- Không cần migration hoặc seed lại CMS. Cần cấu hình Gemini và đăng nhập như tính năng hội thoại trước đây.

## Kiểm tra

- Trang dùng khung hội thoại rộng và cột tình huống/gợi ý bên phải từ 1280px. Trên tablet/mobile, tình huống cuộn ngang, phần gợi ý nằm dưới hội thoại. Lịch sử cuộn riêng, ô nhập nằm ngoài vùng cuộn và dùng chữ 16px trên mobile.
- Style riêng trong `src/app/roleplay/roleplay.module.css`, không thay giao diện các trang khác. Phần giải thích câu dịch, đổi chế độ, mic, gửi lại và nhận xét giữ nguyên luồng xử lý.
- `scripts/check-roleplay-layout.mjs`: kiểm tra 320–1647px, sáng/tối, hội thoại dài, ô nhập, vị trí bảng gợi ý/nhận xét và viewport mobile thấp. Chạy trên bản build dùng Supabase placeholder `https://build-check.supabase.co` / `build-check-placeholder`, localhost:3117; cấu hình `SMOKE_BASE_URL`, `PLAYWRIGHT_MODULE`, `CHROME_PATH` nếu cần. Mọi API và yêu cầu bên ngoài được chặn/giả lập; ảnh lưu ở `.next/qa-roleplay-layout`.

- `tests/roleplayChat.test.ts`: validation, auth/quota, chỉ dùng Gemini, yêu cầu làm rõ, lỗi provider, và loại câu dịch khỏi đánh giá/lưu lỗi.
- `scripts/check-roleplay-chat.mjs`: chạy với local dev ở cổng 3108, URL Supabase mẫu `https://example.supabase.co` và anon key mẫu. Playwright dùng `PLAYWRIGHT_MODULE` nếu không cài trong dự án; cần Microsoft Edge.
- Script giả lập tài khoản, API, mic và giọng đọc; kiểm tra ở 1440px và 390px: chat yên lặng, ô nhập chung, một lượt gọi khi gửi, giải thích, lỗi giữ bản nháp, nhãn hỗ trợ, đổi chế độ, kết quả mic đến muộn, tự đọc bật/tắt, fallback không có mic, và bố cục không tràn ngang.
- Chưa kiểm tra chất lượng bản dịch với Gemini thật, thiết bị mic thật hoặc tài khoản sản xuất. Những bước đó cần thực hiện sau khi triển khai với cấu hình thật.
