"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { loadDashboard, loadActivityTimeline, type DashboardStats, type ActivityDay } from "@/lib/statsRepo";
import { lessonContent } from "@/lib/lessons";
import ProgressRing from "@/components/ProgressRing";

// Tổng số cụm trong toàn bộ lộ trình — mốc để tính "Vốn từ".
const TOTAL_PHRASES = Object.values(lessonContent).reduce((n, l) => n + l.phrases.length, 0);

// Màu pastel cho 3 vòng (mint / peach / lavender như mẫu).
const MINT = "#34D399";
const PEACH = "#FB923C";
const LAVENDER = "#A78BFA";

export default function DashboardPage() {
  const today = todayKey();
  const { userId, ready } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [week, setWeek] = useState<ActivityDay[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!userId) { setLoaded(true); return; }
    let active = true;
    Promise.all([loadDashboard(today), loadActivityTimeline(today, 7)])
      .then(([s, w]) => {
        if (!active) return;
        setStats(s);
        setWeek(w);
      })
      .catch((e) => console.error("dashboard", e))
      .finally(() => { if (active) setLoaded(true); });
    return () => {
      active = false;
    };
  }, [ready, userId, today]);

  // 3 chỉ số THẬT (0..100).
  const noiDuoc = stats && stats.recognized > 0 ? Math.round((stats.mastered / stats.recognized) * 100) : 0;
  const phatAm = stats?.shadowAvg ?? 0;
  const vonTu = stats ? Math.min(100, Math.round((stats.recognized / Math.max(1, TOTAL_PHRASES)) * 100)) : 0;

  const rings = [
    {
      label: "Nói được",
      subLabel: "Presentation Confidence",
      value: noiDuoc,
      color: MINT,
      note: stats ? `${stats.mastered}/${stats.recognized} cụm` : "",
    },
    {
      label: "Phát âm",
      subLabel: "Clarity & Pace",
      value: phatAm,
      color: PEACH,
      note: stats?.shadowAvg != null ? `TB ${stats.shadowAvg}đ` : "chưa có",
    },
    {
      label: "Vốn từ",
      subLabel: "Vocabulary Richness",
      value: vonTu,
      color: LAVENDER,
      note: stats ? `${stats.recognized}/${TOTAL_PHRASES} cụm` : "",
    },
  ];

  const maxWeek = useMemo(() => Math.max(1, ...week.map((d) => d.reviews)), [week]);

  // Gợi ý động dựa trên chỉ số thấp nhất.
  const insight = (() => {
    const min = Math.min(noiDuoc, phatAm, vonTu);
    if (min === phatAm) return "Luyện Shadowing để cải thiện phát âm.";
    if (min === noiDuoc) return "Ôn tập để chuyển 'hiểu' thành 'nói được'.";
    return "Học thêm cụm mới ở Từ vựng.";
  })();

  // Việc cần làm hôm nay.
  const tasks = stats
    ? [
        { href: "/review", title: "Ôn tập SRS", note: stats.dueToday > 0 ? `${stats.dueToday} thẻ đến hạn` : stats.inReview > 0 ? "Đã ôn hết hôm nay" : "Chưa có thẻ", done: stats.inReview > 0 && stats.dueToday === 0 },
        { href: "/journal", title: "Viết nhật ký", note: stats.journalToday ? "Đã viết hôm nay" : "Chưa viết hôm nay", done: stats.journalToday },
        { href: "/shadowing", title: "Luyện Shadowing", note: stats.shadowDone > 0 ? `${stats.shadowDone} câu đã luyện` : "Chưa luyện câu nào", done: stats.shadowDone > 0 },
      ]
    : [];

  const startHref = stats ? (stats.dueToday > 0 ? "/review" : !stats.journalToday ? "/journal" : "/today") : "/today";

  return <main className="study-page animate-fadeIn">
    <header className="page-heading"><p className="eyebrow">Bảng điều khiển</p><h1>Mỗi bước đều được ghi nhận.</h1><p>Theo dõi vốn từ, phát âm và nhịp học của bạn.</p></header>
    {!ready || !loaded ? <div role="status" className="study-panel">Đang tải tiến độ…</div> : !userId ? <div className="study-panel"><p>Đăng nhập để xem tiến độ thật của bạn.</p><Link href="/login" className="liquid-glass-btn mt-4">Đăng nhập</Link></div> : !stats ? <div role="alert" className="study-panel">Chưa tải được tiến độ. Vui lòng tải lại trang.</div> : <>
      <section className="dashboard-metrics">{rings.map(r => <div key={r.label} className="study-panel"><ProgressRing value={r.value} size={100} stroke={8} color="var(--primary)"><strong className="text-xl">{r.value}%</strong></ProgressRing><div><h2>{r.label}</h2><p>{r.note}</p></div></div>)}</section>
      <div className="study-grid mt-5"><section className="study-panel"><h2 className="text-lg font-semibold">Hoạt động 7 ngày</h2><p className="mt-1 text-sm text-muted">Số lượt ôn tập mỗi ngày</p><div className="weekly-bars" role="img" aria-label={week.map(d => d.label + ': ' + d.reviews + ' lượt ôn').join(', ')}>{week.map(d => <div className="weekly-column" key={d.date}><div className="weekly-track"><span style={{height: (d.reviews ? Math.max(10,d.reviews / maxWeek * 100) : 3) + '%'}} /></div><small>{d.label}</small></div>)}</div>{!week.some(d => d.reviews > 0) && <p className="mt-4 text-sm text-muted">Chưa có lượt ôn trong tuần này.</p>}<Link href="/statistics" className="mt-5 inline-block text-sm font-semibold text-primary">Xem thống kê chi tiết →</Link></section>
      <section className="study-panel"><h2 className="text-lg font-semibold">Việc cần làm</h2><div className="mt-4 space-y-3">{tasks.map(t => <Link key={t.href} href={t.href} className="flex items-center justify-between rounded-xl bg-background p-3"><div><h3 className="text-sm font-semibold">{t.title}</h3><p className="text-xs text-muted mt-1">{t.note}</p></div><span className="text-primary">{t.done ? '✓' : '→'}</span></Link>)}</div><Link href={startHref} className="liquid-glass-btn mt-5 w-full">Bắt đầu học →</Link></section></div>
      <p className="mt-6 text-sm text-muted">{insight}</p>
    </>}
  </main>;
}
