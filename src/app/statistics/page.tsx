"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/lib/auth";
import {
  loadDashboard,
  loadActivityTimeline,
  type DashboardStats,
  type ActivityDay,
} from "@/lib/statsRepo";
import { listShadowScores } from "@/lib/shadowingRepo";
import { shadowItems } from "@/lib/content";

const TEAL = "var(--primary)";

// Thẻ kính frosted tối giản — đồng bộ với Bảng điều khiển & Nhiệm vụ hôm nay.
const GLASS =
  "rounded-3xl border border-white/60 bg-white/55 shadow-[0_10px_40px_-14px_rgba(70,70,110,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none";

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[120px] flex-1 rounded-2xl border border-border/50 bg-white/45 px-5 py-4 backdrop-blur-md dark:bg-white/5">
      <span className="font-display text-3xl font-black tracking-tight text-foreground">{value}</span>
      <p className="mt-1.5 text-[9px] font-black uppercase tracking-wider text-muted leading-tight">{label}</p>
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
    <div className="rounded-2xl border border-border/50 bg-white/40 p-5 backdrop-blur-md dark:bg-white/5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-sm font-extrabold text-foreground">
          <span className="text-lg">{emoji}</span> {name}
        </h3>
        <span className="rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
          {tag}
        </span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {rows.map((r) => (
          <div key={r.k} className="min-w-[88px] flex-1 rounded-xl border border-border/40 bg-white/40 px-3 py-2 text-center dark:bg-black/20">
            <p className="font-display text-base font-black tracking-tight text-foreground">{r.v}</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-muted">{r.k}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const { userId, ready } = useAuth();
  const [tab, setTab] = useState<"day" | "all">("day");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [timeline, setTimeline] = useState<ActivityDay[]>([]);
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(14);
  const [metric, setMetric] = useState<"reviews" | "pron">("reviews");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    const today = new Date().toISOString().slice(0, 10);
    // Tải sẵn 30 ngày, cắt theo khoảng đang chọn ở client (không query lại).
    Promise.all([loadDashboard(today), listShadowScores(), loadActivityTimeline(today, 30)])
      .then(([d, s, t]) => {
        if (!active) return;
        setStats(d);
        setScores(s);
        setTimeline(t);
      })
      .catch((e) => console.error("statistics", e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, userId]);

  const shownTimeline = useMemo(() => timeline.slice(-rangeDays), [timeline, rangeDays]);
  const totalReviews = useMemo(() => shownTimeline.reduce((n, d) => n + d.reviews, 0), [shownTimeline]);
  const activeDays = useMemo(() => shownTimeline.filter((d) => d.reviews > 0 || d.journaled).length, [shownTimeline]);
  const pronDays = useMemo(() => shownTimeline.filter((d) => d.shadowAvg != null), [shownTimeline]);
  const pronAvg = useMemo(
    () => (pronDays.length ? Math.round(pronDays.reduce((n, d) => n + (d.shadowAvg ?? 0), 0) / pronDays.length) : null),
    [pronDays],
  );

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
          <div className={`${GLASS} flex flex-col items-center gap-5 p-10 text-center`}>
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
        <div className="space-y-8">
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Cột trái: số liệu (7 cols) */}
          <div className={`${GLASS} p-6 sm:p-8 lg:col-span-7 space-y-6`}>
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
          <div className={`${GLASS} flex flex-col p-6 sm:p-8 lg:col-span-5 min-h-[420px]`}>
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

        {/* Dòng thời gian hoạt động 14 ngày gần nhất (dữ liệu thật) */}
        <div className={`${GLASS} p-6 sm:p-8`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-lg sm:text-xl font-black text-foreground tracking-tight">
                Hoạt động {rangeDays} ngày gần đây
              </h3>
              <p className="mt-1 text-xs font-semibold text-muted">
                {metric === "reviews"
                  ? "Số lần ôn tập mỗi ngày · chấm 📓 = ngày có viết nhật ký"
                  : "Điểm phát âm trung bình mỗi ngày (Shadowing) · thang 0–100"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="inline-flex rounded-full bg-white/40 dark:bg-black/35 border border-border/70 p-1 shadow-sm">
                  {([7, 14, 30] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setRangeDays(d)}
                      className={`rounded-full px-3.5 py-1 text-[11px] font-black tracking-wide transition-all duration-300 active:scale-95 cursor-pointer ${
                        rangeDays === d ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {d} ngày
                    </button>
                  ))}
                </div>
                <div className="inline-flex rounded-full bg-white/40 dark:bg-black/35 border border-border/70 p-1 shadow-sm">
                  {([
                    { k: "reviews", label: "Lượt ôn" },
                    { k: "pron", label: "Phát âm" },
                  ] as const).map((m) => (
                    <button
                      key={m.k}
                      onClick={() => setMetric(m.k)}
                      className={`rounded-full px-3.5 py-1 text-[11px] font-black tracking-wide transition-all duration-300 active:scale-95 cursor-pointer ${
                        metric === m.k ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="rounded-2xl border border-border/60 bg-white/40 dark:bg-white/5 px-4 py-2 text-center shadow-sm">
                <p className="text-lg font-black text-primary leading-none">{totalReviews}</p>
                <p className="text-[8.5px] font-black uppercase tracking-wider text-muted mt-1">Lượt ôn</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-white/40 dark:bg-white/5 px-4 py-2 text-center shadow-sm">
                {metric === "reviews" ? (
                  <>
                    <p className="text-lg font-black text-accent leading-none">{activeDays}</p>
                    <p className="text-[8.5px] font-black uppercase tracking-wider text-muted mt-1">Ngày học</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-black text-accent leading-none">{pronAvg != null ? `${pronAvg}đ` : "—"}</p>
                    <p className="text-[8.5px] font-black uppercase tracking-wider text-muted mt-1">Phát âm TB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {(metric === "reviews" ? totalReviews === 0 && activeDays === 0 : pronDays.length === 0) ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <span className="text-5xl animate-pulse">{metric === "reviews" ? "📈" : "🎤"}</span>
              <p className="font-semibold text-muted text-xs sm:text-sm max-w-xs leading-relaxed">
                {metric === "reviews" ? (
                  <>
                    Chưa có hoạt động trong {rangeDays} ngày qua — hãy{" "}
                    <Link href="/review" className="text-primary hover:underline font-bold">
                      ôn tập
                    </Link>{" "}
                    vài thẻ để bắt đầu vẽ biểu đồ tiến bộ.
                  </>
                ) : (
                  <>
                    Chưa có điểm phát âm trong {rangeDays} ngày qua — hãy luyện{" "}
                    <Link href="/shadowing" className="text-primary hover:underline font-bold">
                      Shadowing
                    </Link>{" "}
                    để theo dõi tiến bộ phát âm.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="mt-6 h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {metric === "reviews" ? (
                  <BarChart data={shownTimeline} margin={{ top: 16, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={16} tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "var(--primary)", opacity: 0.06 }}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        backdropFilter: "blur(16px)",
                        fontSize: "12px",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                      }}
                      formatter={(v) => [`${v} lượt`, "Ôn tập"]}
                      labelFormatter={(l, p) => {
                        const d = p?.[0]?.payload as ActivityDay | undefined;
                        return d?.journaled ? `Ngày ${l} · 📓 có nhật ký` : `Ngày ${l}`;
                      }}
                    />
                    <Bar dataKey="reviews" fill={TEAL} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                ) : (
                  <LineChart data={shownTimeline} margin={{ top: 16, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={16} tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: "bold" }} axisLine={false} tickLine={false} />
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
                      formatter={(v) => [`${v} điểm`, "Phát âm TB"]}
                      labelFormatter={(l) => `Ngày ${l}`}
                    />
                    <Line type="monotone" dataKey="shadowAvg" stroke={TEAL} strokeWidth={3} connectNulls dot={{ r: 4, fill: TEAL, strokeWidth: 1 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
        </div>
      )}
    </main>
  );
}
