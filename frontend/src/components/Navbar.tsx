"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/events/new", label: "Create Event" },
  ];

  return (
    <header className="border-b border-amber-100/50 bg-gradient-to-r from-amber-100/70 via-white/85 to-amber-100/70 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Sharext Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/sharext-logo.png?v=blue"
            alt="Sharext Logo"
            className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-110"
          />
        </Link>

        {/* Centered Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${isActive
                  ? "text-slate-900 font-semibold"
                  : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Controls: Log in & Get Started */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Log in
          </Link>
          <HoverBorderGradient
            as={Link}
            href="/events/new"
            containerClassName="rounded-full shadow-[0_4px_14px_-2px_rgba(252,170,2,0.4),0_0_10px_rgba(255,222,106,0.3)] hover:shadow-[0_6px_18px_-2px_rgba(252,170,2,0.55),0_0_14px_rgba(255,222,106,0.45)]"
            className="btn-3d-amber text-white font-bold text-xs sm:text-sm px-5 py-2"
            maskClassName="bg-[#FCAA02]"
          >
            <span>Get started</span>
          </HoverBorderGradient>
        </div>
      </div>
    </header>
  );
}
