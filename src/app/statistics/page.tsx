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

const TEAL = "#2b788b";

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-4xl text-foreground">{value}</span>
      <span className="mt-1 text-sm font-semibold text-muted">{label}</span>
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
    <div className="flex items-start gap-4 border-t border-border pt-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-2xl">
        {emoji}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-xl text-foreground">{name}</h3>
          <span className="rounded-full bg-pink-soft px-2.5 py-0.5 text-[10px] font-bold text-pink">
            {tag}
          </span>
        </div>
        <div className="mt-1.5 space-y-0.5">
          {rows.map((r) => (
            <p key={r.k} className="text-sm font-medium text-muted">
              <span className="font-bold text-foreground">{r.v}</span> {r.k}
            </p>
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
    { value: String(stats?.dueToday ?? 0), label: "thẻ đến hạn hôm nay" },
    { value: stats?.journalToday ? "✓" : "—", label: "nhật ký hôm nay" },
  ];
  const allHead = [
    { value: String(wordsStudied), label: "từ đã học (hiểu)" },
    { value: `${correctPct}%`, label: "đã nói được" },
  ];
  const head = tab === "day" ? dayHead : allHead;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 pt-16 animate-fadeIn">
      {/* Tabs */}
      <div className="mb-10 flex items-center justify-center gap-8">
        {(
          [
            { k: "day", label: "Hôm nay" },
            { k: "all", label: "Toàn thời gian" },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`relative pb-2 font-display text-2xl transition-colors ${
              tab === t.k ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            {tab === t.k && (
              <span className="absolute inset-x-0 -bottom-0.5 h-1 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {!ready || loading ? (
        <p className="py-20 text-center font-semibold text-muted">Đang tải thống kê…</p>
      ) : !userId ? (
        // Empty / auth state (theo design "Sorry, statistics not available")
        <div className="mx-auto max-w-xl">
          <div className="liquid-glass-card flex flex-col items-center gap-4 p-10 text-center">
            <span className="text-6xl">📊</span>
            <h2 className="font-display text-2xl text-foreground">Chưa có thống kê 😕</h2>
            <p className="max-w-sm font-medium text-muted">
              Hãy bắt đầu học để theo dõi tiến độ và lưu kết quả của bạn.
            </p>
            <Link href="/today" className="liquid-glass-btn px-6 py-3 text-sm font-bold">
              Bắt đầu học →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Cột trái: số liệu */}
          <div className="liquid-glass-card p-8">
            <h2 className="font-display text-3xl text-foreground">
              {tab === "day" ? "Thống kê hôm nay" : "Thống kê tổng"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted">
              Tổng hợp trên mọi hoạt động học
            </p>
            <div className="mt-6 flex gap-12">
              {head.map((h) => (
                <StatBlock key={h.label} value={h.value} label={h.label} />
              ))}
            </div>
            <div className="mt-8 space-y-5">
              <ActivityRow
                emoji="📒"
                name="Ôn tập"
                tag="SRS"
                rows={[
                  { v: String(stats?.inReview ?? 0), k: "cụm đang ôn" },
                  { v: String(stats?.recognized ?? 0), k: "cụm đã hiểu" },
                  { v: String(stats?.mastered ?? 0), k: "cụm đã nói được" },
                ]}
              />
              <ActivityRow
                emoji="🎧"
                name="Shadowing"
                tag="phát âm"
                rows={[
                  { v: String(stats?.shadowDone ?? 0), k: "câu đã luyện" },
                  {
                    v: stats?.shadowAvg != null ? String(stats.shadowAvg) : "—",
                    k: "điểm phát âm trung bình",
                  },
                ]}
              />
            </div>
          </div>

          {/* Cột phải: biểu đồ */}
          <div className="liquid-glass-card flex flex-col p-8">
            <h3 className="font-display text-xl text-foreground">Điểm phát âm theo câu</h3>
            <p className="mt-1 mb-4 text-sm font-semibold text-muted">
              Theo dõi điểm shadowing của từng câu
            </p>
            {chartData.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
                <span className="text-5xl">🎤</span>
                <p className="font-semibold text-muted">
                  Chưa có dữ liệu — luyện{" "}
                  <Link href="/shadowing" className="text-primary underline">
                    Shadowing
                  </Link>{" "}
                  để xem biểu đồ.
                </p>
              </div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        fontSize: 12,
                      }}
                      formatter={(v) => [`${v} điểm`, "Phát âm"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={TEAL}
                      strokeWidth={3}
                      dot={{ r: 4, fill: TEAL }}
                      activeDot={{ r: 6 }}
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
