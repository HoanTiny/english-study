"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { loadDashboard, loadActivityTimeline, type DashboardStats, type ActivityDay } from "@/lib/statsRepo";
import StudyReminder from "./StudyReminder";
import StudySessionCard from "./StudySessionCard";
import SuggestedLesson from "./SuggestedLesson";
import AppIcon from "./AppIcon";
import MotionRegion from "./MotionRegion";

function WeeklyChart({ week }: { week: ActivityDay[] }) {
  const max = Math.max(1, ...week.map(d => d.reviews));
  const total = week.reduce((sum, d) => sum + d.reviews, 0);
  const activeDays = week.filter(d => d.reviews > 0 || d.journaled || d.shadowAvg !== null).length;
  return <section className="study-panel weekly-panel" data-reveal><div className="flex flex-wrap justify-between gap-2"><div><h2 className="text-base font-semibold">Nhịp học của bạn</h2><p className="mt-1 text-xs text-muted">{total} lượt ôn · {activeDays}/7 ngày có hoạt động</p></div><Link href="/statistics#weekly-report" className="text-xs font-semibold text-primary py-2">Xem tiến độ →</Link></div><div className="weekly-bars" role="img" aria-label={week.map(d => `${d.label}: ${d.reviews} lượt ôn`).join(", ")}>{week.map((d, i) => <div key={d.date} className="weekly-column"><div className="weekly-track"><span className={i === week.length - 1 ? "is-today" : ""} style={{ height: `${d.reviews ? Math.max(10, d.reviews / max * 100) : 3}%` }} title={`${d.label}: ${d.reviews} lượt ôn`} /></div><small>{d.label}</small></div>)}</div>{total === 0 && <p className="mt-3 text-xs text-muted">Chưa có lượt ôn trong tuần. Bắt đầu với vài từ quen thuộc nhé.</p>}</section>;
}
export default function TodayDashboard() {
  const [today, setToday] = useState(todayKey);
  const [retry, setRetry] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const { userId, ready, streak, currentStage } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [week, setWeek] = useState<ActivityDay[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const timer = setInterval(() => setToday(todayKey()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!ready) return;
    if (!userId) { setLoadError(true); return; }
    let active = true;
    setLoaded(false); setLoadError(false);
    Promise.all([loadDashboard(today), loadActivityTimeline(today, 7)]).then(([s, w]) => { if (active) { setStats(s); setWeek(w); setLoaded(true); } }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [ready, userId, today, retry]);
  if (loadError) return <div role="alert" className="study-panel"><h2 className="font-semibold">Chưa tải được tiến độ học</h2><p className="mt-2 text-sm text-muted">Kiểm tra kết nối và thử tải lại buổi học của bạn.</p><button className="liquid-glass-btn mt-4" onClick={() => setRetry(n => n + 1)}>Thử lại</button></div>;
  if (!loaded || !stats) return <div className="today-skeleton" role="status"><span className="sr-only">Đang đồng bộ tiến trình học…</span><div /><div /><div /></div>;
  return <MotionRegion className="today-layout">
    <div className="today-session" data-reveal><StudySessionCard key={userId} dueReviews={stats.dueToday} /></div>
    <section className="study-panel today-overview" data-reveal aria-label="Tổng quan học tập"><div><span className="feature-icon"><AppIcon name="map" /></span><p><strong>{["A1", "A2", "B1", "B2"][currentStage - 1] || "A1"}</strong><small>Trình độ hiện tại</small></p></div><div><span className="feature-icon"><AppIcon name="bolt" /></span><p><strong>{streak} ngày</strong><small>Chuỗi ngày học</small></p></div><div><span className="feature-icon"><AppIcon name="book" /></span><p><strong>{stats.mastered} từ</strong><small>Ghi nhớ vững / {stats.recognized} đã tiếp cận</small></p></div></section>
    <Link href="/roleplay" className="today-chat study-panel" data-reveal><span className="eyebrow">Hội thoại AI</span><h2>Hôm nay, mình nói gì?</h2><p>Gõ hoặc nói. Có gợi ý diễn đạt và giải thích bằng tiếng Việt.</p><span className="chat-example" lang="en">A coffee, please.</span><span className="chat-example reply" lang="en">Of course! Anything else?</span><span className="text-primary text-sm font-semibold mt-4 inline-flex items-center gap-2">Bắt đầu trò chuyện <AppIcon name="arrow" size={18} /></span></Link>
    <section className="today-lesson study-panel" data-reveal><SuggestedLesson /></section>
    <section className="today-tasks"><h2 className="section-title">Dành cho hôm nay</h2><div className="daily-tasks">
      <Link href="/review" className="practice-card" data-reveal><span className="feature-icon"><AppIcon name="repeat" /></span><div><h3>{stats.dueToday} thẻ cần ôn</h3><p>{stats.dueToday ? "Ôn lại trước khi quên" : "Khám phá thêm các thẻ đã lưu"}</p></div><AppIcon name="arrow" size={18} /></Link>
      <Link href="/journal" className="practice-card" data-reveal><span className="feature-icon"><AppIcon name="edit" /></span><div><h3>Nhật ký cùng AI</h3><p>{stats.journalToday ? "Bạn đã viết hôm nay" : "Kể về ngày của bạn bằng tiếng Anh"}</p></div><AppIcon name="arrow" size={18} /></Link>
      <Link href="/shadowing" className="practice-card" data-reveal><span className="feature-icon"><AppIcon name="mic" /></span><div><h3>Luyện nói tự nhiên</h3><p>{stats.shadowToday ? `${stats.shadowToday} câu đã luyện hôm nay` : "Nghe một câu, thử nói lại"}</p></div><AppIcon name="arrow" size={18} /></Link>
    </div></section>
    <WeeklyChart week={week} />
    <section className="study-panel today-reminder" data-reveal><StudyReminder studiedToday={stats.journalToday || stats.shadowToday > 0 || (week.at(-1)?.reviews ?? 0) > 0} /></section>
  </MotionRegion>;
}
