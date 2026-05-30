# Nguồn tiếng Anh uy tín theo CEFR — Báo cáo & đề xuất áp dụng cho SpeakUp

> Nghiên cứu 2026-05-30. Trọng tâm: **độ tin cậy · giấy phép (có nhúng/copy được không) · cấp độ CEFR · cách áp dụng**.
> Ký hiệu giấy phép: ✅ dùng/nhúng tự do (kèm điều kiện) · ⚠️ chỉ tham khảo / phi thương mại · ❌ không được copy/nhúng.

---

## TL;DR — "Stack an toàn" nên dùng ngay

| Mục đích | Nguồn nên dùng | Vì sao |
|---|---|---|
| Chuẩn hóa cấp độ A1–C2 cho cụm/từ | **CEFR-J Wordlist** (GitHub olp-en-cefrj) | Cho phép cả thương mại, chỉ cần ghi nguồn |
| Câu mẫu song ngữ Anh–Việt | **Tatoeba** (API + dump) | CC-BY/CC0, có sẵn cặp Anh–Việt + audio |
| Nghĩa + IPA + audio từ | **Free Dictionary API** (dictionaryapi.dev) | Miễn phí, mã nguồn mở; nên self-host bản tĩnh |
| Luyện nghe nhúng được | **VOA Learning English** | Public domain, được dùng cả mục đích thương mại (ghi nguồn) |
| Nhúng video luyện nghe | **YouTube IFrame** (kênh uy tín) | Nhúng hợp lệ theo ToS YouTube, không tải về |
| Đối chiếu cấp độ khi soạn bài | **Cambridge EVP**, **Oxford 3000/5000** | Chuẩn vàng — nhưng CHỈ tra cứu, không copy vào app |

---

## Nhóm 1 — Chuẩn từ vựng/ngữ pháp theo CEFR

### CEFR-J Wordlist (Tono Lab, TUFS) — ✅ **khuyến nghị tích hợp**
- **Tin cậy:** cao (đại học TUFS, Nhật; chuẩn CEFR-J chi tiết hóa CEFR cho châu Á).
- **Giấy phép:** dùng được cho **cả nghiên cứu lẫn thương mại, miễn phí, chỉ cần trích dẫn nguồn**. Bản đóng gói tiện dùng: GitHub `openlanguageprofiles/olp-en-cefrj` (kiểm tra file LICENSE trong repo trước khi ship).
- **CEFR:** A1–C2, kèm POS.
- **Áp dụng:** import thành bảng `word → cefr_level` trong DB; dùng để (a) gắn nhãn cấp độ cho mỗi cụm trong `lessons.ts`, (b) cảnh báo khi 1 bài có quá nhiều từ vượt cấp, (c) lọc từ gợi ý theo giai đoạn người học.

### Cambridge English Vocabulary Profile (EVP) — ⚠️ tham khảo
- **Tin cậy:** rất cao (Cambridge, chuẩn vàng gắn từ/cụm với CEFR dựa trên Cambridge Learner Corpus).
- **Giấy phép:** tra cứu online **miễn phí cho mục đích phi thương mại**. Không có quyền nhúng dữ liệu vào app thương mại.
- **CEFR:** A1–C2, tra được cả nghĩa theo từng cấp.
- **Áp dụng:** dùng EVP Online như từ điển tra cứu **trong lúc soạn bài** để chốt cụm nào thuộc A1/A2/B1; không đưa dữ liệu EVP vào sản phẩm.

### Oxford 3000 / 5000 — ⚠️ tham khảo
- **Tin cậy:** rất cao (Oxford, dựa Oxford English Corpus 2 tỷ từ).
- **Giấy phép:** ❌ **proprietary** — điều khoản cấm sao chép/phân phối nội dung trên mạng cho người không phải "authorised user"; **không được nhúng vào app thương mại**. PDF tải về chỉ để cá nhân tham khảo.
- **CEFR:** 3000 = A1–B2; 5000 = thêm B2–C1.
- **Áp dụng:** in PDF ra đối chiếu khi soạn; không import.

