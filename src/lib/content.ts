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
  { id: "s1", en: "Nice to meet you.", vi: "Rất vui được gặp bạn.", level: "A1" },
  { id: "s2", en: "Could you say that again, please?", vi: "Bạn nói lại được không?", level: "A2" },
  { id: "s3", en: "I'm not sure, but I think so.", vi: "Tôi không chắc, nhưng tôi nghĩ vậy.", level: "A2" },
  { id: "s4", en: "What time does the meeting start?", vi: "Cuộc họp bắt đầu lúc mấy giờ?", level: "A2" },
  { id: "s5", en: "I'd love to, but I'm a bit busy today.", vi: "Tôi rất muốn, nhưng hôm nay hơi bận.", level: "B1" },
];
