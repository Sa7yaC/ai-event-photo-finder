"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-8">
        <Link href="/" className="inline-flex items-center" aria-label="Sharext home">
          <img
            src="/sharext-sidebar-logo.png?v=black-v4"
            alt="Sharext"
            className="h-8 w-auto object-contain"
          />
        </Link>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 sm:text-sm"
        >
          Browse as guest
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{subtitle}</p>

            <div className="mt-6">{children}</div>
          </div>

          <div className="mt-5 text-center text-sm text-slate-600">{footer}</div>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Your selfie is processed in memory and never stored.
          </p>
        </div>
      </main>
    </div>
  );
}
