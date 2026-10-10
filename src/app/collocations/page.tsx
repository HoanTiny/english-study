import CollocationGame from "@/components/CollocationGame";

export default function CollocationsPage() {
  return (
    <main className="study-page study-page--focused animate-fadeIn">
      <div className="page-heading">
        <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
          🧩 HỌC QUA THỰC HÀNH CỤM TỪ
        </span>
        <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">Ghép cụm từ thông dụng</h1>
        <p className="text-muted">
          Phương pháp học theo cụm từ (Collocations) — ghép động từ (Head) và tân ngữ đi kèm (Tail) tự nhiên giúp giao tiếp trôi chảy hơn.
        </p>
      </div>
      <CollocationGame />
    </main>
  );
}
