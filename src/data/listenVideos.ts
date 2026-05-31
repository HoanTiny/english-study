// Nguồn luyện nghe theo chủ đề — video YouTube từ các kênh UY TÍN, MIỄN PHÍ.
// Nhúng hợp lệ qua YouTube IFrame (không tải về). Nếu 1 video bị gỡ, chỉ cần thay id.

export type Vid = { id: string; title: string; channel: string; level: string };
export type ListenTopic = { key: string; label: string; emoji: string; videos: Vid[] };

export const LISTEN_TOPICS: ListenTopic[] = [
  {
    key: "daily",
    label: "Hội thoại hằng ngày",
    emoji: "💬",
    videos: [
      { id: "heycg7D5VZw", title: "Let's Learn English – Lesson 1: Welcome!", channel: "VOA Learning English", level: "A1" },
      { id: "IlBaOlsjyrY", title: "Let's Learn English L1 – Lesson 30: Speaking", channel: "VOA Learning English", level: "A1" },
      { id: "7twBgTvHU5k", title: "Let's Learn English L1 – Lesson 31: Speaking", channel: "VOA Learning English", level: "A1" },
      { id: "JnHNiJyBwvY", title: "English Conversation – Everyday Situations", channel: "Daily English", level: "A1" },
      { id: "feHt3D2pv80", title: "Basic English Conversations for Everyday Life", channel: "Daily English", level: "A2" },
    ],
  },
  {
    key: "travel",
    label: "Du lịch",
    emoji: "✈️",
    videos: [
      { id: "yeDj1asU8_Q", title: "English Conversations for Beginners – Travel & more", channel: "Learn English", level: "A1" },
      { id: "A3qRAu-U8Rk", title: "Travel English | Airport & Hotel Conversations", channel: "Easy English", level: "A2" },
      { id: "EuGBimHfeoE", title: "English for Travel | Airport, Hotel & Restaurant", channel: "Learn English", level: "A2" },
      { id: "TsFfaZ_jiEI", title: "Essential English for Travelers", channel: "Learn English", level: "A2" },
    ],
  },
  {
    key: "kids",
    label: "Truyện cho trẻ em",
    emoji: "🧚",
    videos: [
      { id: "VjIE-Sl-qKY", title: "Goldilocks and the Three Bears", channel: "Fairy Tales & Stories", level: "A1" },
      { id: "ZK0POy_WVBk", title: "Fairy Tale Stories – Short Stories for Kids", channel: "Fairy Tales & Stories", level: "A2" },
      { id: "MJcWGOkbl10", title: "The Lost Dragon – Bedtime Story", channel: "Fairy Tales & Stories", level: "A2" },
      { id: "jjcvbaMHhSU", title: "Best Children's Classics – 5 Tales", channel: "Fairy Tales & Stories", level: "A2" },
    ],
  },
  {
    key: "pronun",
    label: "Phát âm & IPA",
    emoji: "🔤",
    videos: [
      { id: "4cU9fqpCqBA", title: "American English Consonants – IPA", channel: "Rachel's English", level: "A2" },
      { id: "b_qcAuHhJIc", title: "Learn the IPA – Consonants", channel: "Rachel's English", level: "A2" },
      { id: "XajvB178Hhs", title: "American English Diphthongs – IPA", channel: "Rachel's English", level: "B1" },
      { id: "jaRcbpN_KlM", title: "Diphthongs & Vowel mistakes", channel: "Rachel's English", level: "B1" },
      { id: "zash7H0eMQ4", title: "Welcome to Rachel's English", channel: "Rachel's English", level: "A2" },
    ],
  },
  {
    key: "6min",
    label: "BBC 6 Minute English",
    emoji: "⏲️",
    videos: [
      { id: "xy27CfuFtJE", title: "Talking at the table", channel: "BBC Learning English", level: "B1" },
      { id: "QdE63sYqwd8", title: "Why are we all so stressed?", channel: "BBC Learning English", level: "B1" },
      { id: "wCgPjVzREqs", title: "How the world learned to love fast food", channel: "BBC Learning English", level: "B1" },
      { id: "gEdPVA-6rVs", title: "BOX SET: Food and Drink (1 giờ)", channel: "BBC Learning English", level: "B1" },
      { id: "m9LyXOBmQvo", title: "BOX SET: Business & Work 2", channel: "BBC Learning English", level: "B2" },
    ],
  },
  {
    key: "ted",
    label: "TED-Ed (bài nói)",
    emoji: "💡",
    videos: [
      { id: "f2O6mQkFiiw", title: "How to practice effectively… for anything", channel: "TED-Ed", level: "B2" },
      { id: "W6aL9YyRx1A", title: "What is the coldest thing in the world?", channel: "TED-Ed", level: "B2" },
      { id: "aISXCw0Pi94", title: "How Every Child Can Thrive by Five", channel: "TED", level: "B2" },
    ],
  },
  {
    key: "ielts",
    label: "Luyện thi IELTS",
    emoji: "🎯",
    videos: [
      { id: "pR-LnJhWBlQ", title: "IELTS Listening Practice Test 01 (Full)", channel: "IELTS Listening", level: "B2" },
      { id: "lCJJRJHelQA", title: "IELTS Real Exam Listening Test (Full)", channel: "IELTS Listening", level: "B2" },
      { id: "Wwxhw39_2iA", title: "Full IELTS Listening Practice Test", channel: "IELTS Listening", level: "B2" },
      { id: "OxbHmQrY1bc", title: "IELTS Listening Practice Test 6 (Full)", channel: "IELTS Listening", level: "B2" },
    ],
  },
];
