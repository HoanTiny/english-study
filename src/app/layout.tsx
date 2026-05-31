import type { Metadata } from "next";
import { Be_Vietnam_Pro, Dela_Gothic_One, Montserrat } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import SelectionLookup from "@/components/SelectionLookup";
import { AuthProvider } from "@/lib/auth";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

// Font theo design Figma: heading "Dela Gothic One", body "Montserrat".
const dela = Dela_Gothic_One({
  variable: "--font-dela",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpeakUp — Học nói tiếng Anh từ A1",
  description:
    "Lộ trình A1 → giao tiếp: học cụm từ, nói bắt buộc mỗi ngày, journal, shadowing và sổ tay — tất cả đổ về một hệ thống ôn tập thông minh.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${dela.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground transition-colors duration-500">
        <AuthProvider>
          <Nav />
          <div className="relative z-1">{children}</div>
          <SelectionLookup />
        </AuthProvider>
      </body>
    </html>
  );
}
