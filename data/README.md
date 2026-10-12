# Dữ liệu tham chiếu

## cefrj-vocabulary-profile-1.5.csv
Danh sách từ vựng tiếng Anh gắn nhãn cấp độ CEFR-J (A1–B2).

- **Nguồn:** CEFR-J Wordlist Version 1.5, biên soạn bởi Yukio Tono, Tokyo University of Foreign Studies. Lấy từ http://www.cefr-j.org/download.html (qua bản đóng gói openlanguageprofiles/olp-en-cefrj).
- **Bản quyền:** Tono Laboratory, TUFS.
- **Điều khoản:** được dùng cho cả nghiên cứu lẫn thương mại, miễn phí, **với điều kiện trích dẫn nguồn**.

> The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Retrieved from http://www.cefr-j.org/download.html

Dùng bởi `scripts/lint-cefr.mjs` để kiểm tra các cụm trong `src/lib/lessons.ts` có từ nào vượt cấp độ của bài hay không.

## Khóa “1000 từ tiếng anh thông dụng”

- Nguồn: `1000-tu-vung-tieng-anh-theo-chu-de-thong-dung.pdf`, tài liệu 58 trang do người dùng cung cấp ngày 11/10/2026. Khóa học này thay thế bản tuyển chọn CEFR-J trước đó; CSV CEFR-J vẫn được dùng bởi công cụ kiểm tra cấp độ độc lập.
- Tài liệu thực tế có **1.046 mục trong 50 chủ đề**, tương ứng **943 headword phân biệt** khi bỏ qua chữ hoa/thường. Có từ đơn, từ ghép, cụm từ và những mục lặp trong/cross chủ đề. Giữ tất cả các dòng theo nguồn, không thêm từ ngoài tài liệu để đạt một con số tròn.
- `data/basic-vocabulary-pdf.json` lưu nội dung từng dòng, số trang PDF (đếm từ bìa), tiêu đề chủ đề và SHA-256 của file nguồn. Không đưa file PDF gốc lên thư mục public.
- Trích lại bằng `python scripts/import-vocabulary-pdf.py "PATH_TO_PDF"` (cần `pdfplumber`, `pypdfium2`); sau đó chạy `node scripts/build-basic-vocabulary.mjs`. Bộ trích dùng tọa độ bảng và PDFium để giữ khoảng trắng, đọc đúng các ligature fi/ff/ffi. Các kiểm tra sẽ dừng nếu thiếu dòng, nghĩa hoặc IPA.
- Khóa có **55 bài, mỗi bài tối đa 20 thẻ**; chủ đề dài được chia phần để mọi mục đều học được. Dữ liệu được đóng gói sẵn, không gọi AI khi nhập hoặc xem từ/IPA.
- Từ, nghĩa và IPA giữ nguyên theo tài liệu, không gán toàn bộ thành A1 hay tự đoán loại từ. Tài liệu có các cách phiên âm Anh-Anh/Anh-Mỹ khác nhau; đây là bản nhập theo nguồn, không phải một lần hiệu đính ngôn ngữ toàn bộ.
- IPA hiển thị ngay ở mặt trước Flashcard cùng từ tiếng Anh và các nút nghe US/UK; bấm Hiện nghĩa để mở nghĩa Việt. IPA cũng có trong phản hồi của Đoán (gõ)/Trắc nghiệm. Chế độ chỉ học từ đơn loại các mục có khoảng trắng, giữ từ ghép có dấu gạch nối. Bản ghi cũ có IPA có thể được dùng để tách từng từ trong các bài cụm từ hiện có; không trộn chúng vào khóa PDF.
- Đáp án trắc nghiệm loại trùng chữ tiếng Anh dù nguồn có mục lặp. Ví dụ AI chỉ được tạo khi bấm nút tương ứng.
