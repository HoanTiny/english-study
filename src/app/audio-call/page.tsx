import AudioCallGame from "@/components/AudioCallGame";

export default function AudioCallPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 pt-16 animate-fadeIn">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">🎧 Audio-call</h1>
        <p className="mt-2 text-sm font-semibold text-muted">
          Luyện phản xạ nghe — nghe từ tiếng Anh và xét nghĩa đúng/sai.
        </p>
      </div>
      <AudioCallGame />
    </main>
  );
}
