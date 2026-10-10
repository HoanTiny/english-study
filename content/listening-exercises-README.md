# Bài tập nghe — nguồn & cách dùng

## File `listening-exercises-cms.txt`

13 bài tập nghe (A1 → B2) ở định dạng khối `=== EXERCISE ===` — dán toàn bộ nội dung file vào CMS (Admin → Listening Exercises → nhập hàng loạt) là parser tự tách bài.

## Nguồn nội dung

**Unit 1–3 (A1):** Hội thoại lấy nguyên văn từ *VOA Learning English — Let's Learn English Level 1* (Lesson 1, 2, 3). Toàn bộ nội dung do VOA tự sản xuất thuộc **phạm vi công cộng (public domain)** nên được phép sử dụng và đăng lại. Audio gốc tải trực tiếp (nút "Download") tại trang từng bài:

- Lesson 1: https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html
- Lesson 2: https://learningenglish.voanews.com/a/lets-learn-english-lesson-2-hello/3113733.html
- Lesson 3: https://learningenglish.voanews.com/a/lets-learn-english-lesson-3-i-am-here/3126527.html

Link MP3 trực tiếp (audio hội thoại, đã trích từ trang VOA ngày 10/6/2026):

- Lesson 1: https://voa-audio.voanews.eu/vle/2016/02/08/49485bf8-4277-47f6-9abe-617ee2473f8c.mp3
- Lesson 2: https://voa-audio.voanews.eu/vle/2016/02/10/56246d7b-5fa4-42d2-90b0-d403e6b46227_hq.mp3
- Lesson 3: https://voa-audio.voanews.eu/vle/2016/02/18/a82baaf4-0a91-4d43-8ab6-78f72cef8fce.mp3

Tải file audio về rồi upload lên bucket Supabase, sau đó điền `audio_path` cho bài tập tương ứng trong CMS.

## Bài chưa có audio → tự động đọc bằng giọng máy

Trang `/listening-exercises` đã được bổ sung trình phát TTS: bài tập nào **chưa có `audio_path` nhưng có transcript** sẽ hiện nút "▶ Nghe (giọng máy)" — trình duyệt đọc transcript bằng Web Speech API, tự đổi cao độ giọng theo từng nhân vật trong hội thoại, bỏ qua các dòng ghi chú trong ngoặc đơn. Khi nào upload audio thật thì player file sẽ tự thay thế.

**Unit 4–6 (A2–B1):** Hội thoại tự biên soạn riêng cho SpeakUp (đặt bàn nhà hàng, check-in khách sạn, phỏng vấn xin việc) — khớp với các bài học mới trong lộ trình. Không vướng bản quyền; cần tự tạo audio bằng cách thu âm hoặc TTS (ví dụ tính năng đọc của trình duyệt, hoặc dịch vụ TTS bất kỳ).

**Unit 7 (B2):** Bài speaking/shadowing, không cần audio.

## Video luyện nghe mới (đã thêm vào `src/data/listenVideos.ts`)

20 video mới, toàn bộ ID lấy từ RSS/trang kênh chính thức và xác minh qua YouTube oEmbed (10/6/2026):

| Kênh | Số video | Ghi chú |
|---|---|---|
| BBC Learning English | 11 | 6 Minute English, Real Easy English (A2), Learning English from the News, Live English Class, Box sets |
| VOA Learning English | 5 | Everyday Grammar Video, English in a Minute, How to Pronounce |
| TED-Ed | 4 | B2, phụ đề đầy đủ |

Chủ đề mới trên trang Luyện nghe: **Tiếng Anh thời sự 📰**, **Lớp luyện nói (BBC Live) 🧑‍🏫**, **Ngữ pháp & từ vựng qua video 📘**.

Lưu ý bản quyền: video BBC/TED-Ed chỉ nhúng qua YouTube IFrame (đúng ToS), không tải về, không sao chép transcript của BBC/TED vào app.
