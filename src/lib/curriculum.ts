export type LessonStatus = "done" | "in_progress" | "available" | "locked";

export type Lesson = {
  slug: string;
  title: string;
  topic: string;
  status: LessonStatus;
};

export type Stage = {
  id: number;
  title: string;
  cefr: string;
  goal: string;
  months: string;
  lessons: Lesson[];
};

// ─────────────────────────────────────────────────────────────────────────────
// LỘ TRÌNH HỌC — bám chuẩn CEFR (A1 → B2).
// Mục tiêu & tiến trình ngữ pháp đối chiếu khung CEFR (can-do statements + grammar
// syllabus theo cấp: exam English / Cambridge / Council of Europe). Mỗi giai đoạn
// nêu rõ KỸ NĂNG LÀM ĐƯỢC + TRỌNG TÂM NGỮ PHÁP đúng cấp, không nhồi nội dung vượt cấp.
//
// Lưu ý: bài chưa có nội dung (chưa soạn) sẽ hiển thị "khóa" trên lộ trình — đây là
// các mốc ngữ pháp/chủ đề CHUẨN của cấp đó, đánh dấu sẵn để soạn dần.
// ─────────────────────────────────────────────────────────────────────────────
export const stages: Stage[] = [
  {
    id: 1,
    title: "Khởi đầu A1",
    cefr: "A1",
    goal:
      "Chuẩn CEFR A1 — Nền tảng: tự giới thiệu, hỏi–đáp thông tin cá nhân đơn giản khi người kia nói chậm, rõ. Trọng tâm ngữ pháp: to be, hiện tại đơn, can/can't, there is/are, mạo từ & số nhiều, giới từ nơi chốn/thời gian, present continuous và sở thích (like/love + V-ing).",
    months: "Tháng 1–3",
    lessons: [
      { slug: "ipa-sounds", title: "Âm IPA cơ bản", topic: "Phát âm", status: "done" },
      { slug: "greetings", title: "Chào hỏi & giới thiệu", topic: "to be · câu hỏi cơ bản", status: "done" },
      { slug: "family", title: "Gia đình & bạn bè", topic: "Sở hữu · this/that", status: "in_progress" },
      { slug: "numbers-time", title: "Số, giờ & lịch", topic: "Đời sống", status: "available" },
      { slug: "daily-routine", title: "Thói quen hằng ngày", topic: "Hiện tại đơn", status: "available" },
      { slug: "free-time", title: "Sở thích & thể thao", topic: "like/love + V-ing · can", status: "available" },
      { slug: "food", title: "Đồ ăn & gọi món", topic: "Đếm được/không · I'd like", status: "available" },
      { slug: "places-directions", title: "Nơi chốn & chỉ đường", topic: "there is/are · giới từ nơi chốn", status: "available" },
      { slug: "health-body", title: "Sức khoẻ & cơ thể", topic: "Đời sống", status: "available" },
      { slug: "clothes-appearance", title: "Quần áo & ngoại hình", topic: "Tính từ miêu tả", status: "available" },
      { slug: "house-home", title: "Nhà cửa & đồ đạc", topic: "Đời sống", status: "available" },
      { slug: "present-continuous", title: "Đang xảy ra (tiếp diễn)", topic: "Hiện tại tiếp diễn", status: "available" },
    ],
  },
  {
    id: 2,
    title: "Sơ cấp A2",
    cefr: "A2",
    goal:
      "Chuẩn CEFR A2 — Giao dịch ngắn: mua sắm, chỉ đường, nói về gia đình, kế hoạch và trải nghiệm. Trọng tâm ngữ pháp: quá khứ đơn, so sánh hơn/nhất, tương lai (going to / will), present perfect cơ bản (ever/never/just/yet), trạng từ chỉ cách thức và câu điều kiện loại 1.",
    months: "Tháng 4–6",
    lessons: [
      { slug: "past-simple", title: "Kể chuyện quá khứ", topic: "Quá khứ đơn", status: "available" },
      { slug: "describe-compare", title: "Miêu tả & so sánh", topic: "So sánh hơn/nhất", status: "available" },
      { slug: "future-plans", title: "Kế hoạch & dự định", topic: "going to / will", status: "available" },
      { slug: "present-perfect", title: "Đã từng làm", topic: "Hiện tại hoàn thành (cơ bản)", status: "available" },
      { slug: "adverbs-manner", title: "Trạng từ chỉ cách thức", topic: "Trạng từ", status: "available" },
      { slug: "first-conditional", title: "Câu điều kiện loại 1", topic: "If + hiện tại → will", status: "available" },
      { slug: "shopping-money", title: "Mua sắm & trả giá", topic: "Tình huống", status: "available" },
      { slug: "weather-seasons", title: "Thời tiết & mùa", topic: "Đời sống", status: "available" },
      { slug: "feelings-emotions", title: "Cảm xúc & tâm trạng", topic: "Đời sống", status: "available" },
      { slug: "jobs-ambitions", title: "Nghề nghiệp & ước mơ", topic: "Tương lai", status: "available" },
      { slug: "making-plans", title: "Hẹn hò & rủ rê", topic: "Hội thoại", status: "available" },
    ],
  },
  {
    id: 3,
    title: "Trung cấp B1",
    cefr: "B1",
    goal:
      "Chuẩn CEFR B1 — cấp 'tự xoay xở được': xử lý hầu hết tình huống khi đi lại, kể trải nghiệm & mong muốn, trình bày mạch lạc về chủ đề quen thuộc. Trọng tâm ngữ pháp: present perfect continuous, quá khứ hoàn thành, câu điều kiện loại 2, modal suy đoán (must/might/can't), câu bị động đơn và câu tường thuật.",
    months: "Tháng 7–10",
    lessons: [
      { slug: "restaurant", title: "Ở nhà hàng", topic: "Tình huống", status: "locked" },
      { slug: "travel", title: "Du lịch & sân bay", topic: "Tình huống", status: "locked" },
      { slug: "opinions", title: "Nêu ý kiến & đồng/không đồng ý", topic: "Hội thoại", status: "locked" },
      { slug: "technology-phone", title: "Công nghệ & điện thoại", topic: "Tình huống", status: "locked" },
      { slug: "work-office", title: "Công việc & văn phòng", topic: "Tình huống", status: "locked" },
      { slug: "environment-nature", title: "Môi trường & thiên nhiên", topic: "Hội thoại", status: "locked" },
      { slug: "present-perfect-continuous", title: "Hiện tại hoàn thành tiếp diễn", topic: "Ngữ pháp · have been V-ing", status: "locked" },
      { slug: "second-conditional", title: "Câu điều kiện loại 2", topic: "Ngữ pháp · If + quá khứ → would", status: "locked" },
      { slug: "modals-deduction", title: "Suy đoán & khả năng", topic: "Ngữ pháp · must/might/can't", status: "locked" },
      { slug: "passive-simple", title: "Câu bị động cơ bản", topic: "Ngữ pháp · be + V3", status: "locked" },
      { slug: "reported-speech", title: "Câu tường thuật", topic: "Ngữ pháp · reported speech", status: "locked" },
    ],
  },
  {
    id: 4,
    title: "Trung cao cấp B2",
    cefr: "B2",
    goal:
      "Hướng tới CEFR B2 — trôi chảy & tự nhiên: hội thoại liền mạch với người bản xứ, hiểu ý chính của văn bản phức tạp, lập luận và bảo vệ quan điểm về chủ đề trừu tượng. Trọng tâm ngữ pháp: thì kể chuyện (narrative tenses), câu điều kiện loại 3 & hỗn hợp, mệnh đề quan hệ, câu bị động nâng cao — kết hợp luyện phản xạ nói, nghĩ bằng tiếng Anh.",
    months: "Tháng 11+",
    lessons: [
      { slug: "small-talk", title: "Nói chuyện xã giao", topic: "Hội thoại trôi chảy", status: "locked" },
      { slug: "think-in-english", title: "Suy nghĩ bằng tiếng Anh", topic: "Tư duy phản xạ", status: "locked" },
      { slug: "narrative-tenses", title: "Thì kể chuyện", topic: "Ngữ pháp · past perfect/continuous", status: "locked" },
      { slug: "third-conditional", title: "Câu điều kiện loại 3 & hỗn hợp", topic: "Ngữ pháp · If + had + V3", status: "locked" },
      { slug: "relative-clauses", title: "Mệnh đề quan hệ", topic: "Ngữ pháp · who/which/that", status: "locked" },
      { slug: "ai-roleplay", title: "Hội thoại với AI", topic: "Luyện nói thực chiến", status: "locked" },
    ],
  },
];
