export const journalPrompts = [
  { en: "What did you do today?", vi: "Hôm nay bạn đã làm gì?" },
  { en: "Describe your mood right now.", vi: "Mô tả tâm trạng của bạn lúc này." },
  { en: "What are you looking forward to this week?", vi: "Tuần này bạn mong chờ điều gì?" },
  { en: "Describe a person you talked to today.", vi: "Tả một người bạn đã nói chuyện hôm nay." },
  { en: "What is one thing you want to improve?", vi: "Một điều bạn muốn cải thiện là gì?" },
];

// Gợi ý prompt theo ngày để mỗi ngày khác nhau nhưng ổn định trong ngày.
export function promptOfTheDay() {
  const day = Math.floor(Date.now() / 86_400_000);
  return journalPrompts[day % journalPrompts.length];
}

export type ShadowItem = {
  id: string;
  en: string;
  vi: string;
  level: string;
};

export const shadowItems: ShadowItem[] = [
  // A1 — câu ngắn, từ thông dụng, luyện nhịp & âm cuối
  { id: "s1", en: "Nice to meet you.", vi: "Rất vui được gặp bạn.", level: "A1" },
  { id: "s2", en: "Where are you from?", vi: "Bạn đến từ đâu?", level: "A1" },
  { id: "s3", en: "I have two younger sisters.", vi: "Tôi có hai em gái.", level: "A1" },
  { id: "s4", en: "Can I have a glass of water, please?", vi: "Cho tôi xin một cốc nước nhé?", level: "A1" },
  { id: "s5", en: "Let's go for a walk.", vi: "Mình đi dạo nhé.", level: "A1" },
  // A2 — câu dài hơn, có nối âm và ngữ điệu hỏi
  { id: "s6", en: "Could you say that again, please?", vi: "Bạn nói lại được không?", level: "A2" },
  { id: "s7", en: "I'm not sure, but I think so.", vi: "Tôi không chắc, nhưng tôi nghĩ vậy.", level: "A2" },
  { id: "s8", en: "What time does the meeting start?", vi: "Cuộc họp bắt đầu lúc mấy giờ?", level: "A2" },
  { id: "s9", en: "I've never been to Da Nang before.", vi: "Tôi chưa từng đến Đà Nẵng.", level: "A2" },
  { id: "s10", en: "It's going to rain this afternoon.", vi: "Chiều nay trời sẽ mưa.", level: "A2" },
  { id: "s11", en: "How long have you lived here?", vi: "Bạn sống ở đây bao lâu rồi?", level: "A2" },
  // B1 — câu giao tiếp tự nhiên, có cụm cố định và nối âm khó
  { id: "s12", en: "I'd love to, but I'm a bit busy today.", vi: "Tôi rất muốn, nhưng hôm nay hơi bận.", level: "B1" },
  { id: "s13", en: "To be honest, I'm not really into horror movies.", vi: "Thật ra tôi không thích phim kinh dị lắm.", level: "B1" },
  { id: "s14", en: "Would you mind giving me a hand with this?", vi: "Bạn giúp tôi việc này một chút được không?", level: "B1" },
  { id: "s15", en: "It depends on how much it costs.", vi: "Còn tùy vào giá bao nhiêu.", level: "B1" },
  { id: "s16", en: "I was about to call you when you texted.", vi: "Tôi vừa định gọi thì bạn nhắn tin.", level: "B1" },
];
