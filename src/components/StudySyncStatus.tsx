"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { retryStudySync, useStudySession } from "@/lib/studySession";

export default function StudySyncStatus() {
  const { userId, isAnonymous } = useAuth();
  const { syncStatus, storageError, remoteChanged } = useStudySession(userId);
  if (!userId) return null;
  const failed = syncStatus === "error" || syncStatus === "offline";
  return <div className="mt-3 space-y-1 text-xs text-muted" aria-label="Đồng bộ buổi học">
    <p role={failed ? "alert" : "status"}>{syncStatus === "loading" ? "Đang tìm buổi học trên tài khoản…"
      : syncStatus === "syncing" ? "Đang đồng bộ buổi học…"
      : syncStatus === "offline" ? "Đang ngoại tuyến. Buổi học sẽ đồng bộ khi có mạng."
      : syncStatus === "error" ? "Chưa đồng bộ được buổi học. Bản trên thiết bị vẫn được giữ."
      : "Buổi học đã đồng bộ với tài khoản."}
      {failed && <button onClick={() => void retryStudySync(userId)} className="ml-2 font-semibold underline">Thử đồng bộ lại</button>}
    </p>
    {storageError && <p role="alert" className="text-rose-600">Trình duyệt không lưu được bản dự phòng. Giữ trang mở cho đến khi đồng bộ thành công.</p>}
    {remoteChanged && <p>Buổi học đã được đổi trên thiết bị khác. Đang hiển thị buổi mới nhất; kết quả bài luyện vẫn được giữ.</p>}
    {isAnonymous && <p><Link href="/login" className="underline">Đăng nhập cùng tài khoản</Link> trên các thiết bị để tiếp tục cùng buổi học.</p>}
  </div>;
}
