import type { IconName } from "@/components/AppIcon";
export type NavItem = { href: string; label: string; description: string; icon: IconName };
export const learningLinks: NavItem[] = [
  { href: "/today", label: "Hôm nay", description: "Buổi học vừa sức với bạn", icon: "home" },
  { href: "/", label: "Lộ trình", description: "Từng bước từ A1 đến B2", icon: "map" },
  { href: "/review", label: "Ôn từ vựng", description: "Ôn điều bạn sắp quên", icon: "repeat" },
  { href: "/roleplay", label: "Hội thoại AI", description: "Gõ hoặc nói, có giải thích tiếng Việt", icon: "chat" },
  { href: "/statistics", label: "Tiến độ", description: "Nhìn lại nhịp học của bạn", icon: "chart" },
];
export const practiceLinks: NavItem[] = [
  { href: "/ipa", label: "Phát âm IPA", description: "Làm quen 44 âm và phân biệt cặp âm", icon: "mic" },
  { href: "/shadowing", label: "Shadowing", description: "Nghe, nhại giọng và cải thiện phát âm", icon: "headphones" },
  { href: "/listening", label: "Luyện nghe", description: "Video và hội thoại theo ngữ cảnh", icon: "headphones" },
  { href: "/listening-exercises", label: "Bài tập nghe", description: "Nghe và kiểm tra mức độ hiểu", icon: "book" },
  { href: "/dictation", label: "Chép chính tả", description: "Nghe từng câu, viết lại điều bạn nghe", icon: "edit" },
  { href: "/journal", label: "Nhật ký cùng AI", description: "Viết về ngày của bạn, hiểu và sửa lỗi", icon: "edit" },
  { href: "/sprint", label: "Sprint từ vựng", description: "Luyện phản xạ với các vòng ngắn", icon: "bolt" },
  { href: "/audio-call", label: "Game cuộc gọi", description: "Nghe điện thoại và phản hồi nhanh", icon: "chat" },
  { href: "/collocations", label: "Cụm từ đi đôi", description: "Ghép từ để diễn đạt tự nhiên hơn", icon: "grid" },
];
export const libraryLinks: NavItem[] = [
  { href: "/vocab", label: "Thư viện từ vựng", description: "1.000 từ nền tảng và cụm từ theo chủ đề", icon: "book" },
  { href: "/grammar", label: "Ngữ pháp", description: "Hiểu cấu trúc và thực hành ngay", icon: "book" },
  { href: "/notes", label: "Sổ tay của bạn", description: "Những từ và câu bạn đã lưu", icon: "edit" },
  { href: "/errors", label: "Sổ lỗi cá nhân", description: "Biến lỗi quen thuộc thành điều đã hiểu", icon: "repeat" },
  { href: "/dashboard", label: "Bảng điều khiển", description: "Tổng quan mục tiêu học tập", icon: "chart" },
];
export function routeTitle(path: string) {
  if (path.startsWith("/lesson/")) return "Bài học";
  return [...learningLinks, ...practiceLinks, ...libraryLinks, { href: "/practice", label: "Luyện tập" }, { href: "/account", label: "Cá nhân" }, { href: "/login", label: "Đăng nhập" }].find(i => i.href === path)?.label ?? "SpeakUp";
}
