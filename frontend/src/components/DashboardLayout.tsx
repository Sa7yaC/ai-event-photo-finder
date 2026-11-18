"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Menu } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeEventId?: string;
}

export function DashboardLayout({ children, activeEventId }: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans antialiased">
      {/* Sleek Left Sidebar */}
      <Suspense
        fallback={
          <aside className="hidden shrink-0 border-r border-slate-200/80 bg-[#fbfbfb] lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64" />
        }
      >
        <Sidebar
          activeEventId={activeEventId}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
      </Suspense>

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header (Hidden on desktop lg) */}
        <header className="lg:hidden h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo-icon.png"
              alt="Sharext"
              className="h-6 w-6 object-contain"
            />
            <span className="font-extrabold text-slate-900 text-base">Sharext</span>
          </Link>

          <div className="w-8" />
        </header>

        {/* Content Body */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

