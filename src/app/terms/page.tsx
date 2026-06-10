import Link from "next/link";

export const metadata = { title: "Điều khoản sử dụng — SpeakUp" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 animate-fadeIn">
      <Link href="/" className="text-xs font-black text-muted hover:text-foreground transition-colors">← Trang chủ</Link>
      <h1 className="mt-4 font-display text-3xl font-black text-foreground">Điều khoản sử dụng</h1>
      <p className="mt-2 text-xs font-bold text-muted">Cập nhật lần cuối: tháng 6/2026</p>

      <div className="mt-8 space-y-6 text-sm font-medium leading-relaxed text-foreground/90">
        <section>
          <h2 className="mb-2 font-display text-base font-black text-foreground">1. Dịch vụ</h2>
          <p>
            SpeakUp là ứng dụng hỗ trợ tự học tiếng Anh: bài học theo lộ trình CEFR, luyện nghe, ôn tập
            ngắt quãng và luyện nói với AI. Nội dung chỉ mang tính tham khảo học tập, không thay thế
            chương trình đào tạo chính quy.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-base font-black text-foreground">2. Tài khoản</h2>
          <p>
            Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình. Vui lòng không chia sẻ tài khoản
            hoặc sử dụng dịch vụ vào mục đích vi phạm pháp luật.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-base font-black text-foreground">3. Nội dung học liệu</h2>
          <p>
            Video luyện nghe được nhúng từ YouTube theo điều khoản của YouTube; bản quyền video thuộc về
            kênh gốc (BBC Learning English, VOA Learning English, TED-Ed…). Nội dung từ VOA Learning English
            thuộc phạm vi công cộng. Các bài học, hội thoại và bài tập do SpeakUp tự biên soạn.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-base font-black text-foreground">4. Giới hạn trách nhiệm</h2>
          <p>
            Dịch vụ được cung cấp “nguyên trạng”. Chúng tôi nỗ lực đảm bảo nội dung chính xác nhưng không
            cam kết tuyệt đối về tính đầy đủ; phản hồi từ AI có thể có sai sót và chỉ nên dùng làm gợi ý học tập.
          </p>
        </section>
      </div>
    </main>
  );
}
