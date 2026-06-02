"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import vocabData from "@/data/vocab.json";
import { useAuth } from "@/lib/auth";
import { addNote } from "@/lib/notesRepo";
import { gradeNote } from "@/lib/reviewRepo";
import { todayKey } from "@/lib/store";

type Word = { en: string; vi: string };

// Kho từ vựng phân loại theo CEFR (nguồn chuẩn) — mỗi cấp ~30 từ để đỡ lặp.
const SPRINT_WORDS: Record<string, Word[]> = {
  A1: [
    { en: "hello", vi: "xin chào" }, { en: "goodbye", vi: "tạm biệt" }, { en: "family", vi: "gia đình" },
    { en: "mother", vi: "mẹ" }, { en: "father", vi: "bố" }, { en: "friend", vi: "người bạn" },
    { en: "food", vi: "đồ ăn" }, { en: "water", vi: "nước" }, { en: "school", vi: "trường học" },
    { en: "teacher", vi: "giáo viên" }, { en: "book", vi: "quyển sách" }, { en: "house", vi: "ngôi nhà" },
    { en: "dog", vi: "con chó" }, { en: "cat", vi: "con mèo" }, { en: "happy", vi: "vui vẻ" },
    { en: "sad", vi: "buồn" }, { en: "big", vi: "to lớn" }, { en: "small", vi: "nhỏ bé" },
    { en: "eat", vi: "ăn" }, { en: "drink", vi: "uống" }, { en: "run", vi: "chạy" },
    { en: "walk", vi: "đi bộ" }, { en: "sleep", vi: "ngủ" }, { en: "day", vi: "ngày" },
    { en: "night", vi: "đêm" }, { en: "today", vi: "hôm nay" }, { en: "weather", vi: "thời tiết" },
    { en: "hot", vi: "nóng" }, { en: "cold", vi: "lạnh" }, { en: "morning", vi: "buổi sáng" },
  ],
  A2: [
    { en: "depends on", vi: "phụ thuộc vào" }, { en: "looking forward to", vi: "mong đợi" },
    { en: "routine", vi: "thói quen hằng ngày" }, { en: "restaurant", vi: "nhà hàng" },
    { en: "opinion", vi: "ý kiến" }, { en: "weekend", vi: "cuối tuần" }, { en: "hobby", vi: "sở thích" },
    { en: "travel", vi: "du lịch" }, { en: "ticket", vi: "vé" }, { en: "airport", vi: "sân bay" },
    { en: "busy", vi: "bận rộn" }, { en: "tired", vi: "mệt mỏi" }, { en: "expensive", vi: "đắt đỏ" },
    { en: "cheap", vi: "rẻ" }, { en: "borrow", vi: "mượn" }, { en: "invite", vi: "mời" },
    { en: "decide", vi: "quyết định" }, { en: "prepare", vi: "chuẩn bị" }, { en: "arrive", vi: "đến nơi" },
    { en: "message", vi: "tin nhắn" }, { en: "comfortable", vi: "thoải mái" }, { en: "neighbor", vi: "hàng xóm" },
    { en: "advice", vi: "lời khuyên" }, { en: "healthy", vi: "khỏe mạnh" }, { en: "dangerous", vi: "nguy hiểm" },
    { en: "fix", vi: "sửa chữa" }, { en: "recommend", vi: "giới thiệu, gợi ý" }, { en: "delicious", vi: "ngon" },
    { en: "remember", vi: "nhớ" }, { en: "forget", vi: "quên" },
  ],
  B1: [
    { en: "conversation", vi: "cuộc hội thoại" }, { en: "confidence", vi: "sự tự tin" },
    { en: "improve", vi: "cải thiện" }, { en: "structure", vi: "cấu trúc" }, { en: "I'd rather", vi: "tôi thà... hơn" },
    { en: "achieve", vi: "đạt được" }, { en: "behavior", vi: "hành vi" }, { en: "complain", vi: "phàn nàn" },
    { en: "describe", vi: "miêu tả" }, { en: "encourage", vi: "khuyến khích" }, { en: "environment", vi: "môi trường" },
    { en: "experience", vi: "kinh nghiệm" }, { en: "however", vi: "tuy nhiên" }, { en: "manage", vi: "xoay xở, quản lý" },
    { en: "opportunity", vi: "cơ hội" }, { en: "persuade", vi: "thuyết phục" }, { en: "realize", vi: "nhận ra" },
    { en: "responsible", vi: "chịu trách nhiệm" }, { en: "suggest", vi: "đề xuất" }, { en: "although", vi: "mặc dù" },
    { en: "accurate", vi: "chính xác" }, { en: "deadline", vi: "hạn chót" }, { en: "negotiate", vi: "đàm phán" },
    { en: "schedule", vi: "lịch trình" }, { en: "prove", vi: "chứng minh" }, { en: "attitude", vi: "thái độ" },
    { en: "average", vi: "trung bình" }, { en: "generation", vi: "thế hệ" }, { en: "confident", vi: "tự tin" },
    { en: "achievement", vi: "thành tựu" },
  ],
  B2: [
    { en: "fluency", vi: "sự trôi chảy" }, { en: "pronunciation", vi: "sự phát âm" },
    { en: "assessment", vi: "sự đánh giá" }, { en: "appreciate", vi: "trân trọng" },
    { en: "assume", vi: "cho là, giả định" }, { en: "consequence", vi: "hậu quả" },
    { en: "contribute", vi: "đóng góp" }, { en: "demonstrate", vi: "thể hiện, chứng minh" },
    { en: "efficient", vi: "hiệu quả" }, { en: "estimate", vi: "ước tính" }, { en: "flexible", vi: "linh hoạt" },
    { en: "inevitable", vi: "không thể tránh khỏi" }, { en: "influence", vi: "ảnh hưởng" },
    { en: "maintain", vi: "duy trì" }, { en: "obstacle", vi: "trở ngại" }, { en: "perspective", vi: "góc nhìn" },
    { en: "priority", vi: "ưu tiên" }, { en: "reluctant", vi: "miễn cưỡng" }, { en: "significant", vi: "đáng kể" },
    { en: "sufficient", vi: "đủ, đầy đủ" }, { en: "tendency", vi: "xu hướng" }, { en: "thorough", vi: "kỹ lưỡng" },
    { en: "valuable", vi: "có giá trị" }, { en: "overcome", vi: "vượt qua" }, { en: "reliable", vi: "đáng tin cậy" },
    { en: "complicated", vi: "phức tạp" }, { en: "emphasize", vi: "nhấn mạnh" }, { en: "anniversary", vi: "lễ kỷ niệm" },
    { en: "adapt", vi: "thích nghi" }, { en: "consistent", vi: "nhất quán" },
  ],
  C1: [
    { en: "comprehension", vi: "sự thấu hiểu sâu" }, { en: "meticulous", vi: "tỉ mỉ, kỹ càng" },
    { en: "acquisition", vi: "sự tiếp thu" }, { en: "aesthetic", vi: "tính thẩm mỹ" },
    { en: "compelling", vi: "cuốn hút, thuyết phục" }, { en: "ambiguous", vi: "mơ hồ, đa nghĩa" },
    { en: "coherent", vi: "mạch lạc" }, { en: "deteriorate", vi: "xấu đi, suy giảm" },
    { en: "diminish", vi: "giảm sút" }, { en: "elaborate", vi: "tỉ mỉ, chi tiết" }, { en: "inherent", vi: "vốn có" },
    { en: "intricate", vi: "phức tạp tinh vi" }, { en: "nonetheless", vi: "tuy nhiên" }, { en: "plausible", vi: "hợp lý, có vẻ đúng" },
    { en: "profound", vi: "sâu sắc" }, { en: "prone", vi: "dễ bị, có xu hướng" }, { en: "redundant", vi: "dư thừa" },
    { en: "resilient", vi: "kiên cường" }, { en: "scrutiny", vi: "sự xem xét kỹ" }, { en: "subtle", vi: "tinh tế, khó nhận ra" },
    { en: "viable", vi: "khả thi" }, { en: "advocate", vi: "ủng hộ, biện hộ" }, { en: "comprehensive", vi: "toàn diện" },
    { en: "conscientious", vi: "tận tâm" }, { en: "discrepancy", vi: "sự chênh lệch" }, { en: "eloquent", vi: "hùng biện" },
    { en: "feasible", vi: "khả thi, thực hiện được" }, { en: "implication", vi: "hàm ý, hệ quả" },
    { en: "notion", vi: "khái niệm, quan niệm" }, { en: "robust", vi: "vững chắc, mạnh mẽ" },
  ],
  C2: [
    { en: "mastery", vi: "sự tinh thông" }, { en: "linguistic intuition", vi: "trực giác ngôn ngữ" },
    { en: "spontaneous", vi: "bộc phát tự nhiên" }, { en: "immersion", vi: "sự đắm chìm" },
    { en: "indispensable", vi: "không thể thiếu" }, { en: "ubiquitous", vi: "ở khắp mọi nơi" },
    { en: "nuance", vi: "sắc thái tinh tế" }, { en: "paramount", vi: "tối quan trọng" },
    { en: "ephemeral", vi: "phù du, chóng tàn" }, { en: "juxtapose", vi: "đặt cạnh để so sánh" },
    { en: "idiosyncratic", vi: "riêng biệt, kỳ lạ" }, { en: "quintessential", vi: "tinh túy, điển hình" },
    { en: "surreptitious", vi: "lén lút" }, { en: "vicarious", vi: "trải nghiệm gián tiếp" },
    { en: "esoteric", vi: "khó hiểu, bí truyền" }, { en: "pragmatic", vi: "thực dụng" },
    { en: "cogent", vi: "thuyết phục, chặt chẽ" }, { en: "tenacious", vi: "kiên trì, bền bỉ" },
    { en: "innate", vi: "bẩm sinh" }, { en: "candid", vi: "thẳng thắn" }, { en: "prolific", vi: "năng suất cao" },
    { en: "astute", vi: "sắc sảo" }, { en: "articulate", vi: "diễn đạt rõ ràng" }, { en: "meticulousness", vi: "sự tỉ mỉ" },
    { en: "profundity", vi: "sự sâu sắc" }, { en: "lucid", vi: "sáng sủa, rõ ràng" },
    { en: "salient", vi: "nổi bật, đáng chú ý" }, { en: "intrinsic", vi: "thuộc về bản chất" },
    { en: "discern", vi: "phân biệt, nhận thấy" }, { en: "nuanced", vi: "đa sắc thái, tinh tế" },
  ],
};

