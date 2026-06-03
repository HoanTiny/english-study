// Dữ liệu 44 âm IPA tiếng Anh + cặp âm dễ nhầm (minimal pairs).
// Dùng cho trang /ipa: bảng âm theo nhóm, nghe–nhại, và luyện phân biệt kiểu HVPT.

export type SoundType = "consonant" | "monophthong" | "diphthong";
export type IpaSound = {
  symbol: string; // /p/
  type: SoundType;
  words: string[]; // từ ví dụ (phát âm được qua Free Dictionary)
  tip: string; // mô tả cách phát âm (khẩu hình)
  example: string; // câu ví dụ
  hard?: boolean; // âm người Việt hay sai
};

export const IPA_SOUNDS: IpaSound[] = [
  // ── 24 PHỤ ÂM ──
  { symbol: "/p/", type: "consonant", words: ["pen", "happy", "stop", "apple"], tip: "Tắc, vô thanh — bật hơi mạnh.", example: "Please pass me the pen." },
  { symbol: "/b/", type: "consonant", words: ["bad", "job", "table", "big"], tip: "Tắc, hữu thanh — như /p/ nhưng rung dây thanh.", example: "That's not a bad job." },
  { symbol: "/t/", type: "consonant", words: ["tea", "water", "cat", "time"], tip: "Tắc, vô thanh — đầu lưỡi chạm lợi.", example: "I'd like a cup of tea." },
  { symbol: "/d/", type: "consonant", words: ["dog", "red", "day", "bed"], tip: "Tắc, hữu thanh — như /t/ có rung.", example: "The red dog is mine." },
  { symbol: "/k/", type: "consonant", words: ["cat", "school", "key", "book"], tip: "Tắc, vô thanh — cuống lưỡi chạm vòm mềm.", example: "The cat is at school." },
  { symbol: "/ɡ/", type: "consonant", words: ["go", "big", "dog", "give"], tip: "Tắc, hữu thanh — như /k/ có rung.", example: "Let's go to the big park." },
  { symbol: "/f/", type: "consonant", words: ["fish", "coffee", "phone", "off"], tip: "Xát, vô thanh — răng trên chạm môi dưới.", example: "I had fish and coffee." },
  { symbol: "/v/", type: "consonant", words: ["very", "love", "voice", "save"], tip: "Xát, hữu thanh — răng trên chạm môi dưới, CÓ rung (hay nhầm thành /b/).", example: "I love it very much.", hard: true },
  { symbol: "/θ/", type: "consonant", words: ["think", "bath", "three", "mouth"], tip: "Xát, vô thanh — đặt lưỡi GIỮA hai răng, thổi hơi (không có trong tiếng Việt).", example: "I think I'll take a bath.", hard: true },
  { symbol: "/ð/", type: "consonant", words: ["this", "mother", "the", "weather"], tip: "Xát, hữu thanh — lưỡi giữa hai răng, CÓ rung.", example: "This is my mother.", hard: true },
  { symbol: "/s/", type: "consonant", words: ["sun", "bus", "sea", "ice"], tip: "Xát, vô thanh — luồng hơi qua đầu lưỡi.", example: "The sun is out; catch the bus." },
  { symbol: "/z/", type: "consonant", words: ["zoo", "is", "zero", "easy"], tip: "Xát, hữu thanh — như /s/ có rung (đừng bỏ rung ở cuối từ).", example: "The zoo is open.", hard: true },
  { symbol: "/ʃ/", type: "consonant", words: ["she", "fish", "ship", "wash"], tip: "Xát, vô thanh — chu môi, âm 'sh'.", example: "She likes fish." },
  { symbol: "/ʒ/", type: "consonant", words: ["vision", "usually", "measure", "television"], tip: "Xát, hữu thanh — như /ʃ/ có rung; ít gặp.", example: "I usually have good vision." },
  { symbol: "/h/", type: "consonant", words: ["hat", "hello", "house", "behind"], tip: "Xát, vô thanh — thở hơi nhẹ ra.", example: "Hello, nice hat!" },
  { symbol: "/tʃ/", type: "consonant", words: ["chair", "watch", "cheese", "teach"], tip: "Tắc-xát, vô thanh — âm 'ch'.", example: "Sit on the chair and watch." },
  { symbol: "/dʒ/", type: "consonant", words: ["job", "age", "judge", "bridge"], tip: "Tắc-xát, hữu thanh — âm 'j'.", example: "He got a job at his age." },
  { symbol: "/m/", type: "consonant", words: ["man", "time", "summer", "name"], tip: "Mũi, hữu thanh — khép môi, hơi ra mũi.", example: "The man has no time." },
  { symbol: "/n/", type: "consonant", words: ["no", "sun", "name", "run"], tip: "Mũi, hữu thanh — đầu lưỡi chạm lợi.", example: "No sun today." },
  { symbol: "/ŋ/", type: "consonant", words: ["sing", "long", "king", "thing"], tip: "Mũi, hữu thanh — 'ng' cuối từ; đừng thêm /g/.", example: "I sing a long song.", hard: true },
  { symbol: "/l/", type: "consonant", words: ["leg", "ball", "light", "hello"], tip: "Bên, hữu thanh — đầu lưỡi chạm lợi.", example: "Kick the ball with your leg." },
  { symbol: "/r/", type: "consonant", words: ["red", "sorry", "right", "around"], tip: "Hữu thanh — cong lưỡi, KHÔNG chạm (khác /l/).", example: "Sorry, the red one is taken.", hard: true },
  { symbol: "/w/", type: "consonant", words: ["we", "water", "win", "away"], tip: "Bán nguyên âm — tròn môi rồi mở.", example: "We need some water." },
  { symbol: "/j/", type: "consonant", words: ["yes", "you", "yellow", "year"], tip: "Bán nguyên âm — như 'y' trong 'yes'.", example: "Yes, this is for you." },
  // ── 12 NGUYÊN ÂM ĐƠN ──
  { symbol: "/iː/", type: "monophthong", words: ["see", "eat", "tree", "me"], tip: "Nguyên âm DÀI — môi giãn rộng (mỉm cười).", example: "I see you eat a lot." },
  { symbol: "/ɪ/", type: "monophthong", words: ["sit", "big", "ship", "in"], tip: "Nguyên âm NGẮN — thả lỏng, đừng kéo dài (≠ /iː/).", example: "Sit on the big chair.", hard: true },
  { symbol: "/e/", type: "monophthong", words: ["bed", "ten", "red", "head"], tip: "Ngắn — như 'e' tiếng Việt, gọn.", example: "There are ten beds." },
  { symbol: "/æ/", type: "monophthong", words: ["cat", "bad", "apple", "man"], tip: "Ngắn — miệng mở rộng, giữa 'a' và 'e'.", example: "The bad cat ran away.", hard: true },
  { symbol: "/ɑː/", type: "monophthong", words: ["car", "father", "far", "heart"], tip: "DÀI — mở miệng, lưỡi lùi sau.", example: "My father drives a car." },
  { symbol: "/ɒ/", type: "monophthong", words: ["hot", "dog", "box", "stop"], tip: "Ngắn — tròn môi nhẹ (Anh-Anh).", example: "The dog is hot." },
  { symbol: "/ɔː/", type: "monophthong", words: ["door", "four", "ball", "more"], tip: "DÀI — tròn môi, hạ hàm.", example: "Open the four doors." },
  { symbol: "/ʊ/", type: "monophthong", words: ["book", "good", "foot", "put"], tip: "Ngắn — tròn môi nhẹ, gọn (≠ /uː/).", example: "This is a good book.", hard: true },
  { symbol: "/uː/", type: "monophthong", words: ["blue", "food", "moon", "two"], tip: "DÀI — tròn môi, đẩy hơi ra.", example: "The blue box has food." },
  { symbol: "/ʌ/", type: "monophthong", words: ["cup", "love", "sun", "bus"], tip: "Ngắn — thả lỏng, âm ở giữa miệng.", example: "I love this cup." },
  { symbol: "/ɜː/", type: "monophthong", words: ["bird", "learn", "work", "girl"], tip: "DÀI — lưỡi ở giữa, môi không tròn.", example: "Learn about the bird." },
  { symbol: "/ə/", type: "monophthong", words: ["about", "teacher", "banana", "sofa"], tip: "Schwa — âm 'ơ' YẾU nhất, ở âm tiết không nhấn (rất phổ biến).", example: "Ask the teacher about it.", hard: true },
  // ── 8 NGUYÊN ÂM ĐÔI ──
  { symbol: "/eɪ/", type: "diphthong", words: ["day", "name", "play", "rain"], tip: "Trượt 'ê → i'.", example: "What's your name today?" },
  { symbol: "/aɪ/", type: "diphthong", words: ["my", "time", "five", "eye"], tip: "Trượt 'a → i'.", example: "It's my time now." },
  { symbol: "/ɔɪ/", type: "diphthong", words: ["boy", "enjoy", "coin", "noise"], tip: "Trượt 'o → i'.", example: "The boy enjoys the game." },
  { symbol: "/aʊ/", type: "diphthong", words: ["now", "house", "cow", "out"], tip: "Trượt 'a → u'.", example: "Come to my house now." },
  { symbol: "/əʊ/", type: "diphthong", words: ["go", "home", "no", "snow"], tip: "Trượt 'ơ → u' (Anh-Anh).", example: "Let's go home." },
  { symbol: "/ɪə/", type: "diphthong", words: ["here", "near", "ear", "idea"], tip: "Trượt 'i → ơ'.", example: "Come here, near me." },
  { symbol: "/eə/", type: "diphthong", words: ["hair", "care", "chair", "where"], tip: "Trượt 'e → ơ'.", example: "Take care of your hair." },
  { symbol: "/ʊə/", type: "diphthong", words: ["tour", "pure", "sure", "cure"], tip: "Trượt 'u → ơ'; ngày càng hiếm.", example: "It's a pure, quiet tour." },
];

