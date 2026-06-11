"use client";

import { useMemo, useState } from "react";

// Collocation Matching (theo Lexical Approach trong doc): ghép ĐỘNG TỪ với TÂN NGỮ đi kèm tự nhiên.
// Mỗi vòng 5 cụm có ĐỘNG TỪ khác nhau → cột trái (head) ghép với cột phải (tail).

type Col = { head: string; tail: string; vi: string };

const POOL: Col[] = [
  { head: "make", tail: "a decision", vi: "đưa ra quyết định" },
  { head: "make", tail: "a mistake", vi: "phạm sai lầm" },
  { head: "make", tail: "friends", vi: "kết bạn" },
  { head: "take", tail: "a break", vi: "nghỉ giải lao" },
  { head: "take", tail: "a photo", vi: "chụp ảnh" },
  { head: "take", tail: "care", vi: "chăm sóc / giữ gìn" },
  { head: "have", tail: "breakfast", vi: "ăn sáng" },
  { head: "have", tail: "a rest", vi: "nghỉ ngơi" },
  { head: "have", tail: "fun", vi: "vui chơi" },
  { head: "do", tail: "homework", vi: "làm bài tập" },
  { head: "do", tail: "the dishes", vi: "rửa bát" },
  { head: "do", tail: "exercise", vi: "tập thể dục" },
  { head: "pay", tail: "attention", vi: "chú ý" },
  { head: "pay", tail: "the bill", vi: "thanh toán hoá đơn" },
  { head: "give", tail: "a hand", vi: "giúp một tay" },
  { head: "give", tail: "advice", vi: "cho lời khuyên" },
  { head: "keep", tail: "a secret", vi: "giữ bí mật" },
  { head: "keep", tail: "calm", vi: "giữ bình tĩnh" },
  { head: "catch", tail: "a cold", vi: "bị cảm" },
  { head: "save", tail: "money", vi: "tiết kiệm tiền" },
];

const ROUND_SIZE = 5;

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// Chọn ROUND_SIZE cụm có ĐỘNG TỪ khác nhau để cột trái không trùng.
function pickRound(): Col[] {
  const byHead = new Map<string, Col[]>();
  for (const c of POOL) {
    if (!byHead.has(c.head)) byHead.set(c.head, []);
    byHead.get(c.head)!.push(c);
  }
  const heads = shuffle([...byHead.keys()]).slice(0, ROUND_SIZE);
  return heads.map((h) => {
    const list = byHead.get(h)!;
    return list[Math.floor(Math.random() * list.length)];
  });
}

