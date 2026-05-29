"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "model"; text: string };

const scenarios = [
  { id: "cafe", label: "☕ Gọi món ở quán cà phê", en: "ordering at a coffee shop" },
  { id: "hotel", label: "🏨 Nhận phòng khách sạn", en: "checking in at a hotel" },
  { id: "directions", label: "🗺️ Hỏi đường trong thành phố", en: "asking for directions in a city" },
  { id: "interview", label: "💼 Phỏng vấn xin việc đơn giản", en: "a simple job interview" },
  { id: "friend", label: "🙂 Tán gẫu với một người bạn mới", en: "small talk with a new friend" },
];

export default function RoleplayPage() {
  const [scenario, setScenario] = useState<(typeof scenarios)[number] | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function speak(text: string) {
    if (!window.speechSynthesis) return;
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
    <main className="mx-auto max-w-2xl px-5 py-12 pt-16 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient-iridescent">
          Hội thoại với AI
        </h1>
        <p className="mt-2 text-sm font-semibold text-muted leading-relaxed">
          Chọn một tình huống và trò chuyện bằng tiếng Anh với bạn đồng hành AI. Bấm 🔊
          để nghe lại câu trả lời và luyện phản xạ nói.
        </p>
      </div>

      {/* Chọn tình huống */}
      <div className="flex flex-wrap gap-2 mb-6">
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            onClick={() => start(sc)}
            className={`rounded-xl border px-3 py-2 text-sm font-bold transition-all duration-300 active:scale-95 ${
              scenario?.id === sc.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-white/20 dark:bg-white/5 text-foreground hover:border-primary/40"
            }`}
          >
            {sc.label}
          </button>
        ))}
      </div>

      {unconfigured && (
        <div className="liquid-glass-card p-5 border border-warn/40 bg-warn/10 mb-6">
          <p className="text-sm font-bold text-foreground">
            Tính năng hội thoại AI cần khoá API Gemini. Hãy thêm{" "}
            <code className="text-primary">GEMINI_API_KEY</code> vào{" "}
            <code className="text-primary">.env.local</code> rồi khởi động lại app.
          </p>
        </div>
      )}

      {scenario && !unconfigured && (
        <div className="liquid-glass-card p-5 border border-border">
          <div
            ref={scrollRef}
            className="space-y-3 max-h-[50vh] overflow-y-auto pr-1"
          >
            {messages.length === 0 && loading && (
              <p className="text-sm font-semibold text-muted">AI đang mở lời… ⏳</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-white"
                      : "bg-white/30 dark:bg-white/5 border border-border text-foreground"
                  }`}
                >
                  {m.text}
                  {m.role === "model" && (
                    <button
                      onClick={() => speak(m.text)}
                      className="ml-2 align-middle text-base"
                      title="Nghe lại"
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
            ))}
            {messages.length > 0 && loading && (
              <p className="text-xs font-semibold text-muted">AI đang trả lời…</p>
            )}
          </div>

          <div className="mt-4 flex gap-2 border-t border-border/40 pt-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type your reply in English…"
              className="flex-1 rounded-xl border border-border bg-white/10 dark:bg-black/20 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 text-foreground placeholder:text-muted/60"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="liquid-glass-btn px-5 py-2.5 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Gửi
            </button>
          </div>
        </div>
      )}

      {!scenario && (
        <div className="liquid-glass-card py-12 text-center border border-dashed border-border/60">
          <p className="text-sm font-bold text-muted">
            Chọn một tình huống phía trên để bắt đầu trò chuyện 💬
          </p>
        </div>
      )}
    </main>
  );
}
