"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import Nav from "./Nav";
import StudySessionBanner from "./StudySessionBanner";
import Header from "./Header";
import { StudySessionProvider } from "@/lib/studySession";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { error, userId } = useAuth();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    function updateKeyboard() {
      // Keep navigation stable during focus/blur. Hide it only when the on-screen
      // keyboard actually reduces the visible viewport, not on a pointer click.
      const keyboardOpen = !!viewport && viewport.scale === 1 && document.documentElement.clientHeight - viewport.height > 150;
      document.documentElement.dataset.keyboardOpen = String(keyboardOpen);
    }
    viewport.addEventListener("resize", updateKeyboard);
    updateKeyboard();
    return () => { viewport.removeEventListener("resize", updateKeyboard); delete document.documentElement.dataset.keyboardOpen; };
  }, []);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <StudySessionProvider userId={userId}><div className="app-shell">
      <a href="#page-content" className="skip-link">Đến nội dung chính</a>
      {/* Sidebar Navigation */}
      <Nav />

      {/* Content Area */}
        <div id="app-content" className="app-content">
        <Header />
        <StudySessionBanner />
        {error && <p role="alert" className="px-5 py-3 text-red-600">{error}</p>}
        <div id="page-content" tabIndex={-1} className="page-content">{children}</div>
      </div>
    </div></StudySessionProvider>
  );
}