---

## Nhóm 2 — Nội dung dùng lại được (free/CC)

### VOA Learning English — ✅ **khuyến nghị nhúng**
- **Tin cậy:** cao (đài quốc gia Mỹ, biên tập chuyên nghiệp; tốc độ chậm, từ vựng giới hạn — hợp A2–B1).
- **Giấy phép:** **public domain** với mọi text/audio/video **do chính VOA sản xuất**; được **in lại cho cả mục đích giáo dục lẫn thương mại, kèm ghi nguồn** learningenglish.voanews.com. ⚠️ Lưu ý: ảnh/video của AP, Reuters trong bài thì KHÔNG được dùng lại.
- **CEFR:** "beginning / intermediate / advanced" ≈ A2 → B2.
- **Áp dụng:** lấy bài + MP3 do VOA sản xuất làm nội dung **Shadowing/luyện nghe B1+**; nhớ hiển thị dòng ghi nguồn.

### Tatoeba — ✅ **khuyến nghị tích hợp**
- **Tin cậy:** trung bình–cao (cộng đồng, có kiểm duyệt; 13,4 triệu câu, >400 ngôn ngữ; >1 triệu câu có audio).
- **Giấy phép:** phần lớn **CC-BY 2.0 FR** (phải ghi công từng câu) + một phần **CC0**. Audio: mỗi người đóng góp tự chọn license (export kèm URL tác giả).
- **CEFR:** không gắn nhãn cấp độ → cần tự lọc theo độ dài/độ phổ biến từ.
- **Áp dụng:** dùng cặp **Anh–Việt** làm câu mẫu/`example` cho cụm và ngân hàng câu Shadowing. Có **API** (api.tatoeba.org) + bản dump tải sẵn. Lưu cột attribution.

### OER khác (Linguapress, freegradedreaders, OER Commons) — ⚠️ tùy từng mục
- Mỗi nguồn có giấy phép riêng → **phải kiểm tra từng bài** trước khi nhúng (nhiều bài chỉ cho dùng phi thương mại). Tốt cho tham khảo bài đọc graded A1–C1.

---

## Nhóm 3 — Kênh YouTube luyện nghe theo cấp độ (nhúng qua IFrame)

> Nhúng bằng **YouTube IFrame** là hợp lệ theo ToS YouTube (không tải/không tái lưu trữ). Đừng download video về máy chủ.

| Kênh | Cấp độ | Ghi chú |
|---|---|---|
| **VOA Learning English** | A2–B1 | Nói chậm, từ giới hạn; bản thân nội dung lại là public domain |
| **BBC Learning English** (6 Minute English) | A2–B2 | Thư viện lớn, bài ngắn theo chủ đề |
| **Bob the Canadian** | A1–B1 | Nói chậm, rõ; từ vựng thực tế đời sống |
| **Speak English With Vanessa** | B1–B2 | Tình huống đời thực, thành ngữ |
| **English with Lucy** | B1–C1 | British English, luyện thi, phát âm |
| **Shaw English Online** | A1–B2 | Nhiều playlist theo trình độ + hội thoại thật |

- **Áp dụng:** thêm trường `youtubeId` (tùy chọn) cho mỗi bài/giai đoạn → render `<iframe>` "Nghe người bản xứ nói về chủ đề này". Bắt đầu A1–A2 ưu tiên VOA + Bob the Canadian.

---

## Nhóm 4 — Trang luyện/giáo trình tham khảo (KHÔNG copy)

### British Council LearnEnglish & BBC Learning English — ❌ chỉ link, không nhúng
- **Tin cậy:** rất cao.
- **Giấy phép:** nội dung **có bản quyền**; **không được copy/nhúng** vào web/app khác nếu chưa xin phép. British Council nói chung **chấp nhận đặt link** tới trang miễn phí của họ.
- **Áp dụng:** dùng làm **link "Học thêm"** cuối mỗi bài (mở tab mới), và làm chuẩn tham khảo cấu trúc bài khi tự soạn. Tuyệt đối không sao chép câu chữ.

