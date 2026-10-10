"use client";
import { apiFetch } from "@/lib/apiFetch";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { addErrors } from "@/lib/errorLogRepo";
import styles from "./roleplay.module.css";

type Msg = { role: "user" | "model"; text: string; assisted?: boolean; originalVietnamese?: string; explanation?: string };

const scenarios = [
  { id: "cafe", icon: "☕", label: "Quán cà phê", en: "ordering at a coffee shop", role: "Nhân viên pha chế", description: "Gọi món & trò chuyện", goals: ["Gọi món đồ uống bạn thích", "Nói rõ kích cỡ và lượng đường", "Hỏi giá và cảm ơn"], phrase: "I'd like a coffee, please.", meaning: "Cho tôi một ly cà phê nhé." },
  { id: "hotel", icon: "🏨", label: "Khách sạn", en: "checking in at a hotel", role: "Lễ tân khách sạn", description: "Đặt phòng & nhận phòng", goals: ["Giới thiệu tên đặt phòng", "Hỏi giờ nhận và trả phòng", "Hỏi về tiện nghi bạn cần"], phrase: "I have a reservation under my name.", meaning: "Tôi đã đặt phòng dưới tên của mình." },
  { id: "directions", icon: "🗺️", label: "Hỏi đường", en: "asking for directions in a city", role: "Người dân địa phương", description: "Tìm đường trong thành phố", goals: ["Hỏi đường đến một địa điểm", "Hỏi khoảng cách hoặc thời gian đi", "Xác nhận lại hướng dẫn"], phrase: "Excuse me, how do I get to the station?", meaning: "Xin lỗi, đi đến nhà ga bằng đường nào vậy?" },
  { id: "friend", icon: "🙂", label: "Bạn mới", en: "small talk with a new friend", role: "Người bạn mới", description: "Làm quen & chia sẻ sở thích", goals: ["Giới thiệu bản thân", "Chia sẻ một sở thích của bạn", "Hỏi thêm về người đối diện"], phrase: "What do you like to do in your free time?", meaning: "Bạn thích làm gì khi rảnh?" },
  { id: "interview", icon: "💼", label: "Phỏng vấn", en: "a simple job interview", role: "Người phỏng vấn", description: "Giới thiệu & nói về công việc", goals: ["Giới thiệu ngắn về bản thân", "Kể một điểm mạnh kèm ví dụ", "Đặt câu hỏi về công việc"], phrase: "Let me tell you a little about myself.", meaning: "Để tôi giới thiệu đôi chút về bản thân." },
];

