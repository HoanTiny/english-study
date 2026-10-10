import AudioCallGame from "@/components/AudioCallGame";

export default function AudioCallPage() {
  return (
    <main className="study-page study-page--focused animate-fadeIn">
      <div className="page-heading">
        <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
          🎧 LUYỆN PHẢN XẠ NGHE AUDIO
        </span>
        <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">Game cuộc gọi</h1>
        <p className="text-muted">
          Nghe phát âm từ trợ lý bản xứ và chọn nghĩa thích hợp. Xây dựng phản xạ thính giác tức thời.
        </p>
      </div>
      <AudioCallGame />
    </main>
  );
}
