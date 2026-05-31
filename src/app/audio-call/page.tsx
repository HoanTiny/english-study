import AudioCallGame from "@/components/AudioCallGame";

export default function AudioCallPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 animate-fadeIn relative">
      <div className="mb-10 text-center flex flex-col items-center gap-3">
        <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
          🎧 LUYỆN PHẢN XẠ NGHE AUDIO
        </span>
        <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">Audio-call</h1>
        <p className="mt-1 text-xs sm:text-sm font-semibold text-muted max-w-md mx-auto leading-relaxed">
          Nghe phát âm từ trợ lý bản xứ và chọn nghĩa thích hợp. Xây dựng phản xạ thính giác tức thời.
        </p>
      </div>
      <AudioCallGame />
    </main>
  );
}
