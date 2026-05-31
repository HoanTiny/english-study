import type { Metadata } from "next";
import { Be_Vietnam_Pro, Outfit } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import SelectionLookup from "@/components/SelectionLookup";
import OnboardingGate from "@/components/OnboardingGate";
import { AuthProvider } from "@/lib/auth";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${beVietnam.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground transition-colors duration-500 relative">
        {/* Background fluid blobs for visual depth behind glassmorphism */}
        <div className="fluid-blob-container">
          <div className="fluid-blob blob-primary" />
          <div className="fluid-blob blob-accent" />
          <div className="fluid-blob blob-pink" />
        </div>
        <AuthProvider>
          <Nav />
          <OnboardingGate />
          <div className="relative z-1">{children}</div>
          <SelectionLookup />
        </AuthProvider>
      </body>
    </html>
  );
}
