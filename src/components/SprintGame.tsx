"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type WordItem = {
  en: string;
  vi: string;
  correctVi: string;
  level: string;
};

// Kho từ vựng phong phú phân loại theo CEFR chuẩn Figma
const SPRINT_WORDS: Record<string, { en: string; vi: string }[]> = {
  A1: [
    { en: "hello", vi: "xin chào" },
    { en: "family", vi: "gia đình" },
    { en: "numbers", vi: "số đếm" },
    { en: "food", vi: "đồ ăn" },
    { en: "time", vi: "thời gian" },
    { en: "friend", vi: "người bạn" },
    { en: "weather", vi: "thời tiết" },
    { en: "school", vi: "trường học" },
  ],
  A2: [
    { en: "depends on", vi: "phụ thuộc vào" },
    { en: "looking forward to", vi: "mong đợi" },
    { en: "thinking about", vi: "suy nghĩ về" },
    { en: "stay home", vi: "ở nhà" },
    { en: "greetings", vi: "lời chào hỏi" },
    { en: "routine", vi: "thói quen hàng ngày" },
    { en: "restaurant", vi: "nhà hàng" },
    { en: "opinion", vi: "ý kiến" },
  ],
  B1: [
    { en: "I'd rather", vi: "tôi thà... hơn" },
    { en: "conversation", vi: "cuộc hội thoại" },
    { en: "shadowing", vi: "luyện nhại giọng" },
    { en: "structure", vi: "cấu trúc câu" },
    { en: "active recall", vi: "chủ động nhớ lại" },
    { en: "streak", vi: "chuỗi ngày học" },
    { en: "confidence", vi: "sự tự tin" },
    { en: "improve", vi: "cải thiện" },
  ],
  B2: [
    { en: "passive knowledge", vi: "kiến thức thụ động" },
    { en: "fluency", vi: "sự trôi chảy" },
    { en: "pronunciation", vi: "sự phát âm" },
    { en: "spaced repetition", vi: "ôn tập ngắt quãng" },
    { en: "anniversary", vi: "lễ kỷ niệm" },
    { en: "solitaire", vi: "chơi bài lẻ" },
    { en: "multiplier", vi: "hệ số nhân điểm" },
    { en: "assessment", vi: "sự đánh giá" },
  ],
  C1: [
    { en: "comprehension", vi: "sự thấu hiểu sâu" },
    { en: "meticulous", vi: "tỉ mỉ, kỹ càng" },
    { en: "acquisition", vi: "sự tiếp thu ngôn ngữ" },
    { en: "cognitive load", vi: "áp lực nhận thức" },
    { en: "refraction", vi: "khúc xạ ánh sáng" },
    { en: "aesthetic", vi: "tính thẩm mỹ cao" },
    { en: "liquid glass", vi: "kính thủy lỏng" },
    { en: "interactive", vi: "tương tác đa chiều" },
  ],
  C2: [
    { en: "mastery", vi: "sự tinh thông hoàn hảo" },
    { en: "linguistic intuition", vi: "trực giác ngôn ngữ" },
    { en: "spontaneous", vi: "bộc phát tự nhiên" },
    { en: "immersion", vi: "sự đắm chìm hoàn toàn" },
    { en: "indispensable", vi: "không thể thiếu được" },
    { en: "eloquent", vi: "hùng biện trôi chảy" },
    { en: "ubiquitous", vi: "ở khắp mọi nơi" },
    { en: "real-time feedback", vi: "phản hồi thời gian thực" },
  ],
};

const WRONG_DISTRACTORS = [
  "quả táo đỏ", "cửa sổ đóng", "con mèo lười", "chạy trốn", 
  "đọc sách", "màu sắc xanh", "phát điện", "bỏ cuộc sớm"
];

type GamePhase = "welcome" | "playing" | "results";

