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
        <div className="liquid-glass-card flex flex-col items-center gap-6 p-8 text-center md:p-12">
          <span className="text-6xl">🧩</span>
          <div className="space-y-2">
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">Ghép cụm</h2>
            <p className="mx-auto max-w-md text-sm font-medium leading-relaxed text-muted">
              Ghép động từ với tân ngữ đi kèm tự nhiên (make → a decision, take → a break…).
              Học theo cụm giúp nói trôi chảy hơn là ghép từng từ.
            </p>
          </div>
          <button onClick={start} className="liquid-glass-btn px-8 py-3.5 text-sm font-bold">
            Bắt đầu ghép →
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div className="liquid-glass-card p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-bold text-muted">Vòng {roundNo}</span>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{score} điểm</span>
          </div>

          <p className="mb-4 text-center text-xs font-semibold text-muted">
            Chọn một động từ bên trái, rồi chọn tân ngữ phù hợp bên phải.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Cột động từ (head) */}
            <div className="space-y-2.5">
              {round.map((c) => {
                const done = matched.has(c.head);
                const sel = selHead === c.head;
                return (
                  <button
                    key={c.head}
                    disabled={done}
                    onClick={() => setSelHead(c.head)}
                    className={`w-full rounded-2xl border-2 px-4 py-3 text-sm font-bold transition-all ${
                      done
                        ? "border-primary bg-primary-soft text-primary opacity-60"
                        : sel
                          ? "border-primary bg-primary text-white shadow-md scale-[1.02]"
                          : "border-border bg-surface text-foreground hover:border-primary/50"
                    }`}
                  >
                    {c.head}
                  </button>
                );
              })}
            </div>

            {/* Cột tân ngữ (tail) */}
            <div className="space-y-2.5">
              {tails.map((c) => {
                const done = matchedTails.has(c.tail);
                const wrong = wrongTail === c.tail;
                return (
                  <button
                    key={c.tail}
                    disabled={done}
                    onClick={() => clickTail(c.tail)}
                    className={`w-full rounded-2xl border-2 px-4 py-3 text-sm font-bold transition-all ${
                      done
                        ? "border-primary bg-primary-soft text-primary opacity-60"
                        : wrong
                          ? "border-pink bg-pink-soft text-pink animate-bounce"
                          : "border-border bg-surface text-foreground hover:border-primary/50"
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
            <div className="mt-5 space-y-1.5 border-t border-border pt-4">
              {round
                .filter((c) => matched.has(c.head))
                .map((c) => (
                  <p key={c.head} className="text-sm">
                    <button onClick={() => speak(`${c.head} ${c.tail}`)} className="font-bold text-primary hover:underline">
                      🔊 {c.head} {c.tail}
                    </button>
                    <span className="text-muted"> — {c.vi}</span>
                  </p>
                ))}
            </div>
          )}

          {allMatched && (
            <div className="mt-6 flex animate-fadeIn flex-col items-center gap-3">
              <p className="font-display text-lg text-primary">✓ Hoàn thành vòng {roundNo}!</p>
              <button onClick={() => newRound()} className="liquid-glass-btn px-8 py-3 text-sm font-bold">
                Vòng tiếp theo →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