---

## Nhóm 5 — API / dataset tích hợp tự động

### Free Dictionary API — dictionaryapi.dev — ✅ dùng được, nên self-host
- **Tin cậy:** trung bình (dự án mã nguồn mở cộng đồng).
- **Trả về:** định nghĩa, **IPA**, **audio phát âm**, ví dụ, từ đồng/trái nghĩa.
- **Giấy phép/độ ổn định:** miễn phí, mã nguồn mở (kiểm tra LICENSE repo); **không cam kết SLA / không nêu rate limit** → với production nên **clone & self-host** hoặc cache kết quả.
- **Áp dụng:** tự động điền `ipa` + nút nghe phát âm cho cụm/từ trong `lessons.ts` thay vì gõ IPA tay; cache vào DB.

### Tatoeba API — (xem Nhóm 2)
### CEFR-J dataset — (xem Nhóm 1)

---

## Đề xuất áp dụng cụ thể vào SpeakUp (theo giai đoạn hiện có)

1. **Gắn nhãn CEFR tự động** — import **CEFR-J Wordlist** → script kiểm tra mỗi cụm trong `lessons.ts`, cảnh báo từ vượt cấp. (Giấy phép OK cho thương mại + ghi nguồn.)
2. **Tự sinh IPA + audio** — gọi **Free Dictionary API** (self-host/cache) để điền `ipa` và nút phát âm chuẩn, giảm gõ tay & sai sót.
3. **Ngân hàng câu mẫu Anh–Việt** — kéo cặp câu **Tatoeba** (lọc theo độ dài/từ vựng theo cấp) làm `example` và bổ sung Shadowing; lưu cột attribution (CC-BY).
4. **Luyện nghe nhúng** —
   - **B1+ (GĐ3–4):** nhúng bài + MP3 **VOA** (public domain, ghi nguồn).
   - **Mọi giai đoạn:** thêm `youtubeId` để nhúng video kênh phù hợp cấp độ (A1–A2: VOA, Bob the Canadian).
5. **Link "Học thêm"** — cuối mỗi bài đặt link tới British Council/BBC trang tương ứng (mở tab mới) — chỉ link, không copy.
6. **Soạn sâu GĐ3–4** — dùng **Cambridge EVP** + **Oxford 3000/5000** làm chuẩn tra cứu (không import) để chọn đúng cụm B1/B1+.

### Việc kỹ thuật cần làm (gợi ý thứ tự)
- [ ] Thêm bảng `cefr_words` (import CEFR-J) + script lint cấp độ cho `lessons.ts`
- [ ] Service `GET /api/pronounce?word=` (proxy/cache Free Dictionary API) → điền IPA/audio
- [ ] Bảng `example_bank` (import Tatoeba en-vi) + cột `attribution`
- [ ] Trường tùy chọn `youtubeId` + `sourceUrl`/`sourceCredit` trong `LessonContent`
- [ ] Footer ghi nguồn (VOA, Tatoeba contributors, CEFR-J citation)

---

## Nguồn (đã kiểm chứng giấy phép từ trang gốc)
- Oxford 3000/5000 — oxfordlearnersdictionaries.com/about/wordlists/oxford3000-5000 và /terms-and-conditions (proprietary)
- Cambridge English Vocabulary Profile — englishprofile.org (miễn phí phi thương mại)
- CEFR-J Wordlist — cefr-j.org + GitHub openlanguageprofiles/olp-en-cefrj (thương mại OK, ghi nguồn)
- VOA Learning English — learningenglish.voanews.com/p/6861.html ("Request Our Content", public domain)
- Tatoeba — tatoeba.org/downloads + api.tatoeba.org (CC-BY 2.0 FR / CC0)
- Free Dictionary API — dictionaryapi.dev (miễn phí, mã nguồn mở)
- British Council Terms — britishcouncil.org/terms (bản quyền, chỉ link)
- YouTube channels — tổng hợp từ FlexiLingo, Preply, FluentU (2026)