const VOCAB = vocabData as { en: string; vi: string; topic: string }[];
const VOCAB_TOPICS = [...new Set(VOCAB.map((v) => v.topic))];

const WRONG_DISTRACTORS = [
  "quả táo đỏ", "cửa sổ đóng", "con mèo lười", "chạy trốn",
  "đọc sách", "màu sắc xanh", "phát điện", "bỏ cuộc sớm",
];

type GamePhase = "welcome" | "playing" | "results";
type Source = "cefr" | "topic" | "ai";

export default function SprintGame() {
  const { userId } = useAuth();
  const [phase, setPhase] = useState<GamePhase>("welcome");
  const [source, setSource] = useState<Source>("cefr");
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [level, setLevel] = useState("A1");
  const [vocabTopic, setVocabTopic] = useState(VOCAB_TOPICS[0]);
  const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");

  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [streak, setStreak] = useState(0);
  const [poolLabel, setPoolLabel] = useState("");

  const poolRef = useRef<Word[]>([]);

  const [currentQuestion, setCurrentQuestion] = useState<{
    en: string; displayedVi: string; isCorrectMatch: boolean; correctVi: string;
  } | null>(null);
  const [history, setHistory] = useState<{ en: string; correctVi: string; wasCorrectAnswer: boolean }[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  function generateQuestion() {
    const list = poolRef.current.length >= 2 ? poolRef.current : SPRINT_WORDS["A1"];
    const item = list[Math.floor(Math.random() * list.length)];
    const isCorrectMatch = Math.random() > 0.45;
    let displayedVi = item.vi;
    if (!isCorrectMatch) {
      const others = list.filter((w) => w.en !== item.en);
      displayedVi = others.length
        ? others[Math.floor(Math.random() * others.length)].vi
        : WRONG_DISTRACTORS[Math.floor(Math.random() * WRONG_DISTRACTORS.length)];
    }
    setCurrentQuestion({ en: item.en, displayedVi, isCorrectMatch, correctVi: item.vi });
    speak(item.en);
  }

  // Chơi lại với đúng bộ từ hiện tại — đọc poolRef trong handler (lúc click), không phải lúc render.
  function replay() {
    startWith(poolRef.current, poolLabel);
  }

  function startWith(pool: Word[], label: string) {
    poolRef.current = pool;
    setPoolLabel(label);
    setHistory([]);
    setScore(0);
    setMultiplier(1);
    setStreak(0);
    setTimeLeft(30);
    setSavedSet(new Set());
    setSaveMsg("");
    setPhase("playing");
    generateQuestion();
  }

  // Lưu 1 từ vào Sổ tay + đẩy vào Ôn tập FSRS (điểm "again" vì chưa thuộc).
  async function saveWordRaw(en: string, vi: string) {
    const note = await addNote(userId!, {
      kind: en.trim().split(/\s+/).length === 1 ? "word" : "structure",
      content: en,
      meaning: vi,
      example: "",
      tags: poolLabel ? [poolLabel] : ["Sprint"],
      inReview: true,
    });
    await gradeNote(userId!, note.id, null, "again", todayKey());
  }
  async function saveOne(en: string, vi: string) {
    if (!userId) { setSaveMsg("Cần đăng nhập để lưu"); return; }
    if (savedSet.has(en)) return;
    try {
      await saveWordRaw(en, vi);
      setSavedSet((s) => new Set(s).add(en));
    } catch {
      setSaveMsg("Lỗi khi lưu");
    }
  }
  async function saveAllUnknown() {
    if (!userId) { setSaveMsg("Cần đăng nhập để lưu"); return; }
    setSavingAll(true);
    try {
      const seen = new Set(savedSet);
      for (const h of history.filter((x) => !x.wasCorrectAnswer)) {
        if (seen.has(h.en)) continue;
        seen.add(h.en);
        await saveWordRaw(h.en, h.correctVi);
      }
      setSavedSet(seen);
      setSaveMsg("Đã lưu vào Ôn tập ✓");
    } catch {
      setSaveMsg("Lỗi khi lưu");
    } finally {
      setSavingAll(false);
    }
  }

  function startCefr() {
    startWith(SPRINT_WORDS[level] || SPRINT_WORDS["A1"], `Cấp độ ${level}`);
  }
  function startTopic() {
    const pool = VOCAB.filter((v) => v.topic === vocabTopic).map(({ en, vi }) => ({ en, vi }));
    startWith(pool, vocabTopic);
  }
  async function startAi() {
    setAiErr("");
    setAiLoading(true);
    try {
      const qs = new URLSearchParams({ level, n: "18" });
      if (aiTopic.trim()) qs.set("topic", aiTopic.trim());
      const res = await fetch(`/api/sprint-words?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được từ.");
      startWith(data.words as Word[], `AI · ${level}${aiTopic.trim() ? " · " + aiTopic.trim() : ""}`);
    } catch (e) {
      setAiErr(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleAnswer(userSelectedTrue: boolean) {
    if (!currentQuestion) return;
    const ok = userSelectedTrue === currentQuestion.isCorrectMatch;
    setHistory((prev) => [...prev, { en: currentQuestion.en, correctVi: currentQuestion.correctVi, wasCorrectAnswer: ok }]);
    if (ok) {
      setScore((p) => p + 10 * multiplier);
      const next = streak + 1;
      setStreak(next);
      if (next >= 4 && multiplier < 4) {
        setMultiplier((p) => p * 2);
        setStreak(0);
      }
    } else {
      setStreak(0);
      setMultiplier(1);
    }
    generateQuestion();
  }

  useEffect(() => {
    if (phase === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "playing") return;
      if (e.key === "ArrowLeft") handleAnswer(false);
      else if (e.key === "ArrowRight") handleAnswer(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentQuestion, multiplier, streak]);

  const ring: Record<string, string> = {
    A1: "#10b981", A2: "#f59e0b", B1: "#ef4444", B2: "#be123c", C1: "#a855f7", C2: "#2b788b",
  };

  return (
    <div className="mx-auto max-w-4xl px-2">
      {/* ===== WELCOME ===== */}
      {phase === "welcome" && (
        <div className="liquid-glass-card p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 shadow-xl relative overflow-hidden transition-all duration-500 hover:shadow-2xl">
          <div className="w-full md:w-1/2 flex justify-center items-center py-2">
            <div className="p-3 rounded-2xl bg-white border border-border/80 shadow-md hover:rotate-1 hover:scale-102 transition-all duration-500 ease-out">
              <Image src="/student_character.png" alt="Sprint" width={240} height={240} className="rounded-xl object-contain" priority />
            </div>
          </div>

          <div className="w-full md:w-1/2 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Sprint</h2>
                <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent">SpeakUp Game</span>
              </div>
              <p className="text-sm font-medium text-muted leading-relaxed">
                Rèn phản xạ dịch nghĩa siêu tốc. Chọn xem nghĩa hiển thị có khớp với từ tiếng Anh hay không.
              </p>
            </div>

            {/* Nguồn từ vựng */}
            <div className="flex gap-1.5 rounded-2xl border border-border/60 bg-background/50 p-1 text-[10px] font-black uppercase tracking-wider">
              {([["cefr", "Cấp độ"], ["topic", "Chủ đề"], ["ai", "🤖 AI tạo"]] as [Source, string][]).map(([s, lbl]) => (
                <button key={s} onClick={() => setSource(s)} className={`flex-1 rounded-xl py-2 transition-all ${source === s ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-foreground"}`}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* CEFR */}
            {source === "cefr" && (
              <div className="space-y-2.5">
                <p className="text-xs font-black uppercase tracking-wider text-muted">Lựa chọn trình độ</p>
                <div className="grid grid-cols-6 gap-2">
                  {Object.keys(SPRINT_WORDS).map((lvl) => {
                    const active = level === lvl;
                    return (
                      <button key={lvl} onClick={() => setLevel(lvl)} style={{ borderColor: ring[lvl], color: active ? "#fff" : ring[lvl], background: active ? ring[lvl] : "transparent" }}
                        className={`h-10 w-10 rounded-full border-2 text-xs font-black transition-all duration-300 flex items-center justify-center ${active ? "scale-110 shadow-md" : "hover:scale-105"}`}>
                        {lvl}
                      </button>
                    );
                  })}
                </div>
                <button onClick={startCefr} className="w-full py-3.5 px-6 rounded-2xl bg-primary hover:opacity-90 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_8px_24px_rgba(43,120,139,0.3)]">
                  Bắt đầu phản xạ ngay
                </button>
              </div>
            )}

            {/* Chủ đề (kho app) */}
            {source === "topic" && (
              <div className="space-y-2.5">
                <p className="text-xs font-black uppercase tracking-wider text-muted">Chủ đề từ vựng ({VOCAB.length} từ trong kho)</p>
                <select value={vocabTopic} onChange={(e) => setVocabTopic(e.target.value)} className="w-full rounded-2xl border-2 border-border/60 bg-background/50 px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-primary">
                  {VOCAB_TOPICS.map((t) => <option key={t} value={t}>{t} ({VOCAB.filter((v) => v.topic === t).length})</option>)}
                </select>
                <button onClick={startTopic} className="w-full py-3.5 px-6 rounded-2xl bg-primary hover:opacity-90 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_8px_24px_rgba(43,120,139,0.3)]">
                  Bắt đầu phản xạ ngay
                </button>
              </div>
            )}

            {/* AI tạo mới */}
            {source === "ai" && (
              <div className="space-y-2.5">
                <p className="text-xs font-black uppercase tracking-wider text-muted">AI tạo bộ từ mới theo trình độ</p>
                <div className="grid grid-cols-6 gap-2">
                  {Object.keys(SPRINT_WORDS).map((lvl) => {
                    const active = level === lvl;
                    return (
                      <button key={lvl} onClick={() => setLevel(lvl)} style={{ borderColor: ring[lvl], color: active ? "#fff" : ring[lvl], background: active ? ring[lvl] : "transparent" }}
                        className={`h-9 w-9 rounded-full border-2 text-[11px] font-black transition-all duration-300 flex items-center justify-center ${active ? "scale-110 shadow-md" : "hover:scale-105"}`}>
                        {lvl}
                      </button>
                    );
                  })}
                </div>
                <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Chủ đề (tuỳ chọn): du lịch, công sở…" className="w-full rounded-2xl border-2 border-border/60 bg-background/50 px-4 py-2.5 text-sm font-bold text-foreground outline-none focus:border-primary" />
                {aiErr && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600">{aiErr}</p>}
                <button onClick={startAi} disabled={aiLoading} className="w-full py-3.5 px-6 rounded-2xl bg-primary hover:opacity-90 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_8px_24px_rgba(43,120,139,0.3)] disabled:opacity-50">
                  {aiLoading ? "🤖 Đang tạo bộ từ…" : "🤖 Tạo bằng AI & chơi"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== PLAYING ===== */}
      {phase === "playing" && currentQuestion && (
        <div className="liquid-glass-card p-6 md:p-10 text-center relative overflow-hidden transition-all duration-500 max-w-xl mx-auto shadow-xl">
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-accent/10 rounded-full filter blur-xl pointer-events-none" />
          {poolLabel && <span className="absolute top-3 right-4 text-[9px] font-black uppercase tracking-wider text-muted">{poolLabel}</span>}

          <div className="flex flex-col items-center justify-center py-2 relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="52" className="stroke-black/5 dark:stroke-white/5" strokeWidth="6" fill="transparent" />
              <circle cx="64" cy="64" r="52" className="stroke-accent transition-all duration-1000 ease-linear" strokeWidth="6" fill="transparent"
                strokeDasharray={`${2 * Math.PI * 52}`} strokeDashoffset={`${2 * Math.PI * 52 * (1 - timeLeft / 30)}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted mt-1">x{multiplier} Multiplier</span>
              <span className="text-xl font-black text-foreground">{timeLeft}s</span>
              <span className="text-xs font-bold text-accent">{score} pts</span>
            </div>
          </div>

          <div className="my-8 space-y-3 bg-white/20 dark:bg-black/25 border border-border p-6 rounded-3xl shadow-sm relative">
            {streak > 0 && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent text-white px-3 py-0.5 text-[9px] font-black uppercase tracking-wider animate-bounce shadow-md">
                🔥 Chuỗi Đúng x{streak}
              </span>
            )}
            <h3 className="text-4xl font-extrabold tracking-tight text-gradient-iridescent select-none">{currentQuestion.en}</h3>
            <div className="h-[1px] bg-border/40 max-w-xs mx-auto my-2" />
            <p className="text-xl font-bold text-foreground/90 select-none">{currentQuestion.displayedVi}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleAnswer(false)} className="py-4 px-6 rounded-2xl bg-pink-soft text-pink border border-transparent hover:opacity-90 transition-all duration-300 text-sm font-black active:scale-95 flex items-center justify-center gap-1">◀ Wrong (Sai)</button>
            <button onClick={() => handleAnswer(true)} className="py-4 px-6 rounded-2xl bg-primary-soft text-primary border border-transparent hover:opacity-90 transition-all duration-300 text-sm font-black active:scale-95 flex items-center justify-center gap-1">Right (Đúng) ▶</button>
          </div>
          <p className="mt-5 text-[10px] text-muted font-semibold">💡 Mẹo: nhấn phím mũi tên <b>Trái (Wrong)</b> / <b>Phải (Right)</b> trên bàn phím!</p>
        </div>
      )}

      {/* ===== RESULTS ===== */}
      {phase === "results" && (() => {
        const correct = history.filter((h) => h.wasCorrectAnswer).length;
        const total = history.length;
        const accuracy = total ? Math.round((correct / total) * 100) : 0;
        const known = history.filter((h) => h.wasCorrectAnswer);
        const unknown = history.filter((h) => !h.wasCorrectAnswer);
        const allSaved = unknown.length > 0 && unknown.every((h) => savedSet.has(h.en));
        return (
        <div className="space-y-5 animate-fadeIn">
          {/* Header tổng kết — luôn hiển thị */}
          <div className="liquid-glass-card p-5 md:p-7 shadow-xl relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-center gap-5">
              <Image src="/books_grad_cap.png" alt="Kết quả" width={96} height={96} className="object-contain drop-shadow-md shrink-0" />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display text-xl md:text-2xl font-extrabold tracking-tight text-foreground">Hoàn thành Sprint! 🎉</h3>
                {poolLabel && <p className="text-[11px] font-bold uppercase tracking-wider text-muted mt-0.5">{poolLabel}</p>}
                <div className="mt-4 flex justify-center sm:justify-start gap-2.5">
                  <div className="rounded-2xl border border-border/50 bg-white/40 dark:bg-white/5 px-4 py-2 text-center shadow-sm">
                    <p className="text-lg font-black text-primary leading-none">{score}</p>
                    <p className="text-[8.5px] font-black uppercase tracking-wider text-muted mt-1">Điểm</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-white/40 dark:bg-white/5 px-4 py-2 text-center shadow-sm">
                    <p className="text-lg font-black text-accent leading-none">{correct}/{total}</p>
                    <p className="text-[8.5px] font-black uppercase tracking-wider text-muted mt-1">Đúng</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-white/40 dark:bg-white/5 px-4 py-2 text-center shadow-sm">
                    <p className="text-lg font-black text-foreground leading-none">{accuracy}%</p>
                    <p className="text-[8.5px] font-black uppercase tracking-wider text-muted mt-1">Chính xác</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto shrink-0">
                <button onClick={replay} className="flex-1 sm:flex-none py-2.5 px-5 rounded-2xl bg-primary hover:opacity-90 text-xs font-bold text-white transition-all duration-300 active:scale-95 shadow-md whitespace-nowrap">🔄 Chơi lại</button>
                <button onClick={() => setPhase("welcome")} className="flex-1 sm:flex-none py-2.5 px-5 rounded-2xl border border-border bg-white/40 dark:bg-white/5 text-xs font-bold text-foreground transition-all duration-300 hover:border-primary/40 active:scale-95 whitespace-nowrap">🏠 Đổi bộ từ</button>
              </div>
            </div>
            {saveMsg && <p className="mt-4 rounded-xl bg-accent/10 px-3 py-2 text-[11px] font-bold text-accent text-center">{saveMsg}</p>}
          </div>

          {/* Danh sách ôn lại */}
          <div className="liquid-glass-card p-5 md:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h4 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">📋 Danh sách ôn luyện lại</h4>
              {unknown.length > 0 && (
                <button onClick={saveAllUnknown} disabled={savingAll || allSaved} className="rounded-xl border border-primary/30 bg-primary-soft/70 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary-soft disabled:opacity-60">
                  {savingAll ? "Đang lưu…" : allSaved ? "✓ Đã lưu Ôn tập" : `🔖 Lưu ${unknown.length} từ chưa thuộc`}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-1">
              {/* Đã biết */}
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-accent bg-accent/10 border border-accent/20 px-2.5 py-1.5 rounded-lg shrink-0 sticky top-0 z-1 backdrop-blur">✓ Đã biết ({known.length})</p>
                {known.length === 0 ? (
                  <p className="text-[11px] text-muted italic p-2 text-center">Chưa có từ nào.</p>
                ) : (
                  known.map((item, idx) => (
                    <div key={idx} onClick={() => speak(item.en)} className="text-xs font-medium p-2.5 rounded-xl border border-border/40 bg-white/20 dark:bg-white/5 hover:border-accent/40 hover:bg-accent/5 cursor-pointer transition-all duration-300 shadow-sm flex flex-col gap-0.5" title="Click để phát âm">
                      <span className="font-extrabold text-foreground">{item.en}</span>
                      <span className="text-muted text-[10px]">{item.correctVi}</span>
                    </div>
                  ))
                )}
              </div>
              {/* Chưa thuộc */}
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg shrink-0 sticky top-0 z-1 backdrop-blur">✗ Chưa thuộc ({unknown.length})</p>
                {unknown.length === 0 ? (
                  <p className="text-[11px] italic p-2 text-center text-accent font-bold">✓ Tuyệt vời! Không sai từ nào.</p>
                ) : (
                  unknown.map((item, idx) => (
                    <div key={idx} className="text-xs font-medium p-2.5 rounded-xl border border-border/40 bg-white/20 dark:bg-white/5 hover:border-rose-500/40 hover:bg-rose-500/5 transition-all duration-300 shadow-sm flex items-center gap-2 animate-fadeIn">
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => speak(item.en)} title="Click để phát âm">
                        <span className="block font-extrabold text-foreground truncate">{item.en}</span>
                        <span className="block text-muted text-[10px] truncate">{item.correctVi}</span>
                      </div>
                      {savedSet.has(item.en) ? (
                        <span className="shrink-0 text-accent text-sm" title="Đã lưu">✓</span>
                      ) : (
                        <button onClick={() => saveOne(item.en, item.correctVi)} className="shrink-0 rounded-lg px-1.5 py-1 text-muted hover:text-primary hover:bg-primary-soft/40" title="Lưu từ này vào Ôn tập">🔖</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