export default function RoleplayPage() {
  const [scenario, setScenario] = useState<(typeof scenarios)[number] | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chat" | "voice">("chat");
  const [autoplay, setAutoplay] = useState(true);
  const playback = useRef(false);
  const [clarification, setClarification] = useState<string | null>(null);
  const [replyTranslations, setReplyTranslations] = useState<Record<number, { text?: string; visible: boolean; error?: string }>>({});
  const [translatingReply, setTranslatingReply] = useState<number | null>(null);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Msg[] | null>(null);
  const lock = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { userId } = useAuth();

  // Nói bằng giọng (Web Speech API) + chấm cuối buổi.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [feedback, setFeedback] = useState<any | null>(null);
  const [scoring, setScoring] = useState(false);
  const userTurns = messages.filter((m) => m.role === "user").length;
  const independentTurns = messages.filter(m => m.role === "user" && !m.assisted).length;
  const busy = loading || translating || scoring || translatingReply !== null;
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const feedbackRef = useRef<HTMLElement | null>(null);
  const activeScenario = scenario ?? scenarios[0];

  async function translateReply(index: number) {
    const cached = replyTranslations[index];
    if (cached?.text) {
      setReplyTranslations(current => ({ ...current, [index]: { ...cached, visible: !cached.visible } }));
      return;
    }
    if (!scenario || lock.current || messages[index]?.role !== "model") return;
    lock.current = true; setTranslatingReply(index);
    setReplyTranslations(current => ({ ...current, [index]: { visible: true } }));
    try {
      const data = await request("/api/roleplay-translate", { direction: "en-vi", text: messages[index].text, scenario: scenario.en });
      if (typeof data.vietnamese !== "string" || !data.vietnamese.trim()) throw new Error("Invalid translation");
      setReplyTranslations(current => ({ ...current, [index]: { text: data.vietnamese, visible: true } }));
    } catch {
      setReplyTranslations(current => ({ ...current, [index]: { visible: true, error: "Chưa dịch được câu này. Bấm Dịch để thử lại." } }));
    } finally { lock.current = false; setTranslatingReply(null); }
  }

  useEffect(() => () => {
    abortRef.current?.abort();
    const rec = recRef.current;
    recRef.current = null;
    rec?.abort();
    window.speechSynthesis?.cancel();
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, loading]);
  useEffect(() => { if (feedback) feedbackRef.current?.scrollIntoView({ block: "nearest" }); }, [feedback]);

  function stopMic() {
    const rec = recRef.current;
    recRef.current = null;
    rec?.abort();
    setListening(false);
  }
  function switchMode(next: "chat" | "voice") {
    stopMic();
    window.speechSynthesis?.cancel();
    playback.current = next === "voice" && autoplay;
    setMode(next);
  }
  async function request(path: string, body: unknown) {
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 45000);
    try {
      const response = await apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      return await response.json();
    } finally { window.clearTimeout(timer); }
  }
  function showError(cause: unknown) {
    setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "Yêu cầu bị gián đoạn. Nội dung vẫn được giữ lại; bạn có thể thử lại.");
  }
  function toggleMic() {
    if (recRef.current) {
      recRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (lock.current) return;
    if (!SR) { setError("Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bạn vẫn có thể gõ câu trả lời."); return; }
    window.speechSynthesis?.cancel();
    setError(null);
    const prefix = input.trim();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      if (recRef.current !== rec) return;
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput([prefix, t].filter(Boolean).join(" ").slice(0, 2000));
    };
    rec.onend = () => { if (recRef.current === rec) { recRef.current = null; setListening(false); } };
    rec.onerror = () => { if (recRef.current === rec) { recRef.current = null; setListening(false); setError("Không nhận được giọng nói. Kiểm tra quyền mic hoặc tiếp tục gõ; bản nháp vẫn được giữ."); } };
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { recRef.current = null; setError("Không mở được mic. Bạn có thể tiếp tục gõ."); }
  }

  async function getFeedback() {
    if (!scenario || lock.current || !independentTurns || pending !== null) return;
    lock.current = true;
    setError(null);
    setScoring(true);
    setFeedback(null);
    try {
      const d = await request("/api/roleplay-feedback", { scenario: scenario.en, messages: messages.slice(-30).map(({ role, text, assisted }) => ({ role, text, assisted })) });
      setFeedback(d.ok ? d.feedback : { error: d.error || "error" });
      // Lưu lỗi vào Sổ lỗi cá nhân.
      if (d.ok && userId && Array.isArray(d.feedback?.corrections) && d.feedback.corrections.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addErrors(userId, d.feedback.corrections.filter((c: any) => typeof c?.original === "string" && !!c.original.trim() && typeof c.better === "string" && typeof c.why === "string" && messages.some(m => m.role === "user" && !m.assisted && m.text.includes(c.original))).map((c: any) => ({ source: "roleplay" as const, original: c.original, correction: c.better, note: c.why }))).catch(() => {});
      }
    } catch {
      setFeedback({ error: "network" });
    } finally {
      lock.current = false;
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
    if (lock.current) return;
    lock.current = true;
    setPending(history);
    setError(null);
    setLoading(true);
    try {
      const data = await request("/api/roleplay", { scenario: sc.en, messages: history.slice(-30).map(({ role, text }) => ({ role, text })) });
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("AI chưa trả lời được. Bạn có thể thử lại sau.");
      } else {
        setMessages([...history, { role: "model", text: data.reply }]);
        setPending(null);
        if (playback.current) speak(data.reply);
      }
    } catch (cause) {
      showError(cause);
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }

  function start(sc: (typeof scenarios)[number]) {
    if (lock.current) return;
    stopMic(); window.speechSynthesis?.cancel();
    setScenario(sc);
    setReplyTranslations({});
    setMessages([]);
    setError(null); setInput(""); setClarification(null); setPending(null);
    setFeedback(null);
    sendTo([], sc); // để AI mở lời
  }

  async function send() {
    if (!input.trim() || !scenario || lock.current || pending !== null || listening) return;
    const original = input.trim();
    lock.current = true; setTranslating(true); setError(null); setClarification(null);
    try {
      const data = await request("/api/roleplay-translate", { direction: "auto", text: original, scenario: scenario.en, context: messages.filter(m => m.role === "model").at(-1)?.text ?? "" });
      if (typeof data.assisted !== "boolean" || typeof data.explanation !== "string") throw new Error("Chưa đọc được phản hồi. Bản nháp vẫn được giữ; bạn thử lại nhé.");
      if (data.english === null && data.assisted && data.explanation.trim()) { setClarification(data.explanation); return; }
      if (typeof data.english !== "string" || !data.english.trim() || typeof data.reply !== "string" || !data.reply.trim() || (data.assisted && !data.explanation.trim())) throw new Error("AI chưa trả lời được. Bản nháp vẫn được giữ; bạn thử lại nhé.");
      const answer: Msg = { role: "user", text: data.assisted ? data.english : original, assisted: data.assisted, ...(data.assisted ? { originalVietnamese: original, explanation: data.explanation } : {}) };
      setMessages([...messages, answer, { role: "model", text: data.reply }]);
      setInput(""); setFeedback(null);
      if (playback.current) speak(data.reply);
    } catch (cause) { showError(cause); }
    finally { lock.current = false; setTranslating(false); }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Luyện giao tiếp mỗi ngày</p>
          <h1 className="font-display">Hội thoại với AI</h1>
          <p className={styles.intro}>Một tình huống quen thuộc. Một cuộc trò chuyện bằng tiếng Anh.</p>
        </div>
        <p className={styles.sessionNote}>Lịch sử chỉ giữ trong phiên này</p>
      </header>

      <div className={styles.workspace}>
        <section className={styles.scenarios} aria-labelledby="scenario-heading">
          <div className={styles.sectionHeading}><h2 id="scenario-heading">Chọn tình huống</h2><span>05</span></div>
          <div className={styles.scenarioList}>
            {scenarios.map(sc => (
              <button key={sc.id} disabled={busy} aria-pressed={scenario?.id === sc.id} aria-label={`${sc.icon} ${sc.label}`}
                onClick={() => start(sc)} className={styles.scenarioButton}>
                <span className={styles.scenarioIcon} aria-hidden="true">{sc.icon}</span>
                <span><strong>{sc.label}</strong><small>{sc.description}</small></span>
                <span className={styles.scenarioArrow} aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <p className={styles.scenarioNote}>Đổi tình huống sẽ bắt đầu cuộc trò chuyện mới.</p>
        </section>

        <section className={styles.conversation} aria-label="Khung hội thoại">
          <header className={styles.chatHeading}>
            <div className={styles.partner}>
              <span className={styles.partnerIcon} aria-hidden="true">{scenario?.icon ?? "💬"}</span>
              <div><h2>{scenario?.label ?? "Sẵn sàng trò chuyện?"}</h2><p>{scenario ? `Bạn đang nói với ${scenario.role.toLowerCase()}` : "Chọn một tình huống để bắt đầu"}</p></div>
            </div>
            <div className={styles.modeSwitch} aria-label="Chế độ hội thoại">
              <button onClick={() => switchMode("chat")} aria-pressed={mode === "chat"}>⌨️ Chat chữ</button>
              <button onClick={() => switchMode("voice")} aria-pressed={mode === "voice"}>🎤 Luyện nói</button>
            </div>
          </header>
          <div className={styles.chatSettings}>
            {mode === "chat" ? <p>Chế độ yên lặng · Bấm nút nghe để nghe câu AI.</p> :
              <label><input type="checkbox" checked={autoplay} onChange={event => { setAutoplay(event.target.checked); playback.current = event.target.checked; if (!event.target.checked) window.speechSynthesis?.cancel(); }} />Tự đọc câu trả lời của AI</label>}
            <span className={styles.turnCount}>{userTurns} lượt trả lời</span>
          </div>

          {!scenario ? <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">☕</span>
            <p className={styles.eyebrow}>Bắt đầu từ điều quen thuộc</p>
            <h3>Một ly cà phê,<br />một câu chuyện mới.</h3>
            <p>Thử gọi món bằng tiếng Anh. Cứ nói theo cách của bạn, AI sẽ tiếp tục cuộc trò chuyện.</p>
            <button className={styles.primaryButton} disabled={busy} onClick={() => start(scenarios[0])}>Bắt đầu tại quán cà phê <span aria-hidden="true">→</span></button>
            <small>Hoặc chọn một tình huống khác để luyện.</small>
          </div> : <>
            <div ref={scrollRef} role="log" aria-label="Lịch sử hội thoại" aria-live="polite" aria-busy={loading || translating} className={styles.messages} tabIndex={0}>
              {messages.map((m, i) => (
                <article key={i} className={`${styles.message} ${m.role === "user" ? styles.userMessage : styles.aiMessage}`}>
                  <p className={styles.messageAuthor}>{m.role === "user" ? "Bạn" : scenario.role}{m.assisted && <span>Có hỗ trợ dịch</span>}</p>
                  <div className={styles.bubble}>
                    <p lang="en">{m.text}</p>
                    {m.role === "model" && <>
                      <div className={styles.messageActions}>
                        <button type="button" disabled={busy || listening} aria-expanded={!!replyTranslations[i]?.text && replyTranslations[i].visible} aria-controls={`reply-translation-${i}`} onClick={() => translateReply(i)} aria-label={`${replyTranslations[i]?.text && replyTranslations[i].visible ? "Ẩn bản dịch" : "Dịch câu AI"} ${i + 1}`}>
                          {translatingReply === i ? "Đang dịch…" : replyTranslations[i]?.text && replyTranslations[i].visible ? "Ẩn bản dịch" : "Dịch câu này"}
                        </button>
                        <button onClick={() => speak(m.text)} disabled={listening} aria-label={`Nghe câu AI ${i + 1}`} title="Nghe lại phát âm">▶ Nghe lại</button>
                      </div>
                      <div id={`reply-translation-${i}`} aria-live="polite">
                        {replyTranslations[i]?.visible && (replyTranslations[i].text || replyTranslations[i].error) && <div className={styles.replyTranslation}>
                          {replyTranslations[i].text && <p lang="vi">{replyTranslations[i].text}</p>}
                          {replyTranslations[i].error && <p role="alert">{replyTranslations[i].error}</p>}
                        </div>}
                      </div>
                    </>}
                    {m.explanation && <div className={styles.explanation}><strong>Vì sao dùng câu này?</strong><p>{m.explanation}</p></div>}
                    {m.originalVietnamese && <details className={styles.originalText}><summary>Ý gốc tiếng Việt</summary><p lang="vi">{m.originalVietnamese}</p></details>}
                  </div>
                </article>
              ))}
              {(loading || translating) && <div role="status" className={styles.typing}><span aria-hidden="true">•••</span>{messages.length === 0 ? "AI đang mở đầu câu chuyện…" : "AI đang chuẩn bị câu trả lời…"}</div>}
            </div>

            <div className={styles.composer}>
              {error && <p role="alert" className={styles.error}>{error}</p>}
              {pending !== null && !busy && <div className={styles.retry}>
                <p>Chưa nhận được phản hồi. Thử lại để tiếp tục cuộc trò chuyện.</p>
                <button className={styles.secondaryButton} onClick={() => sendTo(pending, scenario)}>Thử lại phản hồi</button>
              </div>}
              {clarification && <div role="status" className={styles.clarification}><strong>Cần làm rõ ý</strong><p>{clarification}</p></div>}
              <div className={styles.draftLabel}><label htmlFor="english-draft">Câu trả lời của bạn</label><span>Tiếng Anh hoặc tiếng Việt</span></div>
              <div className={`${styles.draftBox} ${listening ? styles.recording : ""}`}>
                <textarea ref={inputRef} id="english-draft" rows={2} maxLength={2000} readOnly={listening || busy} value={input}
                  onChange={event => { setInput(event.target.value); setClarification(null); }}
                  onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }}
                  placeholder={listening ? "Đang nghe… nói tiếng Anh" : "Viết điều bạn muốn nói…"} />
                <div className={styles.draftActions}>
                  <span className={styles.inputHint}>{listening ? "Đang nghe · Bấm dừng để kiểm tra câu" : mode === "voice" ? "Bấm mic để nói bằng tiếng Anh" : "Enter để gửi · Shift + Enter xuống dòng"}</span>
                  {mode === "voice" && <button onClick={toggleMic} disabled={busy || pending !== null} aria-label={listening ? "Dừng mic" : "Bắt đầu nói"} className={`${styles.micButton} ${listening ? styles.micActive : ""}`}><span aria-hidden="true">{listening ? "■" : "🎤"}</span></button>}
                  <button onClick={send} disabled={!input.trim() || busy || listening || pending !== null} className={styles.primaryButton}>{translating ? "Đang xử lý…" : "Gửi"}<span aria-hidden="true">↑</span></button>
                </div>
              </div>
              <p className={styles.composerHint}>Chưa biết nói bằng tiếng Anh? Viết tiếng Việt, AI sẽ chuyển ý và giải thích khi bạn gửi.</p>
            </div>
          </>}
        </section>

        <aside className={styles.guide} aria-label="Gợi ý luyện tập">
          <div className={styles.sectionHeading}><h2>Thử trong cuộc trò chuyện</h2><span aria-hidden="true">↗</span></div>
          <ol className={styles.goals}>{activeScenario.goals.map((goal, index) => <li key={goal}><span>{String(index + 1).padStart(2, "0")}</span>{goal}</li>)}</ol>
          <details className={styles.phrase}><summary>Một cách mở lời</summary><p lang="en">“{activeScenario.phrase}”</p><small>{activeScenario.meaning}</small></details>
          <div className={styles.sessionSummary}>
            <h3>Buổi luyện của bạn</h3>
            <p>{independentTurns} câu tự diễn đạt · {userTurns - independentTurns} câu có hỗ trợ dịch</p>
            <button onClick={getFeedback} disabled={!scenario || busy || !independentTurns || pending !== null || listening} className={styles.secondaryButton}>{scoring ? "Đang chấm…" : "⭐ Nhận xét hội thoại"}</button>
            <small>{independentTurns ? "Nhận xét trên các câu bạn tự diễn đạt, không chấm phát âm." : "Tự diễn đạt ít nhất một câu để nhận xét cách dùng từ và ngữ pháp."}</small>
          </div>
        </aside>
      </div>

      {feedback && <section ref={feedbackRef} className={styles.feedback} aria-label="Nhận xét cách diễn đạt">
        {feedback.error ? <p role="alert">{feedback.error === "no_independent_turns" ? "Các câu gần đây đều có hỗ trợ dịch. Hãy thử tự diễn đạt một câu để nhận xét." : "Chưa nhận xét được, bạn thử lại sau nhé."}</p> : <>
          <header className={styles.feedbackHeading}><span className={styles.score}>{feedback.score ?? "–"}<small>/100</small></span><div><h2>Nhận xét cách diễn đạt</h2><p>{feedback.fluency || "Dựa trên các câu bạn tự diễn đạt trong cuộc trò chuyện."}</p><small>Tham khảo trên mẫu hội thoại, không phải điểm phát âm hoặc kết quả xếp lớp.</small></div></header>
          <div className={styles.feedbackGrid}>
            {Array.isArray(feedback.strengths) && feedback.strengths.length > 0 && <div><h3>Điểm tốt</h3><ul>{feedback.strengths.map((strength: string, i: number) => <li key={i}>{strength}</li>)}</ul></div>}
            {Array.isArray(feedback.corrections) && feedback.corrections.length > 0 && <div><h3>Cùng sửa một chút</h3>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {feedback.corrections.filter((c: any) => typeof c?.original === "string" && typeof c.better === "string" && typeof c.why === "string" && messages.some(m => m.role === "user" && !m.assisted && m.text.includes(c.original))).map((c: any, i: number) => <div key={i} className={styles.correction}><del>{c.original}</del><p lang="en">{c.better}</p><small>{c.why}</small></div>)}
            </div>}
            {Array.isArray(feedback.vocab) && feedback.vocab.length > 0 && <div><h3>Cụm từ nên thử</h3><ul>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {feedback.vocab.map((v: any, i: number) => <li key={i}><strong lang="en">{v.phrase}</strong>{v.vi ? ` — ${v.vi}` : ""}</li>)}
            </ul></div>}
          </div>
          {feedback.tip && <p className={styles.feedbackTip}>{feedback.tip}</p>}
        </>}
      </section>}
    </div>
  );
}
