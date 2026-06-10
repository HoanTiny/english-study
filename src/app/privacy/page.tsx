import Link from "next/link";

export const metadata = { title: "Chính sách bảo mật — SpeakUp" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 animate-fadeIn">
      <Link href="/" className="text-xs font-black text-muted hover:text-foreground transition-colors">← Trang chủ</Link>
      <h1 className="mt-4 font-display text-3xl font-black text-foreground">Chính sách bảo mật</h1>
      <p className="mt-2 text-xs font-bold text-muted">Cập nhật lần cuối: tháng 6/2026</p>

      <div className="mt-8 space-y-6 text-sm font-medium leading-relaxed text-foreground/90">
        <section>
          <h2 className="mb-2 font-display text-base font-black text-foreground">1. Dữ liệu chúng tôi thu thập</h2>
          <p>
            SpeakUp lưu trữ email đăng nhập, tên hiển thị và dữ liệu học tập của bạn (tiến độ bài học,
            thẻ ôn tập, ghi chú, nhật ký, lịch sử luyện tập) để cung cấp tính năng đồng bộ giữa các thiết bị.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-base font-black text-foreground">2. Cách dữ liệu được sử dụng</h2>
          <p>
            Dữ liệu chỉ dùng để vận hành tính năng học tập (lộ trình, ôn tập ngắt quãng, thống kê cá nhân).
            Chúng tôi không bán hoặc chia sẻ dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích quảng cáo.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-base font-black text-foreground">3. Dịch vụ bên thứ ba</h2>
          <p>
            Ứng dụng sử dụng Supabase để lưu trữ dữ liệu, YouTube (chế độ nocookie) để phát video luyện nghe,
            và dịch vụ AI để chấm câu/hội thoại. Nội dung bạn gửi cho tính năng AI chỉ dùng để tạo phản hồi học tập.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-display text-base font-black text-foreground">4. Quyền của bạn</h2>
          <p>
            Bạn có thể xóa ghi chú, nhật ký và dữ liệu ôn tập bất kỳ lúc nào trong ứng dụng, hoặc yêu cầu
            xóa toàn bộ tài khoản bằng cách liên hệ với chúng tôi qua trang Tài khoản.
          </p>
        </section>
      </div>
    </main>
  );
}
