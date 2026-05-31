import CollocationGame from "@/components/CollocationGame";

export default function CollocationsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 pt-16 animate-fadeIn">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">🧩 Ghép cụm</h1>
        <p className="mt-2 text-sm font-semibold text-muted">
          Học theo cụm (collocations) — ghép động từ với tân ngữ đi kèm tự nhiên.
        </p>
      </div>
      <CollocationGame />
    </main>
  );
}