export default function SprintGame() {
  const [phase, setPhase] = useState<GamePhase>("welcome");
  const [level, setLevel] = useState("A1");
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [streak, setStreak] = useState(0);
  
  // Từ vựng hiện tại đang hiển thị
  const [currentQuestion, setCurrentQuestion] = useState<{
    en: string;
    displayedVi: string;
    isCorrectMatch: boolean;
    correctVi: string;
  } | null>(null);

  // Danh sách từ vựng đã trải qua trong game để hiện kết quả
  const [history, setHistory] = useState<{
    en: string;
    correctVi: string;
    wasCorrectAnswer: boolean;
  }[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Phát âm từ vựng qua SpeechSynthesis
  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  // Khởi tạo câu hỏi tiếp theo
  function generateQuestion(currentLevel: string) {
    const list = SPRINT_WORDS[currentLevel] || SPRINT_WORDS["A1"];
    const randomItem = list[Math.floor(Math.random() * list.length)];
    
    // Ngẫu nhiên nghĩa hiển thị đúng hay sai
    const isCorrectMatch = Math.random() > 0.45;
    let displayedVi = randomItem.vi;
    
    if (!isCorrectMatch) {
      // Lấy ngẫu nhiên nghĩa sai
      const otherWords = list.filter(item => item.en !== randomItem.en);
      if (otherWords.length > 0) {
        displayedVi = otherWords[Math.floor(Math.random() * otherWords.length)].vi;
      } else {
        displayedVi = WRONG_DISTRACTORS[Math.floor(Math.random() * WRONG_DISTRACTORS.length)];
      }
    }

    setCurrentQuestion({
      en: randomItem.en,
      displayedVi,
      isCorrectMatch,
      correctVi: randomItem.vi
    });

    // Phát âm từ ngay lập tức để rèn phản xạ nghe
    speak(randomItem.en);
  }

  // Bắt đầu chơi game
  function startGame(selectedLevel: string) {
    setHistory([]);
    setScore(0);
    setMultiplier(1);
    setStreak(0);
    setTimeLeft(30);
    setPhase("playing");
    generateQuestion(selectedLevel);
  }

  // Xử lý câu trả lời của người dùng (Đúng / Sai)
  function handleAnswer(userSelectedTrue: boolean) {
    if (!currentQuestion) return;

    const isCorrectChoice = userSelectedTrue === currentQuestion.isCorrectMatch;
    
    // Lưu lịch sử
    setHistory(prev => [
      ...prev,
      {
        en: currentQuestion.en,
        correctVi: currentQuestion.correctVi,
        wasCorrectAnswer: isCorrectChoice
      }
    ]);

    if (isCorrectChoice) {
      // Cộng điểm
      const basePoints = 10;
      const pointsEarned = basePoints * multiplier;
      setScore(prev => prev + pointsEarned);

      // Cập nhật chuỗi đúng liên tiếp
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      
      // Đạt 4 câu đúng liên tiếp nâng hệ số nhân
      if (nextStreak >= 4 && multiplier < 4) {
        setMultiplier(prev => prev * 2);
        setStreak(0);
      }
    } else {
      // Trả lời sai -> Reset chuỗi & hệ số nhân
      setStreak(0);
      setMultiplier(1);
    }

    // Chuyển câu hỏi tiếp theo
    generateQuestion(level);
  }

  // Lắng nghe sự kiện đếm ngược thời gian
  useEffect(() => {
    if (phase === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setPhase("results");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Đăng ký phím tắt bàn phím ArrowLeft (Wrong/Sai) và ArrowRight (Right/Đúng)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (phase !== "playing") return;
      if (e.key === "ArrowLeft") {
        handleAnswer(false);
      } else if (e.key === "ArrowRight") {
        handleAnswer(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, currentQuestion, level, multiplier, streak]);

  return (
    <div className="mx-auto max-w-4xl px-2">
      {/* 1. MÀN HÌNH CHÀO MỪNG (Sprint Game - 1) */}
      {phase === "welcome" && (
        <div className="liquid-glass-card p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 shadow-xl relative overflow-hidden transition-all duration-500 hover:shadow-2xl">
          {/* 3D Illustration Area */}
          <div className="w-full md:w-1/2 flex justify-center bg-white/20 dark:bg-white/5 border border-border/80 p-5 rounded-3xl relative">
            <div className="absolute top-4 left-4 rounded-xl bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
              GlobalTalk Platform
            </div>
            <Image
              src="/student_character.png"
              alt="Cute 3D Student Character"
              width={260}
              height={260}
              className="object-contain drop-shadow-md hover:scale-105 transition-transform duration-500"
              priority
            />
          </div>

          {/* Details & Actions Area */}
          <div className="w-full md:w-1/2 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Sprint</h2>
                <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent">
                  SpeakUp Game
                </span>
              </div>
              <p className="text-sm font-medium text-muted leading-relaxed">
                Rèn luyện khả năng phản xạ và biên dịch từ vựng siêu tốc. Hãy chọn xem nghĩa dịch hiển thị bên dưới có tương thích chính xác với từ tiếng Anh đã cho hay không.
              </p>
            </div>

            {/* Level selector */}
            <div className="space-y-2.5">
              <p className="text-xs font-black uppercase tracking-wider text-muted">Lựa chọn trình độ học tập</p>
              <div className="grid grid-cols-6 gap-2">
                {Object.keys(SPRINT_WORDS).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={`h-10 w-10 rounded-full border text-xs font-black transition-all duration-300 flex items-center justify-center ${
                      level === lvl
                        ? "bg-gradient-to-tr from-accent to-indigo-500 border-accent text-white shadow-md scale-110"
                        : "border-border bg-white/10 dark:bg-white/5 text-muted hover:text-foreground hover:scale-105"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => startGame(level)}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-accent to-indigo-500 hover:from-accent/90 hover:to-indigo-500/90 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_8px_24px_rgba(6,182,212,0.25)]"
            >
              Bắt đầu phản xạ ngay (Get started)
            </button>
          </div>
        </div>
      )}

      {/* 2. MÀN HÌNH CHƠI GAME ACTIVE (Sprint Game - 2) */}
      {phase === "playing" && currentQuestion && (
        <div className="liquid-glass-card p-6 md:p-10 text-center relative overflow-hidden transition-all duration-500 max-w-xl mx-auto shadow-xl">
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-accent/10 rounded-full filter blur-xl pointer-events-none" />

          {/* SVG Circular Countdown Timer + Points */}
          <div className="flex flex-col items-center justify-center py-2 relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="52"
                className="stroke-black/5 dark:stroke-white/5"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="52"
                className="stroke-accent transition-all duration-1000 ease-linear"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - timeLeft / 30)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted mt-1">
                x{multiplier} Multiplier
              </span>
              <span className="text-xl font-black text-foreground">
                {timeLeft}s
              </span>
              <span className="text-xs font-bold text-accent">
                {score} pts
              </span>
            </div>
          </div>

          {/* Question Text Box */}
          <div className="my-8 space-y-3 bg-white/20 dark:bg-black/25 border border-border p-6 rounded-3xl shadow-sm relative">
            {streak > 0 && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent text-white px-3 py-0.5 text-[9px] font-black uppercase tracking-wider animate-bounce shadow-md">
                🔥 Chuỗi Đúng x{streak}
              </span>
            )}
            <h3 className="text-4xl font-extrabold tracking-tight text-gradient-iridescent select-none">
              {currentQuestion.en}
            </h3>
            <div className="h-[1px] bg-border/40 max-w-xs mx-auto my-2" />
            <p className="text-xl font-bold text-foreground/90 select-none">
              {currentQuestion.displayedVi}
            </p>
          </div>

          {/* Correct vs Incorrect Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleAnswer(false)}
              className="py-4 px-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300 text-sm font-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_20px_rgba(244,63,94,0.3)] active:scale-95 flex items-center justify-center gap-1"
            >
              <span>Wrong</span> (Sai) ◀
            </button>
            <button
              onClick={() => handleAnswer(true)}
              className="py-4 px-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-accent hover:bg-accent hover:text-white transition-all duration-300 text-sm font-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_20px_rgba(6,182,212,0.3)] active:scale-95 flex items-center justify-center gap-1"
            >
              ▶ Đúng (Right)
            </button>
          </div>

          <p className="mt-5 text-[10px] text-muted font-semibold">
            💡 Gợi ý: Bạn có thể nhấn phím mũi tên <b>Trái (Wrong)</b> hoặc <b>Phải (Right)</b> trên bàn phím!
          </p>
        </div>
      )}

      {/* 3. MÀN HÌNH TỔNG KẾT (Sprint Game - 4) */}
      {phase === "results" && (
        <div className="liquid-glass-card p-6 md:p-10 flex flex-col md:flex-row gap-8 shadow-xl relative overflow-hidden transition-all duration-500 hover:shadow-2xl">
          {/* Left panel: celebrate badge */}
          <div className="w-full md:w-5/12 text-center flex flex-col items-center justify-center border border-border bg-white/20 dark:bg-white/5 p-6 rounded-3xl relative">
            <Image
              src="/books_grad_cap.png"
              alt="3D Stack of books with Graduation Cap"
              width={180}
              height={180}
              className="object-contain drop-shadow-md mb-4"
            />
            
            <div className="space-y-1 mt-2">
              <h3 className="text-xl font-extrabold tracking-tight text-gradient-iridescent">Kết quả Sprint</h3>
              <p className="text-xs font-semibold text-muted max-w-xs leading-relaxed">
                Bạn đã làm rất tốt hôm nay! Hãy giữ vững phong độ phản xạ này nhé.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-5">
              <div className="bg-black/5 dark:bg-white/5 border border-border/40 rounded-2xl py-3 text-center shadow-sm">
                <p className="text-xl font-black text-primary">{score}</p>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wide">Tổng điểm</p>
              </div>
              <div className="bg-black/5 dark:bg-white/5 border border-border/40 rounded-2xl py-3 text-center shadow-sm">
                <p className="text-xl font-black text-accent">
                  {history.filter(h => h.wasCorrectAnswer).length}/{history.length}
                </p>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wide">Số từ đúng</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full mt-6">
              <button
                onClick={() => startGame(level)}
                className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-accent to-indigo-500 hover:from-accent/90 hover:to-indigo-500/90 text-xs font-bold text-white transition-all duration-300 active:scale-95 shadow-md flex items-center justify-center gap-1.5"
              >
                🔄 Chơi lại ván mới
              </button>
              <button
                onClick={() => setPhase("welcome")}
                className="w-full py-3 px-5 rounded-2xl border border-border bg-white/30 dark:bg-white/5 text-xs font-bold text-foreground transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 active:scale-95 flex items-center justify-center gap-1.5"
              >
                🏠 Trở về sảnh chờ
              </button>
            </div>
          </div>

          {/* Right panel: Vocabulary Review splits */}
          <div className="w-full md:w-7/12 flex flex-col h-[400px] md:h-auto overflow-hidden">
            <h4 className="text-sm font-black uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 shrink-0">
              📋 Danh sách ôn luyện lại từ vựng
            </h4>

            {/* Split columns container */}
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1">
              {/* Correct column (I know) */}
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 sticky top-0 bg-background/90 backdrop-blur z-1">
                  ✓ Đã biết ({history.filter(h => h.wasCorrectAnswer).length})
                </p>
                {history.filter(h => h.wasCorrectAnswer).length === 0 ? (
                  <p className="text-[11px] text-muted italic p-2 text-center">Chưa có từ nào.</p>
                ) : (
                  history.filter(h => h.wasCorrectAnswer).map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => speak(item.en)}
                      className="text-xs font-medium p-2.5 rounded-xl border border-border/40 bg-white/20 dark:bg-white/5 hover:border-accent/40 hover:bg-accent/5 cursor-pointer transition-all duration-300 shadow-sm flex flex-col gap-0.5"
                      title="Click để phát âm"
                    >
                      <span className="font-extrabold text-foreground">{item.en}</span>
                      <span className="text-muted text-[10px]">{item.correctVi}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Incorrect column (I don't know) */}
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 sticky top-0 bg-background/90 backdrop-blur z-1">
                  ✗ Chưa thuộc ({history.filter(h => !h.wasCorrectAnswer).length})
                </p>
                {history.filter(h => !h.wasCorrectAnswer).length === 0 ? (
                  <p className="text-[11px] text-muted italic p-2 text-center text-accent font-bold">✓ Tuyệt vời! Không sai từ nào.</p>
                ) : (
                  history.filter(h => !h.wasCorrectAnswer).map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => speak(item.en)}
                      className="text-xs font-medium p-2.5 rounded-xl border border-border/40 bg-white/20 dark:bg-white/5 hover:border-rose-500/40 hover:bg-rose-500/5 cursor-pointer transition-all duration-300 shadow-sm flex flex-col gap-0.5 animate-fadeIn"
                      title="Click để phát âm"
                    >
                      <span className="font-extrabold text-foreground">{item.en}</span>
                      <span className="text-muted text-[10px]">{item.correctVi}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
