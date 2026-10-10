// Nội dung tự soạn về 12 mẫu thì/thể thường học. Các mẫu tương lai dùng trợ động từ.
// Từ chỉ thời gian là gợi ý; ngữ cảnh và ý nghĩa quyết định lựa chọn thì.
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
      "Với be, dùng am/is/are; không dùng do/does: She is a teacher. Is she a teacher?",
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
      "Các động từ trạng thái như know, own, believe thường không dùng tiếp diễn trong nghĩa cơ bản",
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
      "Thói quen trong một giai đoạn quá khứ; bản thân thì này không khẳng định thói quen đã chấm dứt",
      "Be có dạng was/were; phủ định was not/were not và câu hỏi đảo was/were, không dùng did",
    ],
    form: [
      { label: "Khẳng định", formula: "S + V2/V-ed", example: "I watched a film." },
      { label: "Phủ định", formula: "S + didn't + V", example: "She didn't go to work." },
      { label: "Nghi vấn", formula: "Did + S + V?", example: "Did you finish it?" },
    ],
    signals: ["yesterday", "last week", "... ago", "in 2010", "this morning (khi buổi sáng đã kết thúc)"],
    examples: [
      { en: "Yesterday I went to the park.", vi: "Hôm qua tôi đã đi công viên." },
      { en: "We watched a film last night.", vi: "Tối qua chúng tôi xem phim." },
      { en: "Did you call her?", vi: "Bạn đã gọi cho cô ấy chưa?" },
    ],
  },
  {
    id: "past-continuous",
    name: "Past Continuous",
    vi: "Quá khứ tiếp diễn",
    when: [
      "Hành động đang diễn ra tại một mốc trong quá khứ",
      "Bối cảnh đang tiếp diễn khi một sự kiện khác xen vào",
      "Hai hoạt động đồng thời; while thường mở bối cảnh nhưng không tự quyết định thì",
    ],
    form: [
      { label: "Khẳng định", formula: "S + was/were + V-ing", example: "She was reading at eight." },
      { label: "Phủ định", formula: "S + was/were + not + V-ing", example: "They weren't sleeping." },
      { label: "Nghi vấn", formula: "Was/Were + S + V-ing?", example: "Were you waiting for me?" },
    ],
    signals: ["at eight yesterday", "at that moment", "while", "when + sự kiện xen vào"],
    examples: [
      { en: "I was cooking when the phone rang.", vi: "Tôi đang nấu ăn thì điện thoại reo." },
      { en: "While I was studying, my sister was drawing.", vi: "Trong khi tôi đang học, em gái tôi đang vẽ." },
      { en: "It was raining, so we stayed inside.", vi: "Trời đang mưa nên chúng tôi ở trong nhà." },
      { en: "What were you doing at nine last night?", vi: "Tối qua lúc 9 giờ bạn đang làm gì?" },
    ],
  },
  {
    id: "present-perfect",
    name: "Present Perfect",
    vi: "Hiện tại hoàn thành",
    when: [
      "Trải nghiệm tính đến hiện tại, không nêu mốc quá khứ đã kết thúc",
      "Kết quả của hành động trước đó còn liên quan hiện tại",
      "Trạng thái bắt đầu trước đây và kéo dài đến nay: I've known her for years",
      "Phân biệt I've visited Hue với I visited Hue last year; không dùng yesterday với hiện tại hoàn thành",
    ],
    form: [
      { label: "Khẳng định", formula: "S + have/has + V3", example: "She has finished her work." },
      { label: "Phủ định", formula: "S + have/has + not + V3", example: "I haven't seen that film." },
      { label: "Nghi vấn", formula: "Have/Has + S + V3?", example: "Have you eaten yet?" },
    ],
    signals: ["ever", "never", "already", "yet", "so far", "since + mốc", "for + khoảng thời gian"],
    examples: [
      { en: "I've lost my keys, so I can't open the door.", vi: "Tôi làm mất chìa khóa nên không mở cửa được." },
      { en: "Have you ever been to Da Nang?", vi: "Bạn đã từng đến Đà Nẵng chưa?" },
      { en: "We have lived here since 2020.", vi: "Chúng tôi sống ở đây từ năm 2020 đến nay." },
      { en: "She has written three emails this morning.", vi: "Cô ấy đã viết ba email trong buổi sáng nay (buổi sáng vẫn đang diễn ra)." },
    ],
  },
  {
    id: "present-perfect-continuous",
    name: "Present Perfect Continuous",
    vi: "Hiện tại hoàn thành tiếp diễn",
    when: [
      "Nhấn mạnh quá trình hoặc thời lượng của hoạt động bắt đầu trước hiện tại",
      "Hoạt động vừa dừng nhưng còn dấu hiệu nhìn thấy được",
      "Đối chiếu I've been writing (quá trình) với I've written five pages (kết quả)",
      "Thường không dùng với know, own và các động từ trạng thái trong nghĩa cơ bản",
    ],
    form: [
      { label: "Khẳng định", formula: "S + have/has + been + V-ing", example: "I've been working all day." },
      { label: "Phủ định", formula: "S + have/has + not + been + V-ing", example: "She hasn't been sleeping well." },
      { label: "Nghi vấn", formula: "Have/Has + S + been + V-ing?", example: "How long have you been waiting?" },
    ],
    signals: ["all day", "lately", "recently", "for + khoảng thời gian", "since + mốc"],
    examples: [
      { en: "I've been learning English for six months.", vi: "Tôi đã học tiếng Anh liên tục được sáu tháng." },
      { en: "Your shoes are muddy. Have you been walking in the rain?", vi: "Giày bạn dính bùn. Bạn vừa đi bộ dưới mưa phải không?" },
      { en: "She's been looking for her phone all morning.", vi: "Cô ấy tìm điện thoại suốt buổi sáng đến giờ." },
      { en: "We haven't been using the car much lately.", vi: "Gần đây chúng tôi không dùng ô tô nhiều." },
    ],
  },
  {
    id: "past-perfect",
    name: "Past Perfect",
    vi: "Quá khứ hoàn thành",
    when: [
      "Hành động hoàn thành trước một mốc hay sự kiện khác trong quá khứ",
      "Làm rõ thứ tự khi kể chuyện; không cần dùng cho mọi hành động quá khứ",
      "Dùng trong câu điều kiện loại 3 và một số trường hợp tường thuật",
    ],
    form: [
      { label: "Khẳng định", formula: "S + had + V3", example: "The train had left before we arrived." },
      { label: "Phủ định", formula: "S + had + not + V3", example: "I hadn't met her before." },
      { label: "Nghi vấn", formula: "Had + S + V3?", example: "Had you booked a room?" },
    ],
    signals: ["by the time + mốc quá khứ", "already + mốc quá khứ", "before", "after"],
    examples: [
      { en: "When I got home, someone had opened the window.", vi: "Khi tôi về nhà, ai đó đã mở cửa sổ trước đó." },
      { en: "I was hungry because I hadn't eaten lunch.", vi: "Tôi đói vì trước đó chưa ăn trưa." },
      { en: "She had never flown before that trip.", vi: "Trước chuyến đi đó cô ấy chưa từng đi máy bay." },
      { en: "Had the meeting started when you arrived?", vi: "Khi bạn đến thì cuộc họp đã bắt đầu chưa?" },
    ],
  },
  {
    id: "past-perfect-continuous",
    name: "Past Perfect Continuous",
    vi: "Quá khứ hoàn thành tiếp diễn",
    when: [
      "Quá trình đã kéo dài đến một mốc quá khứ, nhấn vào thời lượng",
      "Giải thích dấu hiệu hoặc trạng thái ở một thời điểm quá khứ",
      "Phân biệt had been reading (quá trình) với had read the book (hoàn thành)",
    ],
    form: [
      { label: "Khẳng định", formula: "S + had + been + V-ing", example: "We had been waiting for an hour." },
      { label: "Phủ định", formula: "S + had + not + been + V-ing", example: "He hadn't been feeling well." },
      { label: "Nghi vấn", formula: "Had + S + been + V-ing?", example: "Had it been raining?" },
    ],
    signals: ["for + thời lượng trước mốc quá khứ", "since + mốc trước đó", "before", "when"],
    examples: [
      { en: "She was tired because she had been running.", vi: "Cô ấy mệt vì trước đó đã chạy." },
      { en: "We had been driving for hours when the car broke down.", vi: "Chúng tôi đã lái xe nhiều giờ thì xe hỏng." },
      { en: "He had been studying French before he moved to Paris.", vi: "Anh ấy đã học tiếng Pháp một thời gian trước khi chuyển đến Paris." },
      { en: "How long had you been working there when you became manager?", vi: "Bạn đã làm ở đó bao lâu trước khi trở thành quản lý?" },
    ],
  },
  {
    id: "future-simple",
    name: "Future with Will",
    vi: "Tương lai đơn với will",
    when: [
      "Quyết định ngay lúc nói, lời hứa hoặc lời đề nghị giúp đỡ",
      "Dự đoán hoặc nhận định về tương lai",
      "Đối chiếu going to cho dự định/dấu hiệu hiện tại và hiện tại tiếp diễn cho lịch hẹn đã thu xếp",
      "Sau if/when trong mệnh đề thời gian hoặc điều kiện tương lai cơ bản, thường dùng hiện tại đơn",
    ],
    form: [
      { label: "Khẳng định", formula: "S + will + V", example: "I'll help you with that." },
      { label: "Phủ định", formula: "S + will not / won't + V", example: "I won't forget." },
      { label: "Nghi vấn", formula: "Will + S + V?", example: "Will you be home tonight?" },
    ],
    signals: ["tomorrow", "next week", "I think", "probably", "in the future"],
    examples: [
      { en: "The phone is ringing. I'll answer it.", vi: "Điện thoại đang reo. Tôi sẽ nghe máy." },
      { en: "I think she'll enjoy the course.", vi: "Tôi nghĩ cô ấy sẽ thích khóa học." },
      { en: "I'll call you when I arrive.", vi: "Tôi sẽ gọi khi đến nơi." },
      { en: "Don't worry. We won't be late.", vi: "Đừng lo. Chúng tôi sẽ không đến muộn." },
    ],
  },
  {
    id: "future-continuous",
    name: "Future Continuous",
    vi: "Tương lai tiếp diễn",
    when: [
      "Hoạt động sẽ đang diễn ra tại một mốc tương lai",
      "Hỏi về kế hoạch dự kiến một cách trung tính, tùy ngữ cảnh",
      "Không dùng chỉ vì câu có tomorrow; cần ý nghĩa đang diễn ra ở mốc đó",
    ],
    form: [
      { label: "Khẳng định", formula: "S + will + be + V-ing", example: "I'll be travelling at this time tomorrow." },
      { label: "Phủ định", formula: "S + won't + be + V-ing", example: "She won't be working tonight." },
      { label: "Nghi vấn", formula: "Will + S + be + V-ing?", example: "Will you be using the car tonight?" },
    ],
    signals: ["this time tomorrow", "at nine tomorrow", "during the meeting tomorrow"],
    examples: [
      { en: "At eight tomorrow, I'll be taking my exam.", vi: "Lúc 8 giờ ngày mai tôi sẽ đang làm bài thi." },
      { en: "Don't call at six; we'll be having dinner.", vi: "Đừng gọi lúc 6 giờ; khi đó chúng tôi sẽ đang ăn tối." },
      { en: "Will you be staying here over the weekend?", vi: "Bạn có dự định ở đây trong cuối tuần không?" },
      { en: "She'll be waiting outside when you arrive.", vi: "Cô ấy sẽ đang chờ bên ngoài khi bạn tới." },
    ],
  },
  {
    id: "future-perfect",
    name: "Future Perfect",
    vi: "Tương lai hoàn thành",
    when: [
      "Việc sẽ hoàn thành trước hoặc chậm nhất vào một mốc tương lai",
      "Nêu kết quả đạt được khi nhìn lại từ một thời điểm tương lai",
      "By chỉ hạn chót; until thường chỉ sự kéo dài. Mệnh đề by the time nói tương lai thường dùng hiện tại đơn",
    ],
    form: [
      { label: "Khẳng định", formula: "S + will + have + V3", example: "I'll have finished by Friday." },
      { label: "Phủ định", formula: "S + won't + have + V3", example: "They won't have arrived by then." },
      { label: "Nghi vấn", formula: "Will + S + have + V3?", example: "Will you have finished by noon?" },
    ],
    signals: ["by Friday", "by then", "by the time + mốc tương lai", "before + mốc tương lai"],
    examples: [
      { en: "By next month, we'll have completed the course.", vi: "Đến tháng sau, chúng tôi sẽ hoàn thành khóa học." },
      { en: "The guests will have left by the time you get home.", vi: "Khi bạn về đến nhà thì khách sẽ đã ra về." },
      { en: "I won't have saved enough money by June.", vi: "Đến tháng Sáu tôi sẽ chưa tiết kiệm đủ tiền." },
      { en: "Will she have read the report before the meeting?", vi: "Cô ấy sẽ đọc xong báo cáo trước cuộc họp chứ?" },
    ],
  },
  {
    id: "future-perfect-continuous",
    name: "Future Perfect Continuous",
    vi: "Tương lai hoàn thành tiếp diễn",
    when: [
      "Nhấn mạnh thời lượng một hoạt động sẽ kéo dài tới một mốc tương lai",
      "Dùng khi cần làm rõ quá trình; khá ít gặp hơn các mẫu cơ bản trong giao tiếp hằng ngày",
      "Với động từ trạng thái, thường dùng tương lai hoàn thành đơn: will have known, không dùng will have been knowing",
    ],
    form: [
      { label: "Khẳng định", formula: "S + will + have + been + V-ing", example: "By May, I'll have been working here for a year." },
      { label: "Phủ định", formula: "S + won't + have + been + V-ing", example: "By Friday, I won't have been working here for a full week yet." },
      { label: "Nghi vấn", formula: "Will + S + have + been + V-ing?", example: "How long will you have been studying by then?" },
    ],
    signals: ["by + mốc tương lai", "for + thời lượng", "by then"],
    examples: [
      { en: "By June, she'll have been learning English for two years.", vi: "Đến tháng Sáu, cô ấy sẽ học tiếng Anh được hai năm." },
      { en: "At noon, we'll have been driving for six hours.", vi: "Đến trưa, chúng tôi sẽ lái xe liên tục được sáu giờ." },
      { en: "By the time the doors open, they'll have been waiting for an hour.", vi: "Khi cửa mở, họ sẽ chờ được một giờ." },
      { en: "By next week, he'll have been training for three months.", vi: "Đến tuần sau, anh ấy sẽ tập luyện được ba tháng." },
    ],
  },
];
