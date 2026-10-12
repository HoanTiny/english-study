"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import RoadmapPath from "@/components/RoadmapPath";
import AppIcon from "@/components/AppIcon";
export default function Home() {
  const { currentStage } = useAuth();
  return <main className="study-page animate-fadeIn">
    <header className="page-heading"><p className="eyebrow">Từng bước nhỏ, tiến bộ thật</p><h1>Lộ trình của bạn</h1><p>Từ câu chào đầu tiên đến những cuộc trò chuyện tự tin. Chọn một bài học và đi tiếp theo nhịp của bạn.</p></header>
    <div className="roadmap-intro"><div><span className="level-tag">{["A1", "A2", "B1", "B2"][currentStage - 1] || "A1"}</span><div><strong>Học đều, nhớ lâu hơn.</strong><p>Buổi học hôm nay đã sẵn sàng cho bạn.</p></div></div><Link href="/today" className="liquid-glass-btn">Học hôm nay <AppIcon name="arrow" size={18} /></Link></div>
    <RoadmapPath />
    <footer className="learning-footer"><span>SpeakUp · Mỗi ngày một chút tiến bộ</span><Link href="/statistics">Xem tiến độ →</Link></footer>
  </main>;
}
