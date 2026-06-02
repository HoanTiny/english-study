"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { addErrors } from "@/lib/errorLogRepo";

type Msg = { role: "user" | "model"; text: string };

const scenarios = [
  { id: "cafe", label: "☕ Quán cà phê", en: "ordering at a coffee shop" },
  { id: "hotel", label: "🏨 Khách sạn", en: "checking in at a hotel" },
  { id: "directions", label: "🗺️ Hỏi đường", en: "asking for directions in a city" },
  { id: "friend", label: "🙂 Bạn mới", en: "small talk with a new friend" },
  { id: "interview", label: "💼 Phỏng vấn", en: "a simple job interview" },
];

export default function RoleplayPage() {
  const [scenario, setScenario] = useState<(typeof scenarios)[number] | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { userId } = useAuth();

  // Nói bằng giọng (Web Speech API) + chấm cuối buổi.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [feedback, setFeedback] = useState<any | null>(null);
  const [scoring, setScoring] = useState(false);
  const sttSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const userTurns = messages.filter((m) => m.role === "user").length;

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setInput("");
    rec.start();
    setListening(true);
  }

  async function getFeedback() {
    if (!scenario || scoring) return;
    setScoring(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/roleplay-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.en, messages }),
      });
      const d = await res.json();
      setFeedback(d.ok ? d.feedback : { error: d.error || "error" });
      // Lưu lỗi vào Sổ lỗi cá nhân.
      if (d.ok && userId && Array.isArray(d.feedback?.corrections) && d.feedback.corrections.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addErrors(userId, d.feedback.corrections.map((c: any) => ({ source: "roleplay" as const, original: c.original, correction: c.better, note: c.why }))).catch(() => {});
      }
    } catch {
      setFeedback({ error: "network" });
    } finally {
      setScoring(false);
    }
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  async function sendTo(history: Msg[], sc: (typeof scenarios)[number]) {
    setLoading(true);
    try {
      const res = await fetch("/api/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: sc.en, messages: history }),
      });
      const data = (await res.json()) as { reply: string | null; source: string };
      if (data.reply === null) {
        setUnconfigured(true);
      } else {
        setMessages((prev) => [...prev, { role: "model", text: data.reply! }]);
        speak(data.reply);
        setTimeout(() => scrollRef.current?.scrollTo(0, 1e9), 50);
      }
    } catch {
      setUnconfigured(true);
    } finally {
      setLoading(false);
    }
  }

  function start(sc: (typeof scenarios)[number]) {
    setScenario(sc);
    setMessages([]);
    setUnconfigured(false);
    setFeedback(null);
    sendTo([], sc); // để AI mở lời
  }

  async function send() {
    if (!input.trim() || !scenario || loading) return;
    const next: Msg[] = [...messages, { role: "user", text: input.trim() }];
    setMessages(next);
    setInput("");
    await sendTo(next, scenario);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 animate-fadeIn relative">
      <div className="mb-8">
        <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
          🎙️ ĐÀM THOẠI NHẬP VAI AI
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-3">
          Hội thoại với AI
        </h1>
        <p className="mt-2 text-xs sm:text-sm font-semibold text-muted leading-relaxed">
          Chọn một tình huống thực tế để bắt đầu cuộc đàm thoại tiếng Anh sinh động. Bấm nút 🔊 bên cạnh câu thoại của trợ lý để nghe phát âm chuẩn xác.
        </p>
      </div>

      {/* Chọn tình huống (frosted pill selectors) */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            onClick={() => start(sc)}
            className={`rounded-full border px-4 py-2.5 text-xs font-black transition-all duration-300 active:scale-95 cursor-pointer shadow-sm ${
              scenario?.id === sc.id
                ? "border-primary bg-primary text-primary-fg shadow-md shadow-primary/20 scale-102"
                : "border-border/60 bg-surface text-foreground hover:border-primary/55 hover:scale-[1.02]"
            }`}
          >
            {sc.label}
          </button>
        ))}
      </div>

      {unconfigured && (
        <div className="liquid-glass-card p-5 border border-warn/40 bg-warn/15 mb-6">
          <p className="text-xs font-black text-foreground">
            ⚠️ Tính năng hội thoại AI yêu cầu cấu hình khóa API Gemini. Vui lòng thêm{" "}
            <code className="text-primary font-mono">GEMINI_API_KEY</code> vào file{" "}
            <code className="text-primary font-mono">.env.local</code> và khởi động lại dự án.
          </p>
        </div>
      )}

      {scenario && !unconfigured && (
        <div className="liquid-glass-card p-5 md:p-6 border border-border/80 shadow-2xl bg-white/20 dark:bg-black/20 backdrop-blur-md">
          <div
            ref={scrollRef}
            className="space-y-4.5 max-h-[50vh] overflow-y-auto pr-1"
          >
            {messages.length === 0 && loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4.5 py-3 text-xs font-semibold bg-surface border border-border/80 text-muted animate-pulse">
                  AI đang mở đầu câu chuyện… 💬
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4.5 py-3 text-xs font-semibold leading-relaxed shadow-sm flex items-center gap-2 ${
                    m.role === "user"
                      ? "bg-primary text-white border border-primary/20"
                      : "bg-surface border border-border/80 text-foreground"
                  }`}
                >
                  <span className="break-words">{m.text}</span>
                  {m.role === "model" && (
                    <button
                      onClick={() => speak(m.text)}
                      className="h-6 w-6 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 text-xs hover:scale-110 active:scale-90 transition-all shrink-0 cursor-pointer"
                      title="Nghe lại phát âm"
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
            ))}
            {messages.length > 0 && loading && (
              <div className="flex justify-start animate-pulse">
                <div className="rounded-2xl px-4.5 py-3 text-xs font-semibold bg-surface border border-border/80 text-muted">
                  AI đang trả lời… ⏳
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-2 border-t border-border/40 pt-5">
            {sttSupported && (
              <button
                onClick={toggleMic}
                title="Nói bằng giọng"
                className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-full text-lg transition-all active:scale-95 ${listening ? "bg-rose-500 text-white animate-pulse" : "bg-primary-soft text-primary hover:bg-primary/20"}`}
              >
                🎤
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={listening ? "Đang nghe… nói tiếng Anh" : "Nói (🎤) hoặc gõ câu trả lời…"}
              className="flex-1 rounded-full border border-border/60 bg-background/50 px-5 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-background text-foreground placeholder:text-muted/60 shadow-inner"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="liquid-glass-btn px-6 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Gửi
            </button>
          </div>

          {/* Kết thúc & chấm */}
          {userTurns >= 1 && (
            <div className="mt-3 text-center">
              <button
                onClick={getFeedback}
                disabled={scoring}
                className="rounded-full border border-accent/40 bg-accent/10 px-5 py-2 text-xs font-black text-accent hover:bg-accent/15 active:scale-95 disabled:opacity-40"
              >
                {scoring ? "Đang chấm…" : "⭐ Kết thúc & nhận nhận xét"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bảng nhận xét sau khi chấm */}
      {feedback && (
        <div className="mt-5 liquid-glass-card p-5 md:p-6 border border-border/80 shadow-xl animate-fadeIn">
          {feedback.error ? (
            <p className="text-xs font-bold text-muted">
              {feedback.error === "no_user_turns" ? "Bạn chưa nói câu nào để chấm." : feedback.error === "unconfigured" ? "Chưa cấu hình AI để chấm." : "Chưa chấm được, thử lại sau."}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-lg font-black text-accent">{feedback.score ?? "–"}</div>
                <div>
                  <p className="text-sm font-black text-foreground">Nhận xét buổi nói {feedback.level ? `· ~${feedback.level}` : ""}</p>
                  {feedback.fluency && <p className="text-[11px] font-semibold text-muted">{feedback.fluency}</p>}
                </div>
              </div>

              {Array.isArray(feedback.strengths) && feedback.strengths.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500 mb-1">✓ Điểm tốt</p>
                  <ul className="list-disc pl-5 text-xs font-semibold text-foreground/90 space-y-0.5">
                    {feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {Array.isArray(feedback.corrections) && feedback.corrections.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-rose-500 mb-1">✎ Sửa lỗi</p>
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {feedback.corrections.map((c: any, i: number) => (
                      <div key={i} className="rounded-xl bg-black/5 dark:bg-white/5 border border-border/40 p-2.5 text-xs">
                        <p className="text-rose-500/90 line-through">{c.original}</p>
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold">→ {c.better}</p>
                        {c.why && <p className="text-[10px] text-muted mt-0.5">{c.why}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(feedback.vocab) && feedback.vocab.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary mb-1">＋ Từ/cụm nên dùng</p>
                  <ul className="text-xs font-semibold text-foreground/90 space-y-0.5">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {feedback.vocab.map((v: any, i: number) => (
                      <li key={i}><span className="text-primary font-bold">{v.phrase}</span>{v.vi ? ` — ${v.vi}` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.tip && (
                <p className="rounded-xl bg-primary-soft/40 border border-primary/20 p-2.5 text-xs font-semibold text-foreground">💡 {feedback.tip}</p>
              )}
            </>
          )}
        </div>
      )}

      {!scenario && (
        <div className="liquid-glass-card py-16 text-center border border-dashed border-border/60 bg-white/10 dark:bg-black/10">
          <p className="text-xs sm:text-sm font-bold text-muted">
            Chọn một tình huống thực tế phía trên để bắt đầu đàm thoại với trợ lý 💬
          </p>
        </div>
      )}
    </main>
  );
}