export default function CollocationGame() {
  const [phase, setPhase] = useState<"welcome" | "playing">("welcome");
  const [round, setRound] = useState<Col[]>([]);
  const [tails, setTails] = useState<Col[]>([]);
  const [selHead, setSelHead] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongTail, setWrongTail] = useState<string | null>(null);
  const [roundNo, setRoundNo] = useState(1);
  const [score, setScore] = useState(0);

  function newRound(first = false) {
    const r = pickRound();
    setRound(r);
    setTails(shuffle(r));
    setSelHead(null);
    setMatched(new Set());
    setWrongTail(null);
    if (!first) setRoundNo((n) => n + 1);
  }

  function start() {
    setScore(0);
    setRoundNo(1);
    setPhase("playing");
    newRound(true);
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  function clickTail(tail: string) {
    if (!selHead || matched.has(selHead)) return;
    const pair = round.find((c) => c.head === selHead);
    if (pair && pair.tail === tail) {
      const m = new Set(matched).add(selHead);
      setMatched(m);
      setScore((s) => s + 10);
      speak(`${pair.head} ${pair.tail}`);
      setSelHead(null);
      setWrongTail(null);
    } else {
      setWrongTail(tail);
      setTimeout(() => setWrongTail(null), 500);
    }
  }

  const allMatched = round.length > 0 && matched.size === round.length;
  const matchedTails = useMemo(
    () => new Set(round.filter((c) => matched.has(c.head)).map((c) => c.tail)),
    [round, matched],
  );

  return (
    <div className="mx-auto max-w-2xl px-2">
      {phase === "welcome" && (
        <div className="liquid-glass-card flex flex-col items-center gap-7 p-8 text-center md:p-12 border border-border/80 shadow-2xl bg-white/20 dark:bg-black/20 backdrop-blur-md animate-fadeIn">
          <span className="text-6xl animate-bounce">🧩</span>
          <div className="space-y-2.5">
            <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
              ⚡ MINI-GAME GHÉP CỤM
            </span>
            <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl leading-none mt-2 w-full">Ghép cụm từ</h2>
            <p className="mx-auto max-w-md text-xs sm:text-sm font-semibold leading-relaxed text-muted mt-2">
              Ghép động từ (Head) bên trái với tân ngữ đi kèm (Tail) bên phải để tạo cụm Collocation tự nhiên. Học theo cụm giúp bạn phản xạ nhanh hơn ghép từng từ đơn!
            </p>
          </div>
          {/* Cách chơi — hướng dẫn nhanh cho lần đầu */}
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background/40 p-4 text-left">
            <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-muted">📖 Cách chơi</p>
            <ul className="space-y-1.5 text-xs font-semibold text-foreground/85 leading-relaxed">
              <li>1️⃣ Chọn một <b>động từ</b> ở cột trái (ví dụ: <i>make</i>).</li>
              <li>2️⃣ Chọn <b>từ đi kèm</b> đúng ở cột phải (<i>a decision</i> ✓, không phải <i>a photo</i>).</li>
              <li>3️⃣ Ghép đúng <b>+10 điểm</b> và nghe phát âm cả cụm; ghép đủ 5 cặp để sang vòng mới.</li>
            </ul>
          </div>

          <button onClick={start} className="liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider shadow-md">
            Bắt đầu ghép
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div className="liquid-glass-card p-6 md:p-8 border border-border/80 shadow-2xl bg-white/20 dark:bg-black/20 backdrop-blur-md animate-fadeIn">
          <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-muted">Vòng thi {roundNo}</span>
            <span className="rounded-full bg-primary-soft border border-primary/20 px-3.5 py-1 text-xs font-black text-primary shadow-sm">{score} điểm</span>
          </div>

          <p className="mb-5 text-center text-xs font-semibold text-muted">
            Bấm chọn động từ bên trái, sau đó bấm chọn tân ngữ tương thích bên phải.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Cột động từ (head) */}
            <div className="space-y-3">
              {round.map((c) => {
                const done = matched.has(c.head);
                const sel = selHead === c.head;
                return (
                  <button
                    key={c.head}
                    disabled={done}
                    onClick={() => setSelHead(c.head)}
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-sm ${
                      done
                        ? "border-primary/20 bg-primary-soft/40 text-primary/60 cursor-default"
                        : sel
                          ? "border-primary bg-primary text-primary-fg shadow-md scale-102"
                          : "border-border/60 bg-surface/50 text-foreground hover:border-primary/50 hover:scale-[1.02]"
                    }`}
                  >
                    {c.head}
                  </button>
                );
              })}
            </div>

            {/* Cột tân ngữ (tail) */}
            <div className="space-y-3">
              {tails.map((c) => {
                const done = matchedTails.has(c.tail);
                const wrong = wrongTail === c.tail;
                return (
                  <button
                    key={c.tail}
                    disabled={done}
                    onClick={() => clickTail(c.tail)}
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-black transition-all duration-300 cursor-pointer shadow-sm ${
                      done
                        ? "border-primary/20 bg-primary-soft/40 text-primary/60 cursor-default"
                        : wrong
                          ? "border-pink bg-pink-soft text-pink animate-bounce shadow-md"
                          : "border-border/60 bg-surface/50 text-foreground hover:border-primary/50 hover:scale-[1.02]"
                    }`}
                  >
                    {c.tail}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Danh sách cụm đã ghép (kèm nghĩa) */}
          {matched.size > 0 && (
            <div className="mt-6 space-y-2 border-t border-border/40 pt-4.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted mb-2">Các cụm đã ghép thành công:</p>
              {round
                .filter((c) => matched.has(c.head))
                .map((c) => (
                  <div key={c.head} className="flex items-center gap-2 bg-background/50 border border-border px-3.5 py-2.5 rounded-xl shadow-sm animate-fadeIn">
                    <button onClick={() => speak(`${c.head} ${c.tail}`)} className="text-xs font-black text-primary hover:underline flex items-center gap-1 cursor-pointer">
                      🔊 {c.head} {c.tail}
                    </button>
                    <span className="text-xs font-semibold text-muted"> — {c.vi}</span>
                  </div>
                ))}
            </div>
          )}

          {allMatched && (
            <div className="mt-8 flex animate-fadeIn flex-col items-center gap-3.5">
              <p className="font-display text-base font-extrabold text-primary flex items-center gap-1">✓ Đã ghép xong tất cả cụm từ vòng {roundNo}!</p>
              <button onClick={() => newRound()} className="liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider shadow-md">
                Sang vòng sau →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
