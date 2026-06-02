"use client";

import { usePathname } from "next/navigation";
import Nav from "./Nav";
import Header from "./Header";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <Nav />

      {/* Content Area */}
      <div className="flex flex-1 flex-col min-w-0 md:pl-64">
        <Header />
        <main className="flex-1 relative z-1">{children}</main>
      </div>
    </div>
  );
}
