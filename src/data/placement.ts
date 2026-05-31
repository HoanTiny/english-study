// Bài test xếp loại ngắn (8 câu, khó tăng dần). Đếm số câu đúng → đề xuất trình độ.

export type PlacementQ = {
  q: string;
  options: string[];
  answer: number; // index đáp án đúng
  level: string; // A1/A2/B1/B2 — câu thuộc mức nào
};

export const PLACEMENT: PlacementQ[] = [
  { q: "She ___ a student.", options: ["am", "is", "are", "be"], answer: 1, level: "A1" },
  { q: "I ___ coffee every morning.", options: ["drink", "drinks", "drinking", "drank"], answer: 0, level: "A1" },
  { q: "There ___ some apples on the table.", options: ["is", "are", "be", "am"], answer: 1, level: "A2" },
  { q: "Yesterday we ___ to the cinema.", options: ["go", "goes", "went", "gone"], answer: 2, level: "A2" },
  { q: "If it rains tomorrow, we ___ stay home.", options: ["will", "would", "are", "did"], answer: 0, level: "B1" },
  { q: "She has ___ in London since 2015.", options: ["live", "lived", "living", "lives"], answer: 1, level: "B1" },
  { q: "By next year, I ___ here for a decade.", options: ["will work", "will have worked", "have worked", "worked"], answer: 1, level: "B2" },
  { q: "He spoke as if he ___ everything.", options: ["knows", "knew", "had known", "has known"], answer: 2, level: "B2" },
];

// Số câu đúng → giai đoạn (1..4) + nhãn.
export function scoreToStage(correct: number): { stage: number; level: string } {
  if (correct <= 2) return { stage: 1, level: "A1" };
  if (correct <= 4) return { stage: 2, level: "A2" };
  if (correct <= 6) return { stage: 3, level: "B1" };
  return { stage: 4, level: "B2" };
}

// 4 mức tự chọn nhanh.
export const LEVEL_CHOICES = [
  { stage: 1, level: "A1", label: "Mới bắt đầu", desc: "Biết vài từ, chưa nói được câu", emoji: "🌱" },
  { stage: 2, level: "A2", label: "Cơ bản", desc: "Nói được câu đơn giản, từ vựng cơ bản", emoji: "🌿" },
  { stage: 3, level: "B1", label: "Giao tiếp được", desc: "Trò chuyện hằng ngày tạm ổn", emoji: "🌳" },
  { stage: 4, level: "B2", label: "Khá tốt", desc: "Diễn đạt trôi chảy nhiều chủ đề", emoji: "🚀" },
];
