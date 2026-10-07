// Nguồn luyện nghe theo chủ đề — video YouTube từ các kênh UY TÍN, MIỄN PHÍ.
// Nhúng hợp lệ qua YouTube IFrame (không tải về). Nếu 1 video bị gỡ, chỉ cần thay id.

export type Vid = { id: string; title: string; channel: string; level: string; cc?: boolean };
export type ListenTopic = { key: string; label: string; emoji: string; videos: Vid[] };

// Danh mục chủ đề (key/label/emoji) — dùng chung cho trang Luyện nghe & CMS.
export type TopicMeta = { key: string; label: string; emoji: string };

export const LISTEN_TOPICS: ListenTopic[] = [
  {
    key: "daily",
    label: "Hội thoại hằng ngày",
    emoji: "💬",
    videos: [
      { id: "heycg7D5VZw", title: "Let's Learn English – Lesson 1: Welcome!", channel: "VOA Learning English", level: "A1", cc: false },
      { id: "IlBaOlsjyrY", title: "Let's Learn English L1 – Lesson 30: Speaking", channel: "VOA Learning English", level: "A1", cc: false },
      { id: "7twBgTvHU5k", title: "Let's Learn English L1 – Lesson 31: Speaking", channel: "VOA Learning English", level: "A1", cc: false },
      { id: "JnHNiJyBwvY", title: "English Conversation – Everyday Situations", channel: "Daily English", level: "A1", cc: true },
      { id: "feHt3D2pv80", title: "Basic English Conversations for Everyday Life", channel: "Daily English", level: "A2", cc: true },
      { id: "j64n3KdIob0", title: "Real Easy English: How to talk about your brain", channel: "BBC Learning English", level: "A2", cc: true },
      { id: "Gct6PU-D5qw", title: "Real Easy English: The language of secrets", channel: "BBC Learning English", level: "A2", cc: true },
    ],
  },
  {
    key: "travel",
    label: "Du lịch",
    emoji: "✈️",
    videos: [
      { id: "yeDj1asU8_Q", title: "English Conversations for Beginners – Travel & more", channel: "Learn English", level: "A1", cc: true },
      { id: "A3qRAu-U8Rk", title: "Travel English | Airport & Hotel Conversations", channel: "Easy English", level: "A2", cc: true },
      { id: "EuGBimHfeoE", title: "English for Travel | Airport, Hotel & Restaurant", channel: "Learn English", level: "A2", cc: true },
      { id: "TsFfaZ_jiEI", title: "Essential English for Travelers", channel: "Learn English", level: "A2", cc: true },
    ],
  },
  {
    key: "kids",
    label: "Truyện cho trẻ em",
    emoji: "🧚",
    videos: [
      { id: "VjIE-Sl-qKY", title: "Goldilocks and the Three Bears", channel: "Fairy Tales & Stories", level: "A1", cc: true },
      { id: "ZK0POy_WVBk", title: "Fairy Tale Stories – Short Stories for Kids", channel: "Fairy Tales & Stories", level: "A2", cc: true },
      { id: "MJcWGOkbl10", title: "The Lost Dragon – Bedtime Story", channel: "Fairy Tales & Stories", level: "A2", cc: true },
      { id: "jjcvbaMHhSU", title: "Best Children's Classics – 5 Tales", channel: "Fairy Tales & Stories", level: "A2", cc: true },
    ],
  },
  {
    key: "pronun",
    label: "Phát âm & IPA",
    emoji: "🔤",
    videos: [
      { id: "4cU9fqpCqBA", title: "American English Consonants – IPA", channel: "Rachel's English", level: "A2", cc: true },
      { id: "b_qcAuHhJIc", title: "Learn the IPA – Consonants", channel: "Rachel's English", level: "A2", cc: true },
      { id: "XajvB178Hhs", title: "American English Diphthongs – IPA", channel: "Rachel's English", level: "B1", cc: true },
      { id: "jaRcbpN_KlM", title: "Diphthongs & Vowel mistakes", channel: "Rachel's English", level: "B1", cc: true },
      { id: "zash7H0eMQ4", title: "Welcome to Rachel's English", channel: "Rachel's English", level: "A2", cc: true },
      { id: "YfvD3KpHY2A", title: "How to Pronounce: Fun Practice - Exaggeration", channel: "VOA Learning English", level: "A2", cc: true },
      { id: "uuYpEPqCYYs", title: "How to Pronounce: Pauses and connections", channel: "VOA Learning English", level: "B1", cc: true },
    ],
  },
  {
    key: "6min",
    label: "BBC 6 Minute English",
    emoji: "⏲️",
    videos: [
      { id: "xy27CfuFtJE", title: "Talking at the table", channel: "BBC Learning English", level: "B1", cc: true },
      { id: "QdE63sYqwd8", title: "Why are we all so stressed?", channel: "BBC Learning English", level: "B1", cc: true },
      { id: "wCgPjVzREqs", title: "How the world learned to love fast food", channel: "BBC Learning English", level: "B1", cc: true },
      { id: "gEdPVA-6rVs", title: "BOX SET: Food and Drink (1 giờ)", channel: "BBC Learning English", level: "B1", cc: true },
      { id: "m9LyXOBmQvo", title: "BOX SET: Business & Work 2", channel: "BBC Learning English", level: "B2", cc: true },
      { id: "Cq8v437OWyU", title: "The power of poetry", channel: "BBC Learning English", level: "B1", cc: true },
      { id: "dgFm7A8pyzo", title: "Living with debt", channel: "BBC Learning English", level: "B1", cc: true },
      { id: "pcj0JDQiPXY", title: "BOX SET: Communication 2 (30 phút)", channel: "BBC Learning English", level: "B1", cc: true },
    ],
  },
  {
    key: "ted",
    label: "TED-Ed (bài nói)",
    emoji: "💡",
    videos: [
      { id: "f2O6mQkFiiw", title: "How to practice effectively… for anything", channel: "TED-Ed", level: "B2", cc: true },
      { id: "W6aL9YyRx1A", title: "What is the coldest thing in the world?", channel: "TED-Ed", level: "B2", cc: true },
      { id: "aISXCw0Pi94", title: "How Every Child Can Thrive by Five", channel: "TED", level: "B2", cc: true },
      { id: "Q9Vt6NGBVBc", title: "Just how ancient is sumo?", channel: "TED-Ed", level: "B2", cc: true },
      { id: "uBwkMc1llmM", title: "The incredible engineering of Venice", channel: "TED-Ed", level: "B2", cc: true },
      { id: "HDt_rTPPh70", title: "Why does catnip make cats go crazy?", channel: "TED-Ed", level: "B2", cc: true },
      { id: "65I_1sgTMLE", title: "When should you use 'fewer' vs 'less'?", channel: "TED-Ed", level: "B2", cc: true },
    ],
  },
  {
    key: "news",
    label: "Tiếng Anh thời sự",
    emoji: "📰",
    videos: [
      { id: "j25wX7H1fnk", title: "What could a super El Niño bring? (Learning English from the News)", channel: "BBC Learning English", level: "B1", cc: true },
      { id: "2FZEznNC-Fs", title: "Is social media 'the new smoking'? (Learning English from the News)", channel: "BBC Learning English", level: "B2", cc: true },
    ],
  },
  {
    key: "speakclass",
    label: "Lớp luyện nói (BBC Live)",
    emoji: "🧑‍🏫",
    videos: [
      { id: "I1GWT0Oosp8", title: "How to keep conversations flowing in natural English", channel: "BBC Learning English", level: "B1", cc: true },
      { id: "ORHniANns7k", title: "Everyday phrasal verbs used in real spoken English", channel: "BBC Learning English", level: "B1", cc: true },
    ],
  },
  {
    key: "grammarvid",
    label: "Ngữ pháp & từ vựng qua video",
    emoji: "📘",
    videos: [
      { id: "q4PkX8_xUYk", title: "Everyday Grammar: Ramen, A Popular Food in Japan", channel: "VOA Learning English", level: "A2", cc: true },
      { id: "41jE1ijuf_4", title: "Everyday Grammar: A Popular Person in Turkey", channel: "VOA Learning English", level: "A2", cc: true },
      { id: "vyPofYmxIJA", title: "Everyday Grammar: 'Population' in Sentences", channel: "VOA Learning English", level: "A2", cc: true },
      { id: "J8EWSLZ36s0", title: "English in a Minute: Dish It Out but Can't Take It", channel: "VOA Learning English", level: "B1", cc: true },
      { id: "1no_QyItrgw", title: "BOX SET: 8 expressions with 'you', 'your', 'my'", channel: "BBC Learning English", level: "B1", cc: true },
    ],
  },
  {
    key: "ielts",
    label: "Luyện thi IELTS",
    emoji: "🎯",
    videos: [
      { id: "pR-LnJhWBlQ", title: "IELTS Listening Practice Test 01 (Full)", channel: "IELTS Listening", level: "B2", cc: true },
      { id: "lCJJRJHelQA", title: "IELTS Real Exam Listening Test (Full)", channel: "IELTS Listening", level: "B2", cc: true },
      { id: "Wwxhw39_2iA", title: "Full IELTS Listening Practice Test", channel: "IELTS Listening", level: "B2", cc: true },
      { id: "OxbHmQrY1bc", title: "IELTS Listening Practice Test 6 (Full)", channel: "IELTS Listening", level: "B2", cc: true },
    ],
  },
];

// Danh mục chủ đề rút từ seed (giữ thứ tự). CMS dùng để chọn chủ đề khi thêm video.
export const TOPIC_META: TopicMeta[] = LISTEN_TOPICS.map(({ key, label, emoji }) => ({ key, label, emoji }));

export const LEVELS = ["A1", "A2", "B1", "B2"];
