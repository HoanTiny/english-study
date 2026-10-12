import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import MotionRegion from "@/components/MotionRegion";
import { practiceLinks, libraryLinks } from "@/lib/navigation";
export default function PracticePage() {
  return <main className="study-page"><MotionRegion>
    <header className="page-heading"><p className="eyebrow">Một chút thực hành mỗi ngày</p><h1>Luyện theo cách của bạn</h1><p>Chọn kỹ năng bạn muốn cải thiện. Một phiên ngắn cũng là một bước tiến.</p></header>
    <Link href="/roleplay" className="practice-feature" data-reveal><span className="feature-icon"><AppIcon name="chat" size={28} /></span><div><span className="eyebrow">Hội thoại AI</span><h2>Một cuộc trò chuyện, nhiều điều học được.</h2><p>Gõ hoặc nói tiếng Anh. Khi bí từ, viết tiếng Việt để nhận cách diễn đạt và giải thích.</p></div><span className="feature-arrow"><AppIcon name="arrow" /></span></Link>
    <section aria-labelledby="practice-skills"><h2 id="practice-skills" className="section-title">Chọn một kỹ năng</h2><div className="practice-grid">{practiceLinks.map(i => <Link key={i.href} href={i.href} className="practice-card" data-reveal><span className="feature-icon"><AppIcon name={i.icon} /></span><div><h3>{i.label}</h3><p>{i.description}</p></div><AppIcon name="chevron" size={16} /></Link>)}</div></section>
    <section aria-labelledby="practice-library"><h2 id="practice-library" className="section-title">Thư viện & ghi nhớ</h2><div className="practice-grid">{libraryLinks.map(i => <Link key={i.href} href={i.href} className="practice-card" data-reveal><span className="feature-icon"><AppIcon name={i.icon} /></span><div><h3>{i.label}</h3><p>{i.description}</p></div><AppIcon name="chevron" size={16} /></Link>)}</div></section>
  </MotionRegion></main>;
}
