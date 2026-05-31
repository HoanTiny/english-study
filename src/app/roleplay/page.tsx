"use client";

import { useRef, useState } from "react";

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

          <div className="mt-5 flex gap-3 border-t border-border/40 pt-5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type your reply in English…"
              className="flex-1 rounded-full border border-border/60 bg-background/50 px-5 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-background text-foreground placeholder:text-muted/60 shadow-inner"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="liquid-glass-btn px-6 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Gửi thoại
            </button>
          </div>
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
