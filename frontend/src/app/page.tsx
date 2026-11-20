"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BentoProblem } from "@/components/BentoProblem";
import { HowItWorks } from "@/components/HowItWorks";
import { FlipWords } from "@/components/ui/flip-words";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import {
  ChevronDown,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface HealthData {
  status: string;
  app_name: string;
  version: string;
  database_connected: boolean;
  timestamp: string;
}

// 17 curated photos selected exclusively from the user's provided Pexels links,
// jumbled for optimal visual variety, color contrast, and canvas aspect fit.
const HERO_PHOTOS = [
  "https://images.pexels.com/photos/31530948/pexels-photo-31530948.jpeg?auto=compress&cs=tinysrgb&w=600", // Elegant wedding couple (tall portrait)
  "https://images.pexels.com/photos/36729779/pexels-photo-36729779.jpeg?auto=compress&cs=tinysrgb&w=600", // Friends selfie in cafe (lively group)
  "https://images.pexels.com/photos/19408342/pexels-photo-19408342.jpeg?auto=compress&cs=tinysrgb&w=600", // Brunette in traditional jewelry
  "https://images.pexels.com/photos/4791743/pexels-photo-4791743.jpeg?auto=compress&cs=tinysrgb&w=600",   // Man in red turtleneck (vibrant accent)
  "https://images.pexels.com/photos/10578379/pexels-photo-10578379.jpeg?auto=compress&cs=tinysrgb&w=600", // Smiling portrait (inner CTA frame)
  "https://images.pexels.com/photos/27869785/pexels-photo-27869785.jpeg?auto=compress&cs=tinysrgb&w=600", // Three women laughing together
  "https://images.pexels.com/photos/7778906/pexels-photo-7778906.jpeg?auto=compress&cs=tinysrgb&w=600",   // Studio models
  "https://images.pexels.com/photos/33772425/pexels-photo-33772425.jpeg?auto=compress&cs=tinysrgb&w=600", // Couple in studio (black hoodie & white corset)
  "https://images.pexels.com/photos/34942519/pexels-photo-34942519.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/37189417/pexels-photo-37189417.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/7944240/pexels-photo-7944240.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/14663615/pexels-photo-14663615.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/35107612/pexels-photo-35107612.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/40378015/pexels-photo-40378015.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/30481579/pexels-photo-30481579.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/38809379/pexels-photo-38809379.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/38079943/pexels-photo-38079943.jpeg?auto=compress&cs=tinysrgb&w=600",
];

const FAQ_ITEMS = [
  {
    question: "Do attendees need to create an account to find their photos?",
    lead: "No.",
    rest: "Attendees can access the event through a shared link, upload a selfie, and discover their photos without creating an account.",
  },
  {
    question: "How accurate is the AI photo matching?",
    lead: "Highly accurate.",
    rest: "Our AI analyzes facial features to find matches across different lighting conditions, angles, and expressions. A clear, well-lit selfie helps deliver better results.",
  },
  {
    question: "Are my photos and facial data secure?",
    lead: "Yes.",
    rest: "We prioritize data privacy and security, with controlled access to event galleries and secure handling of uploaded data.",
  },
  {
    question: "Can I use this platform for different types of events?",
    lead: "Yes.",
    rest: "Our platform works for weddings, birthday parties, college festivals, corporate events, concerts, and more.",
  },
  {
    question: "How long will my event photos be available?",
    lead: "It depends on your plan.",
    rest: "Each plan offers a specific photo-gallery availability period. Once that period expires, photos are removed according to the plan's retention policy.",
  },
];

// Single photo slot with smooth crossfade on refresh, 1px blue border, and customizable framing
function HeroPhotoSlot({
  photoUrl,
  alt,
  className,
  style,
  animationClass = "animate-micro-float-1",
  objectPosition = "center 8%",
}: {
  photoUrl: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  animationClass?: string;
  objectPosition?: string;
}) {
  const [current, setCurrent] = useState(photoUrl);
  const [next, setNext] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);

  useEffect(() => {
    if (photoUrl !== current) {
      /* eslint-disable react-hooks/set-state-in-effect -- the crossfade starts when the slot photo changes */
      setNext(photoUrl);
      setIsCrossfading(true);
      /* eslint-enable react-hooks/set-state-in-effect */
      const timer = setTimeout(() => {
        setCurrent(photoUrl);
        setNext(null);
        setIsCrossfading(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [photoUrl, current]);

  return (
    <div style={style} className="shrink-0 transition-transform duration-300">
      <div
        className={`${animationClass} relative overflow-hidden rounded-2xl border border-[#0053FF]/25 shadow-[0_2px_8px_rgba(255,255,255,0.3)] bg-white/10 ${className}`}
      >
        <img
          src={current}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover rounded-[inherit]"
          style={{ objectPosition }}
        />
        {next && (
          <img
            src={next}
            alt={alt}
            className={`absolute inset-0 w-full h-full object-cover rounded-[inherit] transition-opacity duration-700 ease-in-out ${isCrossfading ? "opacity-100" : "opacity-0"
              }`}
            style={{ objectPosition }}
          />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [showTelemetry] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [photoOffset, setPhotoOffset] = useState<number>(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchHealth = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(`${apiUrl}/api/v1/health`, {
        cache: "no-store",
      });
      const end = performance.now();
      setLatency(Math.round(end - start));

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }
      const data: HealthData = await res.json();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // The initial health probe sets the loading state on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHealth();

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Rotate through photos, swapping slots every 4.2 seconds
    const photoTimer = setInterval(() => {
      setPhotoOffset((prev) => (prev + 8) % HERO_PHOTOS.length);
    }, 4200);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(photoTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-balimo selection:bg-[#0053FF] selection:text-white relative">

      {/* Subtle Background Lighting for Light Theme */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-[#0053FF]/[0.04] via-[#FCAA02]/[0.03] to-transparent blur-[120px] rounded-full"></div>
        <div className="absolute top-[800px] -left-48 w-[600px] h-[600px] bg-[#0053FF]/[0.03] blur-[140px] rounded-full"></div>
        <div className="absolute top-[1400px] -right-48 w-[600px] h-[600px] bg-[#FCAA02]/[0.03] blur-[140px] rounded-full"></div>
      </div>

      {/* Transparent Full-Width Navbar: Logo Left, Get Started Right, Aligned along Reference Line */}
      <header
        className={`fixed top-0 inset-x-0 z-50 w-full transition-all duration-300 ease-out ${isScrolled
          ? "opacity-0 pointer-events-none -translate-y-4 select-none invisible"
          : "opacity-100 translate-y-0 visible"
          }`}
      >
        <div className="max-w-8.5xl mx-auto px-6 sm:px-8 lg:px-12 pt-7 sm:pt-8 pb-3 sm:pb-4 flex items-center justify-between">
          {/* Logo on the Left - Placed according to bottom logo, aligned horizontally with Get Started button */}
          <Link href="/" className="flex items-center group">
            <img
              src="/sharext-logo-white.png?v=v5"
              alt="Sharext Logo"
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-102"
            />
          </Link>

          {/* Get Started Button on the Right - In that same horizontal line pointing to Logo */}
          <HoverBorderGradient
            as={Link}
            href="/events/new"
            containerClassName="rounded-full shadow-[0_4px_14px_-2px_rgba(252,170,2,0.4),0_0_10px_rgba(255,222,106,0.3)] hover:shadow-[0_6px_18px_-2px_rgba(252,170,2,0.55),0_0_14px_rgba(255,222,106,0.45)]"
            className="btn-3d-amber text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 tracking-normal whitespace-nowrap"
            maskClassName="bg-[#FCAA02]"
          >
            <span>Get Started</span>
          </HoverBorderGradient>
        </div>
      </header>

      {/* Expandable Live Backend Health Drawer */}
      {showTelemetry && (
        <div className="border-b border-[#0053FF]/15 bg-[#0053FF]/[0.03] backdrop-blur-lg px-4 py-3 z-40 transition-all">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${health?.database_connected ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                <span>{health?.status === "healthy" ? "Backend Healthy (PostgreSQL + pgvector)" : "Connecting..."}</span>
              </span>
              <span className="text-slate-500 font-mono">Target: {apiUrl}</span>
              {latency !== null && (
                <span className="text-slate-500 font-mono">Latency: <strong className="text-slate-900">{latency}ms</strong></span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {lastChecked && <span className="text-slate-500">Checked: {lastChecked}</span>}
              <button
                onClick={fetchHealth}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0053FF] hover:bg-[#0047db] text-white font-medium cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                <span>Probe API</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 relative z-10">

        {/* =========================================================================
            SECTION 1: HERO SECTION (Spacious, Floating Photos, Direct Button)
            ========================================================================= */}
        <section
          id="hero"
          className="relative w-full overflow-hidden pt-36 sm:pt-48 lg:pt-52 pb-24 sm:pb-32 flex flex-col items-center justify-center text-center min-h-[860px]"
        >
          {/* Cloud Sky Hero Background Image */}
          <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
            <img
              src="/hero-bg.jpg?v=clouds-v4"
              alt="Golden Morning Clouds Sky"
              className="w-full h-full object-cover object-center sm:object-[center_20%] opacity-85"
            />
            {/* Soft gradient bottom fade into the white page body */}
            <div className="absolute inset-x-0 bottom-0 h-44 sm:h-56 bg-gradient-to-t from-white via-white/85 to-transparent"></div>
            {/* Soft top gradient */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/30 to-transparent"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 flex flex-col items-center justify-center">

            {/* =========================================================================
                CENTER HERO HEADLINE & SUBTITLE (Crisp White in Balimo Font, No Shadows)
                Positioned with ~1.75 rem (28px) breathing room below floating navbar
                ========================================================================= */}
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5 z-20 text-center pt-0 pb-2">
              {/* White Headline in Balimo font (No Shadow) with Translucent Highlight Badge (No Blue Border, No Shadow) */}
              <h1 className="font-balimo text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.24] text-center">
                Are you still{" "}
                <span className="inline-flex items-center justify-center align-middle mx-1.5 sm:mx-2.5 px-3.5 sm:px-5 py-0.5 sm:py-1 rounded-2xl bg-gradient-to-r from-amber-100/70 via-white/85 to-amber-100/70 backdrop-blur-md">
                  <FlipWords
                    words={["sharing", "searching"]}
                    duration={1600}
                    className="font-balimo text-[#0053FF] font-extrabold"
                  />
                </span>{" "}
                photos the old way?
              </h1>

              {/* Subtitle in Balimo font - #0053FF only */}
              <p className="font-balimo text-[#f9f9f9] text-base sm:text-lg max-w-lg mx-auto leading-relaxed text-center font-semibold">
                Find yourself in hundreds of event photos with AI-powered face matching. Just take a selfie and let the memories find you.
              </p>
            </div>

            {/* =========================================================================
                HERO HORIZONTAL PHOTO ARC WITH CENTER CTA BUTTON (Matching User Reference)
                4 cards on Left, Center CTA Button, 4 cards on Right
                Graduated card dimensions matching user reference schematic:
                - Outer cards: tall portrait & extra large for generous framing
                - Mid cards: large to medium squares
                - Inner cards: compact cards framing the Get Started button
                ========================================================================= */}
            <div className="relative w-full max-w-7xl mx-auto flex flex-col items-center justify-center pt-6 sm:pt-10 pb-4 overflow-visible">
              <div className="flex items-center justify-center -space-x-1 sm:-space-x-1.5 md:-space-x-2 lg:-space-x-2.5 xl:-space-x-3 w-full overflow-visible">

                {/* LEFT WING: 4 Photos (Outermost to Innermost next to CTA) */}
                {/* 1. Outermost Left (Tall portrait card, tilted -9deg) */}
                <HeroPhotoSlot
                  photoUrl={HERO_PHOTOS[(0 + photoOffset) % HERO_PHOTOS.length]}
                  alt="Event Memory 1"
                  className="w-16 h-22 sm:w-24 sm:h-32 md:w-30 md:h-42 lg:w-38 lg:h-52 xl:w-44 xl:h-60 hidden sm:block"
                  style={{ transform: "rotate(-9deg)" }}
                  animationClass="animate-micro-float-1"
                  objectPosition="center 8%"
                />

                {/* 2. Mid-Outer Left (Large square card, tilted +12deg) */}
                <HeroPhotoSlot
                  photoUrl={HERO_PHOTOS[(1 + photoOffset) % HERO_PHOTOS.length]}
                  alt="Event Memory 2"
                  className="w-18 h-18 sm:w-26 sm:h-26 md:w-34 md:h-34 lg:w-46 lg:h-46 xl:w-52 xl:h-52 hidden sm:block"
                  style={{ transform: "rotate(12deg)" }}
                  animationClass="animate-micro-float-2"
                  objectPosition="center 10%"
                />

                {/* 3. Mid-Inner Left (Medium square card, tilted -11deg) */}
                <HeroPhotoSlot
                  photoUrl={HERO_PHOTOS[(2 + photoOffset) % HERO_PHOTOS.length]}
                  alt="Event Memory 3"
                  className="w-14 h-14 sm:w-20 sm:h-20 md:w-26 md:h-26 lg:w-34 lg:h-34 xl:w-40 xl:h-40"
                  style={{ transform: "rotate(-11deg)" }}
                  animationClass="animate-micro-float-3"
                  objectPosition="center 10%"
                />

                {/* 4. Innermost Left (Compact card, tilted +13.5deg, right beside CTA) */}
                <HeroPhotoSlot
                  photoUrl={HERO_PHOTOS[(3 + photoOffset) % HERO_PHOTOS.length]}
                  alt="Event Memory 4"
                  className="w-12 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-26 lg:h-32 xl:w-28 xl:h-34"
                  style={{ transform: "rotate(13.5deg)" }}
                  animationClass="animate-micro-float-4"
                  objectPosition="center 8%"
                />

                {/* CENTER: CTA BUTTON ("Get Started") */}
                <div
                  className="shrink-0 flex flex-col items-center justify-center px-2 sm:px-3 md:px-4 lg:px-6 z-30"
                >
                  <HoverBorderGradient
                    as={Link}
                    href="/dashboard"
                    containerClassName="rounded-full shadow-[0_12px_28px_-4px_rgba(252,170,2,0.6),0_0_22px_rgba(255,222,106,0.5)] hover:shadow-[0_16px_36px_-4px_rgba(252,170,2,0.75),0_0_30px_rgba(255,222,106,0.65)]"
                    className="btn-3d-amber text-white font-extrabold text-xs sm:text-base lg:text-lg px-6 py-2.5 sm:px-8 sm:py-3.5 lg:px-10 lg:py-4 tracking-normal whitespace-nowrap"
                    maskClassName="bg-[#FCAA02]"
                  >
                    <span>Start Sharing</span>
                  </HoverBorderGradient>
                </div>

                {/* RIGHT WING: 4 Photos (Innermost to Outermost) */}
                {/* 5. Innermost Right (Compact card, tilted -14deg, right beside CTA) */}
                <HeroPhotoSlot
                  photoUrl={HERO_PHOTOS[(4 + photoOffset) % HERO_PHOTOS.length]}
                  alt="Event Memory 5"
                  className="w-12 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-26 lg:h-32 xl:w-28 xl:h-34"
                  style={{ transform: "rotate(-14deg)" }}
                  animationClass="animate-micro-float-4"
                  objectPosition="center 8%"
                />

                {/* 6. Mid-Inner Right (Medium square card, tilted +11deg) */}
                <HeroPhotoSlot
                  photoUrl={HERO_PHOTOS[(5 + photoOffset) % HERO_PHOTOS.length]}
                  alt="Event Memory 6"
                  className="w-14 h-14 sm:w-20 sm:h-20 md:w-26 md:h-26 lg:w-34 lg:h-34 xl:w-40 xl:h-40"
                  style={{ transform: "rotate(11deg)" }}
                  animationClass="animate-micro-float-3"
                  objectPosition="center 10%"
                />

                {/* 7. Mid-Outer Right (Large square card, tilted -12deg) */}
                <HeroPhotoSlot
                  photoUrl={HERO_PHOTOS[(6 + photoOffset) % HERO_PHOTOS.length]}
                  alt="Event Memory 7"
                  className="w-18 h-18 sm:w-26 sm:h-26 md:w-34 md:h-34 lg:w-46 lg:h-46 xl:w-52 xl:h-52 hidden sm:block"
                  style={{ transform: "rotate(-12deg)" }}
                  animationClass="animate-micro-float-2"
                  objectPosition="center 10%"
                />

                {/* 8. Outermost Right (Extra large card, tilted +9deg) */}
                <HeroPhotoSlot
                  photoUrl={HERO_PHOTOS[(7 + photoOffset) % HERO_PHOTOS.length]}
                  alt="Event Memory 8"
                  className="w-18 h-20 sm:w-26 sm:h-30 md:w-34 md:h-38 lg:w-46 lg:h-52 xl:w-52 xl:h-58 hidden sm:block"
                  style={{ transform: "rotate(9deg)" }}
                  animationClass="animate-micro-float-1"
                  objectPosition="center 8%"
                />

              </div>

            </div>

          </div>
        </section>

        {/* =========================================================================
            SECTION 2: BENTO -- THE PHOTO SHARING PROBLEM, TOLD IN SIX TILES
            ========================================================================= */}
        <BentoProblem />

        {/* =========================================================================
            SECTION 3: HOW IT WORKS -- THREE ANIMATED STEP DEMOS
            ========================================================================= */}
        <HowItWorks />

        {/* =========================================================================
            SECTION 4: FREQUENTLY ASKED QUESTIONS
            ========================================================================= */}
        <section id="faq" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-24">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Frequently asked questions
          </h2>

          <div className="mt-8 sm:mt-12">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="faq-item border-b border-slate-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0053FF] sm:gap-6 sm:py-6 [&::-webkit-details-marker]:hidden">
                  <span className="font-balimo text-base font-semibold leading-snug text-slate-900 sm:text-xl">
                    {item.question}
                  </span>
                  <ChevronDown className="faq-chevron h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 sm:h-5 sm:w-5" />
                </summary>
                <p className="max-w-3xl pb-5 text-[13px] leading-relaxed text-slate-600 sm:pb-6 sm:text-base">
                  <strong className="font-semibold text-slate-900">{item.lead}</strong>{" "}
                  {item.rest}
                </p>
              </details>
            ))}
          </div>
        </section>

      </main>

      {/* Footer: navigation over white, then the landscape wordmark band */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 sm:pt-20">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
            <div>
              <Link href="/" className="inline-flex items-center">
                <img
                  src="/sharext-sidebar-logo.png?v=black-v4"
                  alt="Sharext"
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600">
                AI event photo retrieval for everyone who was there.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Product
                </h2>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <li>
                    <a href="#bento" className="text-slate-600 transition-colors hover:text-[#0053FF]">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#how-it-works" className="text-slate-600 transition-colors hover:text-[#0053FF]">
                      Workflow
                    </a>
                  </li>
                  <li>
                    <Link href="/photos" className="text-slate-600 transition-colors hover:text-[#0053FF]">
                      Photo library
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Workspace
                </h2>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <li>
                    <Link href="/dashboard" className="text-slate-600 transition-colors hover:text-[#0053FF]">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/events/new" className="text-slate-600 transition-colors hover:text-[#0053FF]">
                      Create an event
                    </Link>
                  </li>
                  <li>
                    <Link href="/profile" className="text-slate-600 transition-colors hover:text-[#0053FF]">
                      Profile
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Resources
                </h2>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <li>
                    <a
                      href={`${apiUrl}/api/v1/docs`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-600 transition-colors hover:text-[#0053FF]"
                    >
                      <span>API docs</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className="text-slate-600 transition-colors hover:text-[#0053FF]">
                      FAQ
                    </a>
                  </li>
                  <li>
                    <Link href="/settings" className="text-slate-600 transition-colors hover:text-[#0053FF]">
                      Settings
                    </Link>
                  </li>
                  <li>
                    <a href="#hero" className="text-slate-600 transition-colors hover:text-[#0053FF]">
                      Overview
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">© 2026 Sharext.</p>
            <a
              href="#hero"
              className="text-xs font-semibold text-slate-600 transition-colors hover:text-[#0053FF]"
            >
              Back to top ↑
            </a>
          </div>
        </div>

        <div className="relative aspect-[2048/683] w-full overflow-hidden">
          <img
            src="/footer-sharext.jpg"
            alt=""
            aria-hidden="true"
            width={2048}
            height={683}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 0%, #000 12%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 12%)",
            }}
          />
        </div>
      </footer>

    </div>
  );
}
