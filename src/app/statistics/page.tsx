"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { loadDashboard, type DashboardStats } from "@/lib/statsRepo";
import { listShadowScores } from "@/lib/shadowingRepo";
import { shadowItems } from "@/lib/content";

const TEAL = "var(--primary)";

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col bg-white/30 dark:bg-black/20 border border-border/80 p-5 rounded-2xl shadow-sm min-w-[130px] relative overflow-hidden flex-1 transition-all duration-300 hover:scale-[1.02]">
      <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full filter blur-md pointer-events-none" />
      <span className="font-display text-4xl font-black text-foreground tracking-tight">{value}</span>
      <span className="mt-2 text-[9px] font-black uppercase tracking-wider text-muted leading-tight">{label}</span>
    </div>
  );
}

function ActivityRow({
  emoji,
  name,
  tag,
  rows,
}: {
  emoji: string;
  name: string;
  tag: string;
  rows: { k: string; v: string }[];
}) {
  return (
    <div className="flex items-start gap-4 bg-white/20 dark:bg-black/10 border border-border/85 p-5 rounded-2xl shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft border border-primary/10 text-2xl shadow-sm">
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 mb-3">
          <h3 className="font-display text-base font-extrabold text-foreground">{name}</h3>
          <span className="rounded-full bg-pink-soft/80 border border-pink/20 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-pink shadow-sm">
            {tag}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {rows.map((r) => (
            <div key={r.k} className="bg-white/40 dark:bg-slate-900/30 border border-border/80 px-3.5 py-2 rounded-xl text-center shadow-inner">
              <p className="text-base font-black text-foreground tracking-tight">{r.v}</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-muted mt-0.5">{r.k}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const { userId, ready } = useAuth();
  const [tab, setTab] = useState<"day" | "all">("day");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([loadDashboard(today), listShadowScores()])
      .then(([d, s]) => {
        if (!active) return;
        setStats(d);
        setScores(s);
      })
      .catch((e) => console.error("statistics", e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, userId]);

  // Dữ liệu biểu đồ: điểm phát âm theo từng câu shadowing (dữ liệu thật).
  const chartData = useMemo(
    () =>
      shadowItems
        .map((it, i) => ({
          name: `#${i + 1}`,
          en: it.en,
          score: scores[it.id] ?? null,
        }))
        .filter((d) => d.score != null),
    [scores],
  );

  const wordsStudied = stats?.recognized ?? 0;
  const correctPct =
    stats && stats.recognized > 0
      ? Math.round((stats.mastered / stats.recognized) * 100)
      : 0;

  const dayHead = [
    { value: String(stats?.dueToday ?? 0), label: "Thẻ đến hạn hôm nay" },
    { value: stats?.journalToday ? "✓" : "—", label: "Nhật ký hôm nay" },
  ];
  const allHead = [
    { value: String(wordsStudied), label: "Từ đã học (hiểu)" },
    { value: `${correctPct}%`, label: "Đã phát âm đạt" },
  ];
  const head = tab === "day" ? dayHead : allHead;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 pt-24 animate-fadeIn relative">
      {/* Background radial highlight */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />

      {/* Tabs */}
      <div className="mb-12 flex justify-center">
        <div className="inline-flex rounded-full bg-white/40 dark:bg-black/35 border border-border/80 p-1.5 shadow-sm backdrop-blur-md">
          {(
            [
              { k: "day", label: "Hôm nay" },
              { k: "all", label: "Toàn thời gian" },
            ] as const
          ).map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`rounded-full px-6 py-2.5 font-display text-sm font-bold tracking-wide transition-all duration-300 active:scale-95 cursor-pointer ${
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {!ready || loading ? (
        <div className="py-24 text-center">
          <span className="inline-block animate-spin text-3xl text-primary">⏳</span>
          <p className="mt-4 font-semibold text-muted text-sm">Đang tải thống kê…</p>
        </div>
      ) : !userId ? (
        <div className="mx-auto max-w-xl">
          <div className="liquid-glass-card flex flex-col items-center gap-5 p-10 text-center relative overflow-hidden border border-border/80 shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-xl pointer-events-none" />
            <span className="text-6xl animate-bounce">📊</span>
            <h2 className="font-display text-2xl font-black text-foreground">Chưa có thống kê 😕</h2>
            <p className="max-w-sm font-semibold text-muted text-xs sm:text-sm leading-relaxed">
              Hãy bắt đầu chặng đường học tập của bạn để theo dõi tiến độ và lưu trữ kết quả nhé.
            </p>
            <Link href="/today" className="liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider shadow-lg active:scale-95">
              Bắt đầu học ngay →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Cột trái: số liệu (7 cols) */}
          <div className="liquid-glass-card p-6 sm:p-8 border border-border/80 shadow-xl lg:col-span-7 space-y-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {tab === "day" ? "Thống kê hôm nay" : "Thống kê tổng quan"}
              </h2>
              <p className="mt-1 text-xs font-semibold text-muted">
                Tổng hợp thông tin học tập trên mọi phương diện hoạt động
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4 pt-2">
              {head.map((h) => (
                <StatBlock key={h.label} value={h.value} label={h.label} />
              ))}
            </div>

            <div className="pt-4 border-t border-border/40 space-y-5">
              <ActivityRow
                emoji="📒"
                name="Ôn tập từ & câu"
                tag="Hệ SRS"
                rows={[
                  { v: String(stats?.inReview ?? 0), k: "cụm đang ôn" },
                  { v: String(stats?.recognized ?? 0), k: "cụm đã hiểu" },
                  { v: String(stats?.mastered ?? 0), k: "cụm đạt yêu cầu" },
                ]}
              />
              <ActivityRow
                emoji="🎧"
                name="Shadowing (Nhại giọng)"
                tag="Kỹ năng nói"
                rows={[
                  { v: String(stats?.shadowDone ?? 0), k: "câu đã học" },
                  {
                    v: stats?.shadowAvg != null ? `${stats.shadowAvg}đ` : "—",
                    k: "điểm phát âm TB",
                  },
                ]}
              />
            </div>
          </div>

          {/* Cột phải: biểu đồ (5 cols) */}
          <div className="liquid-glass-card flex flex-col p-6 sm:p-8 border border-border/80 shadow-xl lg:col-span-5 min-h-[420px]">
            <div>
              <h3 className="font-display text-lg sm:text-xl font-black text-foreground tracking-tight">Điểm phát âm</h3>
              <p className="mt-1 mb-6 text-xs font-semibold text-muted">
                Theo dõi kết quả luyện nói shadowing của từng câu
              </p>
            </div>
            {chartData.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="text-5xl animate-pulse">🎤</span>
                <p className="font-semibold text-muted text-xs sm:text-sm max-w-xs leading-relaxed">
                  Chưa có dữ liệu thống kê — hãy bắt đầu luyện{" "}
                  <Link href="/shadowing" className="text-primary hover:underline font-bold">
                    Shadowing
                  </Link>{" "}
                  để cập nhật biểu đồ tại đây.
                </p>
              </div>
            ) : (
              <div className="h-[300px] w-full flex-1 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        backdropFilter: "blur(16px)",
                        fontSize: "12px",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                      }}
                      formatter={(v) => [`${v} điểm`, "Phát âm"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={TEAL}
                      strokeWidth={3}
                      dot={{ r: 4, fill: TEAL, strokeWidth: 1 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
