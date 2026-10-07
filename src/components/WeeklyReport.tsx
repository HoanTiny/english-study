"use client";
import Link from "next/link";
import { weeklyReport } from "@/lib/weeklyReport";
import { shadowItems } from "@/lib/content";
import type { ActivityDay } from "@/lib/statsRepo";

function change(now: number, before: number, unit: string) {
  const delta = now - before;
  return delta === 0 ? "Bằng 7 ngày trước" : `${delta > 0 ? "Tăng" : "Giảm"} ${Math.abs(delta)} ${unit} so với 7 ngày trước`;
}
export default function WeeklyReport({ timeline }: { timeline: ActivityDay[] }) {
  if (timeline.length < 14) return null;
  const report = weeklyReport(timeline), { current, previous } = report;
  const weak = report.weakSentences.flatMap(item => {
    const sentence = shadowItems.find(s => s.id === item.id);
    return sentence ? [{ ...item, title: sentence.en }] : [];
  });
  return <section id="weekly-report" aria-label="Tổng kết tuần" className="glass-card scroll-mt-24 rounded-3xl p-6 sm:p-8">
    <h2 className="font-display text-2xl font-bold">Tổng kết 7 ngày gần nhất</h2>
    <p className="mt-2 text-sm text-muted">{report.currentDays[0].label}–{report.currentDays.at(-1)?.label} · Ôn thẻ, nhật ký và Shadowing, tính theo ngày trên thiết bị.</p>
    <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        { label: "Ngày có hoạt động", value: `${current.activeDays}/7`, note: change(current.activeDays, previous.activeDays, "ngày") },
        { label: "Lượt ôn thẻ", value: String(current.reviews), note: change(current.reviews, previous.reviews, "lượt") },
        { label: "Ngày viết nhật ký", value: String(current.journalDays), note: change(current.journalDays, previous.journalDays, "ngày") },
        { label: "Lượt luyện phát âm", value: String(current.shadowCount), note: change(current.shadowCount, previous.shadowCount, "lượt") },
      ].map(item => <div key={item.label} className="rounded-2xl border border-border/60 p-4">
        <dt className="text-xs text-muted">{item.label}</dt><dd className="mt-2 text-2xl font-bold">{item.value}</dd>
        <dd className="mt-2 text-xs text-muted">{item.note}</dd>
      </div>)}
    </dl>
    <div className="mt-5 border-t border-border/60 pt-4 text-sm">
      <p>Điểm phát âm trung bình: <b>{current.shadowAvg === null ? "Chưa có lượt chấm" : `${current.shadowAvg}/100`}</b></p>
      <p className="mt-2 text-muted">{report.pronunciationChange === null ? "Chưa đủ dữ liệu cùng câu ở hai tuần để so sánh phát âm."
        : `So sánh ${report.comparedSentences} câu đã luyện ở cả hai tuần: điểm trung bình ${report.pronunciationChange === 0 ? "không đổi" : `${report.pronunciationChange > 0 ? "tăng" : "giảm"} ${Math.abs(report.pronunciationChange)} điểm`}.`}</p>
    </div>
    <div className="mt-5 space-y-2 text-sm">
      <h3 className="font-bold">Gợi ý cho buổi tới</h3>
      {weak.length > 0 ? <ul className="space-y-2">{weak.map(item => <li key={item.id}><Link href={`/shadowing#${item.id}`} className="text-primary underline">Luyện lại: {item.title}</Link> <span className="text-muted">· gần nhất {item.score}/100</span></li>)}</ul>
        : current.shadowCount === 0 ? <p><Link href="/shadowing" className="text-primary underline">Bắt đầu với một câu Shadowing ngắn.</Link></p>
        : <p>Các câu bạn luyện trong 7 ngày qua gần nhất đều đạt từ 80 điểm. Hãy thử thêm câu mới.</p>}
      <p><Link href="/today" className="text-primary underline">{current.activeDays < 5 ? "Dành 10 phút cho buổi học tiếp theo →" : "Tiếp tục buổi học theo lịch ôn →"}</Link></p>
    </div>
  </section>;
}
