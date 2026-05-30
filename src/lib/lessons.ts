// Nội dung học chi tiết — học theo CỤM (chunk) + câu mẫu, không học từ lẻ.
// Mỗi cụm có thể đẩy thẳng vào hệ thống ôn tập SRS.

export type LessonPhrase = {
  en: string; // cụm/câu cần nói được
  vi: string; // nghĩa tiếng Việt
  ipa?: string; // phiên âm gợi ý
  example: string; // câu mẫu dùng cụm này
};

export type LessonContent = {
  slug: string;
  title: string;
  cefr: string;
  intro: string; // mục tiêu ngắn của bài
  tip?: string; // mẹo luyện
  phrases: LessonPhrase[];
  // (Tùy chọn) ID video YouTube để nhúng phần luyện nghe. Bỏ trống → hiện link
  // tìm kiếm theo kênh uy tín hợp cấp độ (xem src/lib/listening.ts).
  youtubeId?: string;
};

export const lessonContent: Record<string, LessonContent> = {
  greetings: {
    slug: "greetings",
    title: "Chào hỏi & giới thiệu",
    cefr: "A1",
    intro:
      "Nói được những câu mở đầu hội thoại và tự giới thiệu bản thân một cách tự nhiên.",
    tip: "Đừng dịch từng từ. Học nguyên cụm và bật ra cả khối khi cần.",
    phrases: [
      {
        en: "Nice to meet you.",
        vi: "Rất vui được gặp bạn.",
        ipa: "/naɪs tə ˈmiːt juː/",
        example: "Hi, I'm Nam. Nice to meet you.",
      },
      {
        en: "My name is…",
        vi: "Tên tôi là…",
        ipa: "/maɪ ˈneɪm ɪz/",
        example: "My name is Linh, and I'm from Hanoi.",
      },
      {
        en: "I'm from…",
        vi: "Tôi đến từ…",
        ipa: "/aɪm frɒm/",
        example: "I'm from Vietnam.",
      },
      {
        en: "How are you doing?",
        vi: "Dạo này bạn thế nào?",
        ipa: "/haʊ ɑːr juː ˈduːɪŋ/",
        example: "Hey! How are you doing today?",
      },
      {
        en: "What do you do?",
        vi: "Bạn làm nghề gì?",
        ipa: "/wɒt də juː duː/",
        example: "Nice to meet you. So, what do you do?",
      },
      {
        en: "See you later.",
        vi: "Hẹn gặp lại.",
        ipa: "/siː juː ˈleɪtər/",
        example: "I have to go now. See you later!",
      },
      {
        en: "How's it going?",
        vi: "Dạo này sao rồi?",
        ipa: "/haʊz ɪt ˈɡəʊɪŋ/",
        example: "Hi Mai, how's it going?",
      },
      {
        en: "Long time no see!",
        vi: "Lâu quá không gặp!",
        ipa: "/lɒŋ taɪm nəʊ siː/",
        example: "Hey, long time no see! How have you been?",
      },
      {
        en: "Let me introduce myself.",
        vi: "Để tôi tự giới thiệu.",
        ipa: "/lɛt miː ˌɪntrəˈdjuːs maɪˈsɛlf/",
        example: "Let me introduce myself. I'm Nam.",
      },
    ],
  },
  family: {
    slug: "family",
    title: "Gia đình",
    cefr: "A1",
    intro: "Mô tả các thành viên trong gia đình và mối quan hệ.",
    tip: "Tự kể về gia đình mình 3–5 câu mỗi ngày, đọc to thành tiếng.",
    phrases: [
      {
        en: "There are … people in my family.",
        vi: "Gia đình tôi có … người.",
        ipa: "/ðeər ɑːr/",
        example: "There are four people in my family.",
      },
      {
        en: "I have an older brother.",
        vi: "Tôi có một anh trai.",
        ipa: "/aɪ hæv ən ˈəʊldər ˈbrʌðər/",
        example: "I have an older brother and a younger sister.",
      },
      {
        en: "He takes after my dad.",
        vi: "Anh ấy giống bố tôi.",
        ipa: "/hiː ˈteɪks ˈɑːftər/",
        example: "He takes after my dad — they both love football.",
      },
      {
        en: "We get along well.",
        vi: "Chúng tôi hợp nhau.",
        ipa: "/wiː ɡɛt əˈlɒŋ wɛl/",
        example: "My sister and I get along well.",
      },
      {
        en: "She works as a…",
        vi: "Cô ấy làm nghề…",
        ipa: "/ʃiː ˈwɜːks æz/",
        example: "My mom works as a teacher.",
      },
      {
        en: "We are very close.",
        vi: "Chúng tôi rất thân nhau.",
        ipa: "/wiː ɑːr ˈvɛri kləʊs/",
        example: "I have one sister and we are very close.",
      },
      {
        en: "My parents live in …",
        vi: "Bố mẹ tôi sống ở …",
        ipa: "/maɪ ˈpeərənts lɪv ɪn/",
        example: "My parents live in the countryside.",
      },
      {
        en: "He looks like my mother.",
        vi: "Anh ấy trông giống mẹ tôi.",
        ipa: "/hiː lʊks laɪk/",
        example: "My brother looks like my mother.",
      },
    ],
  },
  "numbers-time": {
    slug: "numbers-time",
    title: "Số đếm & thời gian",
    cefr: "A1",
    intro: "Nói giờ giấc, ngày tháng và các con số trong đời sống.",
    tip: "Đọc to mọi con số bạn nhìn thấy trong ngày (giá tiền, giờ, biển số).",
    phrases: [
      {
        en: "What time is it?",
        vi: "Mấy giờ rồi?",
        ipa: "/wɒt taɪm ɪz ɪt/",
        example: "Excuse me, what time is it?",
      },
      {
        en: "It's half past seven.",
        vi: "Bây giờ là 7 giờ rưỡi.",
        ipa: "/ɪts hɑːf pɑːst ˈsɛvən/",
        example: "It's half past seven, let's go.",
      },
      {
        en: "a quarter to nine",
        vi: "9 giờ kém 15",
        ipa: "/ə ˈkwɔːtər tə naɪn/",
        example: "The meeting starts at a quarter to nine.",
      },
      {
        en: "How much is it?",
        vi: "Cái này giá bao nhiêu?",
        ipa: "/haʊ mʌtʃ ɪz ɪt/",
        example: "This looks nice. How much is it?",
      },
      {
        en: "on the first of May",
        vi: "vào ngày 1 tháng 5",
        ipa: "/ɒn ðə fɜːst əv meɪ/",
        example: "My birthday is on the first of May.",
      },
      {
        en: "It's a quarter past ten.",
        vi: "Bây giờ là 10 giờ 15.",
        ipa: "/ɪts ə ˈkwɔːtər pɑːst tɛn/",
        example: "Hurry up, it's a quarter past ten.",
      },
      {
        en: "from nine to five",
        vi: "từ 9 giờ đến 5 giờ",
        ipa: "/frɒm naɪn tə faɪv/",
        example: "I work from nine to five.",
      },
      {
        en: "It costs about …",
        vi: "Cái này khoảng …",
        ipa: "/ɪt kɒsts əˈbaʊt/",
        example: "It costs about fifty thousand dong.",
      },
    ],
  },
  food: {
    slug: "food",
    title: "Đồ ăn & sở thích",
    cefr: "A1",
    intro: "Gọi món, nói về món ăn yêu thích và sở thích cá nhân.",
    tip: "Trước mỗi bữa ăn, thử mô tả món của bạn bằng 2 câu tiếng Anh.",
    phrases: [
      {
        en: "I'd like…",
        vi: "Tôi muốn… (lịch sự)",
        ipa: "/aɪd laɪk/",
        example: "I'd like a coffee, please.",
      },
      {
        en: "I'm really into…",
        vi: "Tôi rất mê…",
        ipa: "/aɪm ˈrɪəli ˈɪntə/",
        example: "I'm really into spicy food.",
      },
      {
        en: "I'm not a big fan of…",
        vi: "Tôi không thích lắm…",
        ipa: "/aɪm nɒt ə bɪɡ fæn əv/",
        example: "I'm not a big fan of seafood.",
      },
      {
        en: "Could I have the bill, please?",
        vi: "Cho tôi xin hoá đơn nhé?",
        ipa: "/kʊd aɪ hæv ðə bɪl/",
        example: "That was delicious. Could I have the bill, please?",
      },
      {
        en: "It tastes great.",
        vi: "Món này ngon thật.",
        ipa: "/ɪt ˈteɪsts ɡreɪt/",
        example: "Try this — it tastes great!",
      },
      {
        en: "Are you ready to order?",
        vi: "Bạn gọi món chưa?",
        ipa: "/ɑːr juː ˈrɛdi tu ˈɔːdər/",
        example: "Good evening. Are you ready to order?",
      },
      {
        en: "I'm starving.",
        vi: "Tôi đói lả rồi.",
        ipa: "/aɪm ˈstɑːvɪŋ/",
        example: "Let's eat — I'm starving!",
      },
      {
        en: "Could you pass me the …?",
        vi: "Bạn đưa giúp tôi … nhé?",
        ipa: "/kʊd juː pɑːs miː/",
        example: "Could you pass me the salt, please?",
      },
    ],
  },
  "ipa-sounds": {
    slug: "ipa-sounds",
    title: "Âm IPA cơ bản",
    cefr: "A1",
    intro:
      "Làm quen vài âm tiếng Anh hay sai với người Việt. Tập nói chậm, rõ từng âm.",
    tip: "Phóng đại khẩu hình lúc tập — chuẩn trước, nhanh sau.",
    phrases: [
      {
        en: "think / thing (âm /θ/)",
        vi: "đặt lưỡi giữa hai răng, thổi hơi ra",
        ipa: "/θɪŋk/ /θɪŋ/",
        example: "I think this is a good thing.",
      },
      {
        en: "ship / sheep (âm /ɪ/ vs /iː/)",
        vi: "ngắn vs dài — đừng đọc giống nhau",
        ipa: "/ʃɪp/ /ʃiːp/",
        example: "The sheep is on the ship.",
      },
      {
        en: "rice / lice (âm /r/ vs /l/)",
        vi: "cong lưỡi cho /r/, chạm lợi cho /l/",
        ipa: "/raɪs/ /laɪs/",
        example: "I eat rice every day.",
      },
      {
        en: "wanted (âm cuối -ed = /ɪd/)",
        vi: "thêm âm /ɪd/ sau t/d",
        ipa: "/ˈwɒntɪd/",
        example: "I wanted to call you.",
      },
      {
        en: "very / berry (âm /v/ vs /b/)",
        vi: "răng trên chạm môi dưới cho /v/",
        ipa: "/ˈvɛri/ /ˈbɛri/",
        example: "This berry is very sweet.",
      },
      {
        en: "cat / cut (âm /æ/ vs /ʌ/)",
        vi: "miệng rộng cho /æ/, thả lỏng cho /ʌ/",
        ipa: "/kæt/ /kʌt/",
        example: "The cat made a small cut.",
      },
      {
        en: "books / dogs (âm cuối -s)",
        vi: "/s/ sau âm vô thanh, /z/ sau âm hữu thanh",
        ipa: "/bʊks/ /dɒɡz/",
        example: "I have two books and three dogs.",
      },
    ],
  },
  "describe-compare": {
    slug: "describe-compare",
    title: "Miêu tả & so sánh",
    cefr: "A1 Movers",
    intro:
      "So sánh người, vật, con vật bằng so sánh hơn và so sánh nhất — kỹ năng cốt lõi của A1 Movers.",
    tip: "Tính từ ngắn thêm -er/-est; tính từ dài dùng more/the most. Tập so sánh 2 đồ vật quanh bạn.",
    phrases: [
      {
        en: "… is bigger than …",
        vi: "… to hơn …",
        ipa: "/ˈbɪɡər ðæn/",
        example: "An elephant is bigger than a horse.",
      },
      {
        en: "the tallest in …",
        vi: "cao nhất trong …",
        ipa: "/ðə ˈtɔːlɪst/",
        example: "He is the tallest boy in my class.",
      },
      {
        en: "more beautiful than …",
        vi: "đẹp hơn …",
        ipa: "/mɔːr ˈbjuːtɪfəl/",
        example: "This flower is more beautiful than that one.",
      },
      {
        en: "It looks like …",
        vi: "Trông giống như …",
        ipa: "/ɪt lʊks laɪk/",
        example: "That cloud looks like a rabbit.",
      },
      {
        en: "as … as …",
        vi: "… bằng/ngang …",
        ipa: "/æz … æz/",
        example: "My bag is as heavy as yours.",
      },
      {
        en: "better than …",
        vi: "tốt hơn … (so sánh bất quy tắc)",
        ipa: "/ˈbɛtər ðæn/",
        example: "This phone is better than my old one.",
      },
      {
        en: "the most … in the world",
        vi: "… nhất thế giới",
        ipa: "/ðə məʊst/",
        example: "It is the most expensive car in the world.",
      },
      {
        en: "the same as …",
        vi: "giống hệt như …",
        ipa: "/ðə seɪm æz/",
        example: "My shoes are the same as yours.",
      },
    ],
  },
  "daily-routine": {
    slug: "daily-routine",
    title: "Thói quen (hiện tại đơn)",
    cefr: "A1 Movers",
    intro:
      "Kể về một ngày của bạn bằng thì hiện tại đơn và trạng từ chỉ tần suất.",
    tip: "Ngôi he/she/it nhớ thêm -s. Tập kể lịch trình hằng ngày của bạn thành tiếng.",
    phrases: [
      {
        en: "I usually get up at …",
        vi: "Tôi thường thức dậy lúc …",
        ipa: "/ˈjuːʒuəli ɡɛt ʌp/",
        example: "I usually get up at six o'clock.",
      },
      {
        en: "She goes to work by …",
        vi: "Cô ấy đi làm bằng …",
        ipa: "/ɡəʊz tə wɜːk baɪ/",
        example: "She goes to work by bus.",
      },
      {
        en: "He never eats …",
        vi: "Anh ấy không bao giờ ăn …",
        ipa: "/ˈnɛvər iːts/",
        example: "He never eats breakfast in the morning.",
      },
      {
        en: "What time do you …?",
        vi: "Bạn … lúc mấy giờ?",
        ipa: "/wɒt taɪm də juː/",
        example: "What time do you go to bed?",
      },
      {
        en: "every day / on Sundays",
        vi: "mỗi ngày / vào Chủ nhật",
        ipa: "/ˈɛvri deɪ/",
        example: "We play football on Sundays.",
      },
      {
        en: "After that, I …",
        vi: "Sau đó, tôi …",
        ipa: "/ˈɑːftər ðæt/",
        example: "I have breakfast. After that, I go to school.",
      },
      {
        en: "He doesn't … on weekdays",
        vi: "Anh ấy không … vào ngày thường",
        ipa: "/hiː ˈdʌznt/",
        example: "He doesn't work on weekdays.",
      },
      {
        en: "How often do you …?",
        vi: "Bạn … bao lâu một lần?",
        ipa: "/haʊ ˈɒfən də juː/",
        example: "How often do you go to the gym?",
      },
    ],
  },
  "past-simple": {
    slug: "past-simple",
    title: "Kể chuyện quá khứ",
    cefr: "A1 Movers",
    intro:
      "Kể lại việc đã xảy ra bằng quá khứ đơn — cả động từ có quy tắc và bất quy tắc.",
    tip: "Học cặp present→past của động từ bất quy tắc (go→went, eat→ate). Kể lại hôm qua của bạn.",
    phrases: [
      {
        en: "Yesterday I went to …",
        vi: "Hôm qua tôi đã đi …",
        ipa: "/ˈjɛstədeɪ aɪ wɛnt/",
        example: "Yesterday I went to the park with my friends.",
      },
      {
        en: "We watched … last night",
        vi: "Tối qua chúng tôi đã xem …",
        ipa: "/wɒtʃt/",
        example: "We watched a film last night.",
      },
      {
        en: "Did you … ?",
        vi: "Bạn đã … chưa?",
        ipa: "/dɪd juː/",
        example: "Did you finish your homework?",
      },
      {
        en: "I didn't …",
        vi: "Tôi đã không …",
        ipa: "/aɪ ˈdɪdnt/",
        example: "I didn't see her at the party.",
      },
      {
        en: "It was … / They were …",
        vi: "Nó đã … / Chúng đã …",
        ipa: "/ɪt wɒz/",
        example: "The food was delicious and the people were kind.",
      },
      {
        en: "Then we decided to …",
        vi: "Rồi chúng tôi quyết định …",
        ipa: "/ðɛn wiː dɪˈsaɪdɪd tə/",
        example: "It started to rain, then we decided to go home.",
      },
      {
        en: "When I was young, I …",
        vi: "Hồi nhỏ, tôi …",
        ipa: "/wɛn aɪ wɒz jʌŋ/",
        example: "When I was young, I lived by the sea.",
      },
      {
        en: "How was your …?",
        vi: "… của bạn thế nào?",
        ipa: "/haʊ wɒz jɔː/",
        example: "Hi! How was your weekend?",
      },
    ],
  },
  "places-directions": {
    slug: "places-directions",
    title: "Nơi chốn & chỉ đường",
    cefr: "A1 Movers",
    intro:
      "Hỏi và chỉ đường, nói về địa điểm và phương tiện đi lại bằng giới từ chỉ nơi chốn.",
    tip: "Tập mô tả đường từ nhà bạn tới một nơi quen thuộc bằng tiếng Anh.",
    phrases: [
      {
        en: "How do I get to …?",
        vi: "Làm sao để tới …?",
        ipa: "/haʊ də aɪ ɡɛt tə/",
        example: "Excuse me, how do I get to the station?",
      },
      {
        en: "Go straight on / Turn left",
        vi: "Đi thẳng / Rẽ trái",
        ipa: "/ɡəʊ streɪt ɒn/",
        example: "Go straight on and then turn left.",
      },
      {
        en: "It's next to / opposite …",
        vi: "Nó ở cạnh / đối diện …",
        ipa: "/nɛkst tə/",
        example: "The bank is next to the supermarket.",
      },
      {
        en: "between … and …",
        vi: "giữa … và …",
        ipa: "/bɪˈtwiːn/",
        example: "The school is between the park and the library.",
      },
      {
        en: "I'm going there by …",
        vi: "Tôi tới đó bằng …",
        ipa: "/baɪ/",
        example: "I'm going there by train.",
      },
      {
        en: "Is there a … near here?",
        vi: "Gần đây có … không?",
        ipa: "/ɪz ðeər ə … nɪə hɪə/",
        example: "Excuse me, is there a pharmacy near here?",
      },
      {
        en: "at the corner of …",
        vi: "ở góc …",
        ipa: "/æt ðə ˈkɔːnər əv/",
        example: "The café is at the corner of the street.",
      },
      {
        en: "It's a five-minute walk.",
        vi: "Đi bộ năm phút là tới.",
        ipa: "/ɪts ə faɪv ˈmɪnɪt wɔːk/",
        example: "Don't worry, it's a five-minute walk.",
      },
    ],
  },
  "health-body": {
    slug: "health-body",
    title: "Sức khoẻ & cơ thể",
    cefr: "A1 Movers",
    intro:
      "Nói về cơ thể, cảm giác không khoẻ và lời khuyên cơ bản (must / have to).",
    tip: "Khi thấy mệt, thử nói cảm giác của bạn bằng tiếng Anh trước.",
    phrases: [
      {
        en: "I've got a …ache",
        vi: "Tôi bị đau … (đầu/răng/bụng)",
        ipa: "/aɪv ɡɒt ə/",
        example: "I've got a headache today.",
      },
      {
        en: "I don't feel well.",
        vi: "Tôi thấy không khoẻ.",
        ipa: "/aɪ dəʊnt fiːl wɛl/",
        example: "I can't go to school — I don't feel well.",
      },
      {
        en: "You must see a doctor.",
        vi: "Bạn phải đi khám bác sĩ.",
        ipa: "/juː mʌst siː ə ˈdɒktər/",
        example: "If it hurts, you must see a doctor.",
      },
      {
        en: "You have to rest.",
        vi: "Bạn cần phải nghỉ ngơi.",
        ipa: "/juː hæv tə rɛst/",
        example: "You have to rest and drink water.",
      },
      {
        en: "Take care of yourself.",
        vi: "Giữ gìn sức khoẻ nhé.",
        ipa: "/teɪk keər əv jɔːˈsɛlf/",
        example: "Get well soon and take care of yourself.",
      },
      {
        en: "My … hurts.",
        vi: "… của tôi bị đau.",
        ipa: "/hɜːts/",
        example: "I can't run because my leg hurts.",
      },
      {
        en: "You should drink more water.",
        vi: "Bạn nên uống nhiều nước hơn.",
        ipa: "/juː ʃʊd drɪŋk/",
        example: "You look tired. You should drink more water.",
      },
      {
        en: "I feel much better now.",
        vi: "Tôi thấy đỡ hơn nhiều rồi.",
        ipa: "/aɪ fiːl mʌtʃ ˈbɛtər/",
        example: "Thanks for asking — I feel much better now.",
      },
    ],
  },
  "free-time": {
    slug: "free-time",
    title: "Sở thích & thể thao",
    cefr: "A1 Movers",
    intro:
      "Nói về sở thích, rủ rê và đề nghị (want to / shall / could) — chủ đề Sports & leisure của Movers.",
    tip: "Dùng verb+ing để nói sở thích: I like swimming. Rủ bạn bằng 'Shall we…?'.",
    phrases: [
      {
        en: "I'm good at …ing",
        vi: "Tôi giỏi (làm) …",
        ipa: "/aɪm ɡʊd æt/",
        example: "I'm good at swimming.",
      },
      {
        en: "I want to learn …",
        vi: "Tôi muốn học …",
        ipa: "/aɪ wɒnt tə lɜːn/",
        example: "I want to learn how to skate.",
      },
      {
        en: "Shall we …?",
        vi: "Chúng ta … nhé?",
        ipa: "/ʃæl wiː/",
        example: "Shall we play badminton this afternoon?",
      },
      {
        en: "Would you like to …?",
        vi: "Bạn có muốn … không?",
        ipa: "/wʊd juː laɪk tə/",
        example: "Would you like to come to my house?",
      },
      {
        en: "I could … when I was …",
        vi: "Tôi đã có thể … khi tôi …",
        ipa: "/aɪ kʊd/",
        example: "I could ride a bike when I was six.",
      },
      {
        en: "In my free time, I …",
        vi: "Lúc rảnh, tôi …",
        ipa: "/ɪn maɪ friː taɪm/",
        example: "In my free time, I read comics.",
      },
      {
        en: "Why don't we …?",
        vi: "Sao chúng ta không …?",
        ipa: "/waɪ dəʊnt wiː/",
        example: "Why don't we go to the cinema tonight?",
      },
      {
        en: "I'm not very keen on …",
        vi: "Tôi không thích … lắm.",
        ipa: "/aɪm nɒt ˈvɛri kiːn ɒn/",
        example: "I'm not very keen on running.",
      },
    ],
  },
  "present-continuous": {
    slug: "present-continuous",
    title: "Đang xảy ra (tiếp diễn)",
    cefr: "A2 Flyers",
    intro:
      "Mô tả việc đang diễn ra ngay lúc nói bằng thì hiện tại tiếp diễn — kỹ năng tả tranh cốt lõi của Flyers.",
    tip: "Công thức am/is/are + V-ing. Nhìn quanh phòng và tả 3 việc người ta đang làm.",
    phrases: [
      {
        en: "I'm …ing right now.",
        vi: "Tôi đang … ngay bây giờ.",
        ipa: "/aɪm … ɪŋ/",
        example: "I'm cooking dinner right now.",
      },
      {
        en: "She is wearing …",
        vi: "Cô ấy đang mặc …",
        ipa: "/ʃiː ɪz ˈweərɪŋ/",
        example: "She is wearing a red dress today.",
      },
      {
        en: "They are playing …",
        vi: "Họ đang chơi …",
        ipa: "/ðeɪ ɑːr ˈpleɪɪŋ/",
        example: "Look! They are playing in the garden.",
      },
      {
        en: "What are you doing?",
        vi: "Bạn đang làm gì vậy?",
        ipa: "/wɒt ɑːr juː ˈduːɪŋ/",
        example: "Hi! What are you doing at the moment?",
      },
      {
        en: "It isn't raining now.",
        vi: "Bây giờ trời không mưa.",
        ipa: "/ɪt ˈɪznt ˈreɪnɪŋ/",
        example: "We can go out — it isn't raining now.",
      },
      {
        en: "We are having dinner.",
        vi: "Chúng tôi đang ăn tối.",
        ipa: "/wiː ɑːr ˈhævɪŋ ˈdɪnər/",
        example: "We are having dinner — can I call you back?",
      },
      {
        en: "Why is he crying?",
        vi: "Sao anh ấy đang khóc vậy?",
        ipa: "/waɪ ɪz hiː ˈkraɪɪŋ/",
        example: "Why is he crying? Is he okay?",
      },
      {
        en: "I'm not feeling well today.",
        vi: "Hôm nay tôi thấy không khoẻ.",
        ipa: "/aɪm nɒt ˈfiːlɪŋ wɛl/",
        example: "I'm staying home — I'm not feeling well today.",
      },
    ],
  },
  "future-plans": {
    slug: "future-plans",
    title: "Kế hoạch & dự định",
    cefr: "A2 Flyers",
    intro:
      "Nói về dự định và dự đoán tương lai bằng 'going to' và 'will'.",
    tip: "'going to' cho kế hoạch đã định; 'will' cho quyết định tức thì và dự đoán. Tập kể kế hoạch cuối tuần.",
    phrases: [
      {
        en: "I'm going to …",
        vi: "Tôi định sẽ …",
        ipa: "/aɪm ˈɡəʊɪŋ tə/",
        example: "I'm going to visit my grandma this weekend.",
      },
      {
        en: "We're going to …",
        vi: "Chúng tôi sẽ … (kế hoạch)",
        ipa: "/wɪər ˈɡəʊɪŋ tə/",
        example: "We're going to have a party on Saturday.",
      },
      {
        en: "I think it will …",
        vi: "Tôi nghĩ trời/nó sẽ …",
        ipa: "/aɪ θɪŋk ɪt wɪl/",
        example: "I think it will rain later.",
      },
      {
        en: "I'll help you.",
        vi: "Tôi sẽ giúp bạn. (quyết định ngay)",
        ipa: "/aɪl hɛlp juː/",
        example: "Don't worry, I'll help you with that.",
      },
      {
        en: "What are you going to do …?",
        vi: "Bạn định làm gì …?",
        ipa: "/wɒt ɑːr juː ˈɡəʊɪŋ tə duː/",
        example: "What are you going to do after school?",
      },
      {
        en: "She's going to study abroad.",
        vi: "Cô ấy sẽ đi du học.",
        ipa: "/ʃiːz ˈɡəʊɪŋ tə ˈstʌdi əˈbrɔːd/",
        example: "Next year she's going to study abroad.",
      },
      {
        en: "It won't be easy.",
        vi: "Việc đó sẽ không dễ đâu.",
        ipa: "/ɪt wəʊnt biː ˈiːzi/",
        example: "It won't be easy, but I'll try my best.",
      },
      {
        en: "Maybe I'll …",
        vi: "Có lẽ tôi sẽ …",
        ipa: "/ˈmeɪbiː aɪl/",
        example: "Maybe I'll travel somewhere this summer.",
      },
    ],
  },
  "present-perfect": {
    slug: "present-perfect",
    title: "Đã từng làm",
    cefr: "A2 Flyers",
    intro:
      "Nói về trải nghiệm và việc vừa hoàn thành bằng hiện tại hoàn thành (have/has + V3).",
    tip: "Dùng ever/never cho trải nghiệm, just/already/yet cho việc gần đây. Hỏi bạn 'Have you ever…?'.",
    phrases: [
      {
        en: "Have you ever …?",
        vi: "Bạn đã bao giờ … chưa?",
        ipa: "/hæv juː ˈɛvər/",
        example: "Have you ever been to Da Nang?",
      },
      {
        en: "I've never …",
        vi: "Tôi chưa bao giờ …",
        ipa: "/aɪv ˈnɛvər/",
        example: "I've never tried surfing before.",
      },
      {
        en: "I've just …",
        vi: "Tôi vừa mới …",
        ipa: "/aɪv dʒʌst/",
        example: "I've just finished my homework.",
      },
      {
        en: "She has already …",
        vi: "Cô ấy đã … rồi.",
        ipa: "/ʃiː həz ɔːlˈrɛdi/",
        example: "She has already eaten lunch.",
      },
      {
        en: "I haven't … yet.",
        vi: "Tôi vẫn chưa …",
        ipa: "/aɪ ˈhævnt … jɛt/",
        example: "I haven't seen that film yet.",
      },
      {
        en: "I've been to … twice.",
        vi: "Tôi đã đến … hai lần.",
        ipa: "/aɪv biːn tə … twaɪs/",
        example: "I've been to Hue twice.",
      },
      {
        en: "Have you finished … yet?",
        vi: "Bạn làm xong … chưa?",
        ipa: "/hæv juː ˈfɪnɪʃt … jɛt/",
        example: "Have you finished your report yet?",
      },
      {
        en: "He's lost his …",
        vi: "Anh ấy làm mất … rồi.",
        ipa: "/hiːz lɒst/",
        example: "He's lost his keys, so he can't get in.",
      },
    ],
  },
  "weather-seasons": {
    slug: "weather-seasons",
    title: "Thời tiết & mùa",
    cefr: "A2 Flyers",
    intro:
      "Nói về thời tiết, mùa và dự báo — chủ đề 'The weather' của Flyers.",
    tip: "Thời tiết thường dùng 'It's …'. Mỗi sáng tả thời tiết hôm đó bằng 2 câu.",
    phrases: [
      {
        en: "What's the weather like?",
        vi: "Thời tiết thế nào?",
        ipa: "/wɒts ðə ˈwɛðər laɪk/",
        example: "What's the weather like today?",
      },
      {
        en: "It's sunny and warm.",
        vi: "Trời nắng và ấm.",
        ipa: "/ɪts ˈsʌni ænd wɔːm/",
        example: "It's sunny and warm, let's go to the beach.",
      },
      {
        en: "It's getting colder.",
        vi: "Trời đang lạnh dần.",
        ipa: "/ɪts ˈɡɛtɪŋ ˈkəʊldər/",
        example: "Take a coat — it's getting colder.",
      },
      {
        en: "In winter it often …",
        vi: "Vào mùa đông trời thường …",
        ipa: "/ɪn ˈwɪntər/",
        example: "In winter it often rains in the north.",
      },
      {
        en: "I prefer … weather.",
        vi: "Tôi thích thời tiết … hơn.",
        ipa: "/aɪ prɪˈfɜːr/",
        example: "I prefer cool weather to hot weather.",
      },
      {
        en: "It looks like rain.",
        vi: "Trông như sắp mưa.",
        ipa: "/ɪt lʊks laɪk reɪn/",
        example: "Take an umbrella — it looks like rain.",
      },
      {
        en: "The forecast says …",
        vi: "Dự báo nói rằng …",
        ipa: "/ðə ˈfɔːkɑːst sɛz/",
        example: "The forecast says it'll be windy tomorrow.",
      },
      {
        en: "It's freezing today.",
        vi: "Hôm nay lạnh cóng.",
        ipa: "/ɪts ˈfriːzɪŋ/",
        example: "Wear a jacket — it's freezing today.",
      },
    ],
  },
  "jobs-ambitions": {
    slug: "jobs-ambitions",
    title: "Nghề nghiệp & ước mơ",
    cefr: "A2 Flyers",
    intro:
      "Nói về công việc và ước mơ tương lai bằng 'want to be' / 'would like to be'.",
    tip: "Tập trả lời 'What do you want to be?' và giải thích lý do bằng 'because'.",
    phrases: [
      {
        en: "I want to be a …",
        vi: "Tôi muốn trở thành …",
        ipa: "/aɪ wɒnt tə biː ə/",
        example: "I want to be a doctor in the future.",
      },
      {
        en: "I'd like to work as …",
        vi: "Tôi muốn làm nghề …",
        ipa: "/aɪd laɪk tə wɜːk æz/",
        example: "I'd like to work as a teacher.",
      },
      {
        en: "A … helps people by …ing",
        vi: "Một … giúp mọi người bằng cách …",
        ipa: "/hɛlps ˈpiːpl baɪ/",
        example: "A nurse helps people by taking care of them.",
      },
      {
        en: "because I'm good at …",
        vi: "vì tôi giỏi …",
        ipa: "/bɪˈkɒz aɪm ɡʊd æt/",
        example: "I want to be an engineer because I'm good at maths.",
      },
      {
        en: "My dream job is …",
        vi: "Công việc mơ ước của tôi là …",
        ipa: "/maɪ driːm dʒɒb ɪz/",
        example: "My dream job is being a pilot.",
      },
      {
        en: "I'm interested in …",
        vi: "Tôi quan tâm đến …",
        ipa: "/aɪm ˈɪntrəstɪd ɪn/",
        example: "I'm interested in working with computers.",
      },
      {
        en: "It's a hard but rewarding job.",
        vi: "Đó là công việc vất vả nhưng xứng đáng.",
        ipa: "/hɑːd bʌt rɪˈwɔːdɪŋ/",
        example: "Teaching is a hard but rewarding job.",
      },
      {
        en: "When I grow up, I want to …",
        vi: "Khi lớn lên, tôi muốn …",
        ipa: "/wɛn aɪ ɡrəʊ ʌp/",
        example: "When I grow up, I want to help other people.",
      },
    ],
  },
  "adverbs-manner": {
    slug: "adverbs-manner",
    title: "Trạng từ chỉ cách thức",
    cefr: "A2 Flyers",
    intro:
      "Mô tả cách làm một việc bằng trạng từ (thường thêm -ly) và so sánh cách làm.",
    tip: "Tính từ → trạng từ: quick → quickly, careful → carefully. Lưu ý bất quy tắc: good → well, fast → fast.",
    phrases: [
      {
        en: "He runs quickly.",
        vi: "Anh ấy chạy nhanh.",
        ipa: "/hiː rʌnz ˈkwɪkli/",
        example: "He runs quickly and never gets tired.",
      },
      {
        en: "Please speak slowly.",
        vi: "Làm ơn nói chậm thôi.",
        ipa: "/pliːz spiːk ˈsləʊli/",
        example: "Can you please speak slowly? I'm learning.",
      },
      {
        en: "She sings beautifully.",
        vi: "Cô ấy hát rất hay.",
        ipa: "/ʃiː sɪŋz ˈbjuːtɪfli/",
        example: "She sings beautifully on the stage.",
      },
      {
        en: "I can do it well.",
        vi: "Tôi làm việc đó tốt.",
        ipa: "/aɪ kæn duː ɪt wɛl/",
        example: "I practised a lot, so now I can do it well.",
      },
      {
        en: "more carefully than …",
        vi: "cẩn thận hơn …",
        ipa: "/mɔːr ˈkeəfli ðæn/",
        example: "She works more carefully than her brother.",
      },
      {
        en: "Drive carefully!",
        vi: "Lái xe cẩn thận nhé!",
        ipa: "/draɪv ˈkeəfli/",
        example: "It's raining hard — drive carefully!",
      },
      {
        en: "She speaks English fluently.",
        vi: "Cô ấy nói tiếng Anh trôi chảy.",
        ipa: "/spiːks ˈɪŋɡlɪʃ ˈfluːəntli/",
        example: "After years of practice, she speaks English fluently.",
      },
      {
        en: "Could you say it more clearly?",
        vi: "Bạn nói rõ hơn được không?",
        ipa: "/kʊd juː seɪ ɪt mɔː ˈklɪəli/",
        example: "Sorry, could you say it more clearly?",
      },
    ],
  },
  "first-conditional": {
    slug: "first-conditional",
    title: "Câu điều kiện loại 1",
    cefr: "A2 Flyers",
    intro:
      "Nói về điều có thể xảy ra với điều kiện thật: If + hiện tại đơn, … will …",
    tip: "Mệnh đề If dùng hiện tại đơn, mệnh đề chính dùng will. Tập nói 3 câu 'If …, I will …'.",
    phrases: [
      {
        en: "If it rains, I'll …",
        vi: "Nếu trời mưa, tôi sẽ …",
        ipa: "/ɪf ɪt reɪnz/",
        example: "If it rains, I'll stay at home.",
      },
      {
        en: "If you study, you'll …",
        vi: "Nếu bạn học, bạn sẽ …",
        ipa: "/ɪf juː ˈstʌdi/",
        example: "If you study hard, you'll pass the test.",
      },
      {
        en: "I'll call you if …",
        vi: "Tôi sẽ gọi bạn nếu …",
        ipa: "/aɪl kɔːl juː ɪf/",
        example: "I'll call you if I have time.",
      },
      {
        en: "What will you do if …?",
        vi: "Bạn sẽ làm gì nếu …?",
        ipa: "/wɒt wɪl juː duː ɪf/",
        example: "What will you do if it's sunny tomorrow?",
      },
      {
        en: "Unless you hurry, …",
        vi: "Trừ khi bạn nhanh lên, …",
        ipa: "/ənˈlɛs juː ˈhʌri/",
        example: "Unless you hurry, you'll miss the bus.",
      },
      {
        en: "If I have time, I'll …",
        vi: "Nếu có thời gian, tôi sẽ …",
        ipa: "/ɪf aɪ hæv taɪm/",
        example: "If I have time, I'll help you tonight.",
      },
      {
        en: "We won't go if it rains.",
        vi: "Chúng tôi sẽ không đi nếu trời mưa.",
        ipa: "/wiː wəʊnt ɡəʊ ɪf ɪt reɪnz/",
        example: "We won't go to the park if it rains.",
      },
      {
        en: "As soon as I arrive, I'll …",
        vi: "Ngay khi tới nơi, tôi sẽ …",
        ipa: "/æz suːn æz aɪ əˈraɪv/",
        example: "As soon as I arrive, I'll text you.",
      },
    ],
  },
  restaurant: {
    slug: "restaurant",
    title: "Ở nhà hàng",
    cefr: "B1",
    intro:
      "Đặt bàn, gọi món, hỏi gợi ý và xử lý tình huống ở nhà hàng một cách lịch sự, tự nhiên.",
    tip: "Dùng câu lịch sự (Could I…? / Would you…?). Tự đóng vai bồi bàn và khách để luyện cả hai phía.",
    phrases: [
      {
        en: "I'd like to book a table for …",
        vi: "Tôi muốn đặt bàn cho … người.",
        ipa: "/aɪd laɪk tə bʊk ə ˈteɪbl/",
        example: "Hi, I'd like to book a table for two at eight.",
      },
      {
        en: "What would you recommend?",
        vi: "Bạn gợi ý món nào?",
        ipa: "/wɒt wʊd juː ˌrɛkəˈmɛnd/",
        example: "It's my first time here. What would you recommend?",
      },
      {
        en: "I'll have the …, please.",
        vi: "Cho tôi món …, làm ơn.",
        ipa: "/aɪl hæv ðə/",
        example: "I'll have the grilled chicken, please.",
      },
      {
        en: "Does this contain …?",
        vi: "Món này có … không?",
        ipa: "/dʌz ðɪs kənˈteɪn/",
        example: "Does this contain peanuts? I'm allergic.",
      },
      {
        en: "Could we get the bill, please?",
        vi: "Cho chúng tôi xin hoá đơn nhé?",
        ipa: "/kʊd wiː ɡɛt ðə bɪl/",
        example: "Everything was lovely. Could we get the bill, please?",
      },
      {
        en: "Is service included?",
        vi: "Đã bao gồm phí phục vụ chưa?",
        ipa: "/ɪz ˈsɜːvɪs ɪnˈkluːdɪd/",
        example: "Excuse me, is service included in the bill?",
      },
      {
        en: "Could we sit by the window?",
        vi: "Cho chúng tôi ngồi cạnh cửa sổ được không?",
        ipa: "/kʊd wiː sɪt baɪ ðə ˈwɪndəʊ/",
        example: "Could we sit by the window, please?",
      },
      {
        en: "I'm afraid this isn't what I ordered.",
        vi: "E là món này không phải món tôi gọi.",
        ipa: "/aɪm əˈfreɪd ðɪs ˈɪznt/",
        example: "Sorry, I'm afraid this isn't what I ordered.",
      },
      {
        en: "Can I get this to go?",
        vi: "Cho tôi gói mang về được không?",
        ipa: "/kæn aɪ ɡɛt ðɪs tə ɡəʊ/",
        example: "I'm quite full — can I get this to go?",
      },
    ],
  },
  travel: {
    slug: "travel",
    title: "Du lịch & sân bay",
    cefr: "B1",
    intro:
      "Xử lý các tình huống ở sân bay, khách sạn và khi di chuyển — hỏi đường, làm thủ tục, gặp sự cố.",
    tip: "Học theo tình huống: check-in, an ninh, nhận phòng. Tưởng tượng một chuyến đi và nói qua từng bước.",
    phrases: [
      {
        en: "I'd like to check in for my flight.",
        vi: "Tôi muốn làm thủ tục cho chuyến bay.",
        ipa: "/aɪd laɪk tə tʃɛk ɪn/",
        example: "Good morning, I'd like to check in for my flight to Tokyo.",
      },
      {
        en: "Where is the boarding gate?",
        vi: "Cửa lên máy bay ở đâu?",
        ipa: "/weər ɪz ðə ˈbɔːdɪŋ ɡeɪt/",
        example: "Excuse me, where is the boarding gate for flight VN123?",
      },
      {
        en: "I have a reservation under …",
        vi: "Tôi có đặt phòng dưới tên …",
        ipa: "/aɪ hæv ə ˌrɛzəˈveɪʃn ˈʌndər/",
        example: "Hi, I have a reservation under the name Minh.",
      },
      {
        en: "What time is check-out?",
        vi: "Mấy giờ phải trả phòng?",
        ipa: "/wɒt taɪm ɪz ˈtʃɛkaʊt/",
        example: "What time is check-out tomorrow?",
      },
      {
        en: "My luggage hasn't arrived.",
        vi: "Hành lý của tôi chưa tới.",
        ipa: "/maɪ ˈlʌɡɪdʒ ˈhæznt əˈraɪvd/",
        example: "Excuse me, my luggage hasn't arrived. What should I do?",
      },
      {
        en: "Could you tell me the way to …?",
        vi: "Bạn chỉ giúp đường tới … được không?",
        ipa: "/kʊd juː tɛl miː ðə weɪ tə/",
        example: "Could you tell me the way to the city centre?",
      },
      {
        en: "Is this seat taken?",
        vi: "Chỗ này có ai ngồi chưa?",
        ipa: "/ɪz ðɪs siːt ˈteɪkən/",
        example: "Excuse me, is this seat taken?",
      },
      {
        en: "How long does the journey take?",
        vi: "Hành trình mất bao lâu?",
        ipa: "/haʊ lɒŋ dʌz ðə ˈdʒɜːni teɪk/",
        example: "How long does the journey take by train?",
      },
      {
        en: "I'd like to extend my stay.",
        vi: "Tôi muốn ở thêm.",
        ipa: "/aɪd laɪk tə ɪkˈstɛnd maɪ steɪ/",
        example: "I'd like to extend my stay by one night.",
      },
    ],
  },
  opinions: {
    slug: "opinions",
    title: "Nêu ý kiến",
    cefr: "B1",
    intro:
      "Bày tỏ quan điểm, đồng tình hoặc phản đối lịch sự và đưa ra lý do — nền tảng cho hội thoại sâu hơn.",
    tip: "Cấu trúc: nêu ý kiến → lý do → ví dụ. Mỗi ngày chọn 1 chủ đề và nói ý kiến của bạn 30 giây.",
    phrases: [
      {
        en: "In my opinion, …",
        vi: "Theo tôi thì …",
        ipa: "/ɪn maɪ əˈpɪnjən/",
        example: "In my opinion, learning by speaking is the fastest way.",
      },
      {
        en: "I see your point, but …",
        vi: "Tôi hiểu ý bạn, nhưng …",
        ipa: "/aɪ siː jɔː pɔɪnt bʌt/",
        example: "I see your point, but I think it depends on the person.",
      },
      {
        en: "I totally agree with …",
        vi: "Tôi hoàn toàn đồng ý với …",
        ipa: "/aɪ ˈtəʊtəli əˈɡriː wɪð/",
        example: "I totally agree with what you just said.",
      },
      {
        en: "I'm not so sure about that.",
        vi: "Tôi không chắc về điều đó lắm.",
        ipa: "/aɪm nɒt səʊ ʃʊər/",
        example: "I'm not so sure about that — can you explain more?",
      },
      {
        en: "The main reason is …",
        vi: "Lý do chính là …",
        ipa: "/ðə meɪn ˈriːzn ɪz/",
        example: "I prefer trains. The main reason is they're more comfortable.",
      },
      {
        en: "For example, …",
        vi: "Ví dụ như …",
        ipa: "/fər ɪɡˈzɑːmpl/",
        example: "Exercise helps a lot. For example, I sleep better now.",
      },
      {
        en: "It depends on …",
        vi: "Còn tùy vào …",
        ipa: "/ɪt dɪˈpɛndz ɒn/",
        example: "It depends on how you look at it.",
      },
      {
        en: "On the other hand, …",
        vi: "Mặt khác, …",
        ipa: "/ɒn ðə ˈʌðər hænd/",
        example: "It's cheap, but on the other hand, the quality is poor.",
      },
      {
        en: "I'd say that …",
        vi: "Tôi cho rằng …",
        ipa: "/aɪd seɪ ðæt/",
        example: "I'd say that practice matters more than talent.",
      },
    ],
  },
  "think-in-english": {
    slug: "think-in-english",
    title: "Suy nghĩ bằng tiếng Anh",
    cefr: "B1+",
    intro:
      "Giảm 'dịch trong đầu' bằng cách độc thoại nội tâm tiếng Anh trong sinh hoạt hằng ngày — bước đệm để nói trôi chảy.",
    tip: "Mỗi ngày chọn 5 phút 'chỉ nghĩ bằng tiếng Anh': tả việc đang làm, sắp làm và cảm xúc của bạn — không dịch.",
    phrases: [
      {
        en: "Right now I'm …ing.",
        vi: "Ngay bây giờ tôi đang … (tự tả việc đang làm)",
        ipa: "/raɪt naʊ aɪm/",
        example: "Right now I'm making coffee and thinking about my day.",
      },
      {
        en: "Next, I need to …",
        vi: "Tiếp theo, tôi cần …",
        ipa: "/nɛkst aɪ niːd tə/",
        example: "Next, I need to reply to that email.",
      },
      {
        en: "I wonder if …",
        vi: "Không biết liệu …",
        ipa: "/aɪ ˈwʌndər ɪf/",
        example: "I wonder if it's going to rain this afternoon.",
      },
      {
        en: "How do I say … in English?",
        vi: "… nói tiếng Anh thế nào nhỉ?",
        ipa: "/haʊ də aɪ seɪ/",
        example: "How do I say this feeling in English? Maybe 'overwhelmed'.",
      },
      {
        en: "Let me describe it another way.",
        vi: "Để tôi diễn đạt cách khác.",
        ipa: "/lɛt miː dɪˈskraɪb ɪt əˈnʌðər weɪ/",
        example: "I don't know that word — let me describe it another way.",
      },
      {
        en: "On the whole, I feel …",
        vi: "Nhìn chung, tôi cảm thấy …",
        ipa: "/ɒn ðə həʊl aɪ fiːl/",
        example: "On the whole, I feel happy with my progress today.",
      },
      {
        en: "What's the word for …?",
        vi: "Từ chỉ … là gì nhỉ?",
        ipa: "/wɒts ðə wɜːd fɔː/",
        example: "What's the word for this? It starts with 's'.",
      },
      {
        en: "It reminds me of …",
        vi: "Nó làm tôi nhớ đến …",
        ipa: "/ɪt rɪˈmaɪndz miː ɒv/",
        example: "This song reminds me of my hometown.",
      },
      {
        en: "I'd better … now.",
        vi: "Tôi nên … bây giờ thì hơn.",
        ipa: "/aɪd ˈbɛtər … naʊ/",
        example: "It's late — I'd better go to bed now.",
      },
    ],
  },
};

export function getLesson(slug: string): LessonContent | undefined {
  return lessonContent[slug];
}
