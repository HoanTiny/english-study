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

export const stages: Stage[] = [
  {
    id: 1,
    title: "Nền tảng A1 (Cambridge Movers)",
    cefr: "A1 Movers",
    goal: "Bám khung A1 Movers: từ vựng theo chủ đề + ngữ pháp nền (so sánh, quá khứ đơn, must/have to, want to…) để tự giới thiệu và kể chuyện đơn giản.",
    months: "Tháng 1–3",
    lessons: [
      { slug: "ipa-sounds", title: "Âm IPA cơ bản", topic: "Phát âm", status: "done" },
      { slug: "greetings", title: "Chào hỏi & giới thiệu", topic: "Bản thân", status: "done" },
      { slug: "family", title: "Gia đình & bạn bè", topic: "Bản thân", status: "in_progress" },
      { slug: "describe-compare", title: "Miêu tả & so sánh", topic: "Ngữ pháp · So sánh", status: "available" },
      { slug: "numbers-time", title: "Số, giờ & lịch", topic: "Đời sống", status: "available" },
      { slug: "daily-routine", title: "Thói quen (hiện tại đơn)", topic: "Ngữ pháp · Hiện tại đơn", status: "available" },
      { slug: "food", title: "Đồ ăn & gọi món", topic: "Tình huống", status: "available" },
      { slug: "past-simple", title: "Kể chuyện quá khứ", topic: "Ngữ pháp · Quá khứ đơn", status: "locked" },
      { slug: "places-directions", title: "Nơi chốn & chỉ đường", topic: "Tình huống", status: "locked" },
      { slug: "health-body", title: "Sức khoẻ & cơ thể", topic: "Đời sống", status: "locked" },
      { slug: "free-time", title: "Sở thích & thể thao", topic: "Ngữ pháp · want/shall/could", status: "locked" },
      { slug: "clothes-appearance", title: "Quần áo & ngoại hình", topic: "Đời sống", status: "locked" },
      { slug: "house-home", title: "Nhà cửa & đồ đạc", topic: "Đời sống", status: "locked" },
    ],
  },
  {
    id: 2,
    title: "Mở rộng A2 (Cambridge Flyers)",
    cefr: "A2 Flyers",
    goal: "Bám khung A2 Flyers: hiện tại tiếp diễn, tương lai (going to/will), hiện tại hoàn thành, trạng từ và câu điều kiện loại 1 — để kể chuyện linh hoạt và nói về kế hoạch, trải nghiệm.",
    months: "Tháng 3–5",
    lessons: [
      { slug: "present-continuous", title: "Đang xảy ra (tiếp diễn)", topic: "Ngữ pháp · Hiện tại tiếp diễn", status: "locked" },
      { slug: "future-plans", title: "Kế hoạch & dự định", topic: "Ngữ pháp · going to / will", status: "locked" },
      { slug: "present-perfect", title: "Đã từng làm", topic: "Ngữ pháp · Hiện tại hoàn thành", status: "locked" },
      { slug: "weather-seasons", title: "Thời tiết & mùa", topic: "Đời sống", status: "locked" },
      { slug: "jobs-ambitions", title: "Nghề nghiệp & ước mơ", topic: "Tương lai", status: "locked" },
      { slug: "adverbs-manner", title: "Trạng từ chỉ cách thức", topic: "Ngữ pháp · Trạng từ", status: "locked" },
      { slug: "first-conditional", title: "Câu điều kiện loại 1", topic: "Ngữ pháp · If", status: "locked" },
      { slug: "shopping-money", title: "Mua sắm & trả giá", topic: "Tình huống", status: "locked" },
      { slug: "feelings-emotions", title: "Cảm xúc & tâm trạng", topic: "Đời sống", status: "locked" },
      { slug: "making-plans", title: "Hẹn hò & rủ rê", topic: "Hội thoại", status: "locked" },
    ],
  },
  {
    id: 3,
    title: "Giao tiếp thực tế",
    cefr: "B1",
    goal: "Nói chuyện với người thật về chủ đề quen thuộc",
    months: "Tháng 6–9",
    lessons: [
      { slug: "restaurant", title: "Ở nhà hàng", topic: "Tình huống", status: "locked" },
      { slug: "travel", title: "Du lịch & sân bay", topic: "Tình huống", status: "locked" },
      { slug: "opinions", title: "Nêu ý kiến", topic: "Hội thoại", status: "locked" },
      { slug: "technology-phone", title: "Công nghệ & điện thoại", topic: "Tình huống", status: "locked" },
      { slug: "work-office", title: "Công việc & văn phòng", topic: "Tình huống", status: "locked" },
      { slug: "environment-nature", title: "Môi trường & thiên nhiên", topic: "Hội thoại", status: "locked" },
    ],
  },
  {
    id: 4,
    title: "Trôi chảy & tự tin",
    cefr: "B1+",
    goal: "Nói tự nhiên, phản xạ nhanh, giảm dịch trong đầu",
    months: "Tháng 10–12",
    lessons: [
      { slug: "small-talk", title: "Nói chuyện xã giao", topic: "Hội thoại", status: "locked" },
      { slug: "think-in-english", title: "Suy nghĩ bằng tiếng Anh", topic: "Tư duy", status: "locked" },
      { slug: "ai-roleplay", title: "Hội thoại với AI", topic: "Hội thoại", status: "locked" },
    ],
  },
];
