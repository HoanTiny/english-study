// Nội dung GỐC về 3 thì cơ bản (tự soạn theo ngữ pháp chuẩn, không sao chép giáo trình).
export type Tense = {
  id: string;
  name: string; // tên tiếng Anh
  vi: string; // tên tiếng Việt
  when: string[]; // khi nào dùng
  form: { label: string; formula: string; example: string }[];
  signals: string[]; // dấu hiệu nhận biết
  examples: { en: string; vi: string }[];
};

export const TENSES: Tense[] = [
  {
    id: "present-simple",
    name: "Simple Present",
    vi: "Hiện tại đơn",
    when: [
      "Sự thật hiển nhiên, chân lý",
      "Thói quen, việc lặp đi lặp lại",
      "Lịch trình cố định (tàu, xe, giờ học)",
    ],
    form: [
      { label: "Khẳng định", formula: "S + V(s/es)", example: "She works in Hanoi." },
      { label: "Phủ định", formula: "S + don't/doesn't + V", example: "He doesn't eat meat." },
      { label: "Nghi vấn", formula: "Do/Does + S + V?", example: "Do you like coffee?" },
    ],
    signals: ["always", "usually", "often", "sometimes", "every day", "never"],
    examples: [
      { en: "I work from nine to five.", vi: "Tôi làm việc từ 9 đến 5 giờ." },
      { en: "The sun rises in the east.", vi: "Mặt trời mọc ở hướng đông." },
      { en: "She goes to school by bus.", vi: "Cô ấy đi học bằng xe buýt." },
    ],
  },
  {
    id: "present-continuous",
    name: "Present Continuous",
    vi: "Hiện tại tiếp diễn",
    when: [
      "Việc đang diễn ra ngay lúc nói",
      "Việc tạm thời quanh thời điểm hiện tại",
      "Kế hoạch đã sắp xếp trong tương lai gần",
    ],
    form: [
      { label: "Khẳng định", formula: "S + am/is/are + V-ing", example: "I am cooking dinner." },
      { label: "Phủ định", formula: "S + am/is/are + not + V-ing", example: "It isn't raining now." },
      { label: "Nghi vấn", formula: "Am/Is/Are + S + V-ing?", example: "What are you doing?" },
    ],
    signals: ["now", "right now", "at the moment", "Look!", "Listen!", "currently"],
    examples: [
      { en: "I'm cooking dinner right now.", vi: "Tôi đang nấu tối ngay bây giờ." },
      { en: "They are playing in the garden.", vi: "Họ đang chơi ngoài vườn." },
      { en: "She is wearing a red dress today.", vi: "Hôm nay cô ấy mặc váy đỏ." },
    ],
  },
  {
    id: "past-simple",
    name: "Simple Past",
    vi: "Quá khứ đơn",
    when: [
      "Hành động đã xảy ra và kết thúc trong quá khứ",
      "Chuỗi hành động nối tiếp trong quá khứ",
      "Thói quen trong quá khứ (nay không còn)",
    ],
    form: [
      { label: "Khẳng định", formula: "S + V2/V-ed", example: "I watched a film." },
      { label: "Phủ định", formula: "S + didn't + V", example: "She didn't go to work." },
      { label: "Nghi vấn", formula: "Did + S + V?", example: "Did you finish it?" },
    ],
    signals: ["yesterday", "last week", "... ago", "in 2010", "this morning"],
    examples: [
      { en: "Yesterday I went to the park.", vi: "Hôm qua tôi đã đi công viên." },
      { en: "We watched a film last night.", vi: "Tối qua chúng tôi xem phim." },
      { en: "Did you call her?", vi: "Bạn đã gọi cho cô ấy chưa?" },
    ],
  },
];
