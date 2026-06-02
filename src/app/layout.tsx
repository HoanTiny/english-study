import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ClientShell from "@/components/ClientShell";
import SelectionLookup from "@/components/SelectionLookup";
import OnboardingGate from "@/components/OnboardingGate";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin", "vietnamese"],
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
      className={`${inter.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground transition-colors duration-500 relative">
        {/* Background fluid blobs for visual depth behind glassmorphism */}
        <div className="fluid-blob-container">
          <div className="fluid-blob blob-primary" />
          <div className="fluid-blob blob-accent" />
          <div className="fluid-blob blob-pink" />
        </div>
        <AuthProvider>
          <ClientShell>{children}</ClientShell>
          <OnboardingGate />
          <SelectionLookup />
        </AuthProvider>
      </body>
    </html>
  );
}
