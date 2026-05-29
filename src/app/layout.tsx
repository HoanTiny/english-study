import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { AuthProvider } from "@/lib/auth";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground transition-colors duration-500">
        {/* Background Fluid Blobs for Liquid Glass Refraction */}
        <div className="fluid-blob-container">
          <div className="fluid-blob blob-primary"></div>
          <div className="fluid-blob blob-accent"></div>
          <div className="fluid-blob blob-pink"></div>
        </div>
        <AuthProvider>
          <Nav />
          <div className="relative z-1">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
