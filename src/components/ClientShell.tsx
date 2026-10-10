"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Nav from "./Nav";
import StudySessionBanner from "./StudySessionBanner";
import Header from "./Header";
import { StudySessionProvider } from "@/lib/studySession";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { error, userId } = useAuth();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <StudySessionProvider userId={userId}><div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <Nav />

      {/* Content Area */}
        <div id="app-content" className="flex flex-1 flex-col min-w-0 md:pl-64">
        <Header />
        <StudySessionBanner />
        {error && <p role="alert" className="px-5 py-3 text-red-600">{error}</p>}
        <main className="flex-1 relative z-1">{children}</main>
      </div>
    </div></StudySessionProvider>
  );
}