export type MinimalPair = {
  sound: string; // "/ɪ/ ↔ /iː/"
  tip: string;
  a: { word: string; ipa: string };
  b: { word: string; ipa: string };
  example: string;
};

export const MINIMAL_PAIRS: MinimalPair[] = [
  { sound: "/ɪ/ ↔ /iː/", tip: "Nguyên âm NGẮN vs DÀI — đừng đọc giống nhau.", a: { word: "ship", ipa: "/ʃɪp/" }, b: { word: "sheep", ipa: "/ʃiːp/" }, example: "The sheep is on the ship." },
  { sound: "/æ/ ↔ /e/", tip: "Miệng MỞ RỘNG vs gọn.", a: { word: "bad", ipa: "/bæd/" }, b: { word: "bed", ipa: "/bed/" }, example: "This bed is not bad." },
  { sound: "/θ/ ↔ /s/", tip: "Lưỡi GIỮA hai răng vs sau răng.", a: { word: "think", ipa: "/θɪŋk/" }, b: { word: "sink", ipa: "/sɪŋk/" }, example: "I think it will sink." },
  { sound: "/ð/ ↔ /d/", tip: "Âm XÁT (rung, hơi ra) vs âm TẮC.", a: { word: "they", ipa: "/ðeɪ/" }, b: { word: "day", ipa: "/deɪ/" }, example: "They arrived that day." },
  { sound: "/v/ ↔ /b/", tip: "Răng chạm môi (/v/) vs hai môi (/b/).", a: { word: "very", ipa: "/ˈveri/" }, b: { word: "berry", ipa: "/ˈberi/" }, example: "This berry is very sweet." },
  { sound: "/r/ ↔ /l/", tip: "Cong lưỡi KHÔNG chạm (/r/) vs chạm lợi (/l/).", a: { word: "right", ipa: "/raɪt/" }, b: { word: "light", ipa: "/laɪt/" }, example: "Turn right at the light." },
  { sound: "/s/ ↔ /z/", tip: "Âm cuối VÔ THANH vs HỮU THANH (đừng bỏ rung).", a: { word: "ice", ipa: "/aɪs/" }, b: { word: "eyes", ipa: "/aɪz/" }, example: "The ice hurt my eyes." },
  { sound: "/n/ ↔ /ŋ/", tip: "Âm cuối /n/ vs /ŋ/ — đừng nuốt 'ng'.", a: { word: "sin", ipa: "/sɪn/" }, b: { word: "sing", ipa: "/sɪŋ/" }, example: "It's a sin not to sing." },
  { sound: "/iː/ ↔ /ɪ/", tip: "DÀI vs NGẮN (lỗi rất phổ biến).", a: { word: "feel", ipa: "/fiːl/" }, b: { word: "fill", ipa: "/fɪl/" }, example: "Fill it until you feel it's full." },
  { sound: "/uː/ ↔ /ʊ/", tip: "DÀI vs NGẮN.", a: { word: "fool", ipa: "/fuːl/" }, b: { word: "full", ipa: "/fʊl/" }, example: "Don't fool me, the cup is full." },
  { sound: "/æ/ ↔ /ʌ/", tip: "Miệng mở rộng vs âm giữa, thả lỏng.", a: { word: "cat", ipa: "/kæt/" }, b: { word: "cut", ipa: "/kʌt/" }, example: "The cat made a cut." },
  { sound: "/p/ ↔ /b/", tip: "Vô thanh, bật hơi vs hữu thanh, rung.", a: { word: "pull", ipa: "/pʊl/" }, b: { word: "bull", ipa: "/bʊl/" }, example: "Pull the bull gently." },
];

export const TYPE_LABEL: Record<SoundType, string> = {
  consonant: "Phụ âm (24)",
  monophthong: "Nguyên âm đơn (12)",
  diphthong: "Nguyên âm đôi (8)",
};
