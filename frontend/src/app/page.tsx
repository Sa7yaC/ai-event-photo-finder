"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FlipWords } from "@/components/ui/flip-words";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Activity,
  RefreshCw,
  ExternalLink,
  Check,
  Lock
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
      setNext(photoUrl);
      setIsCrossfading(true);
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
        className={`${animationClass} relative overflow-hidden rounded-2xl border border-[#0053FF]/25 shadow-[0_2px_8px_rgba(255,255,255,0.3)] bg-white/10 group cursor-pointer hover:scale-105 transition-all duration-300 ${className}`}
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
  const [showTelemetry, setShowTelemetry] = useState<boolean>(false);
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
                    <span>Get Started</span>
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

              {/* Trust and Privacy Indicator (No Shadow) */}
              {/* <div className="flex items-center justify-center gap-2 text-xs font-semibold text-white pt-10 sm:pt-12">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% In-Memory Biometric Privacy • Zero Selfie Storage On Disk</span>
              </div> */}
            </div>

          </div>
        </section>

        {/* =========================================================================
            SECTION 2: USER-FACING BENTO GRID (Glowing Effect Border in Brand Palette)
            ========================================================================= */}
        <section id="bento" className="max-w-7xl mx-auto px-4 sm:px-6 py-28">

          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Why Sharext?
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              aren't you bored of!
            </p>
          </div>

          {/* THE BENTO GRID */}
          <div className="space-y-6">

            {/* UPPER ROW: Card 1 (Left Large) & Cards 2 & 3 (Right Stack) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* CARD 1 WRAPPER: "Find Your Photos with AI" (Spans 7 cols on lg) */}
              <div className="lg:col-span-7 relative rounded-[28px] p-1.5 border border-slate-200/90 bg-slate-50/60 shadow-sm transition-all">
                <GlowingEffect
                  blur={0}
                  borderWidth={2}
                  spread={48}
                  glow={true}
                  disabled={false}
                  proximity={80}
                  inactiveZone={0.01}
                />
                <div
                  className="relative rounded-[22px] overflow-hidden text-white shadow-xl min-h-[440px] flex flex-col justify-end p-8 sm:p-10 group bg-[#0053FF] bg-cover bg-center border border-blue-600/40 h-full"
                  style={{ backgroundImage: "url('/bento/bento-bg-card1.jpg?v=seamless')" }}
                >

                  {/* Real Event Photo Focused on the Person Holding the Phone, with wide seamless alpha mask */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-full sm:w-[68%] lg:w-[70%] z-0 overflow-hidden pointer-events-none"
                    style={{
                      WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 12%, rgba(0,0,0,0.5) 35%, rgba(0,0,0,0.9) 60%, black 80%)",
                      maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 12%, rgba(0,0,0,0.5) 35%, rgba(0,0,0,0.9) 60%, black 80%)"
                    }}
                  >
                    <img
                      src="/bento/bento-find-photos.jpg"
                      alt="Find Photos with AI"
                      className="w-full h-full object-cover object-[52%_35%] opacity-90 group-hover:opacity-95 transition-opacity duration-700"
                    />
                  </div>

                  {/* Left Content positioned at the bottom, directly above the 42 photos indicator, restricted to <= half the card */}
                  <div className="relative z-10 max-w-[48%] space-y-3.5">
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
                      Find Your Photos with AI
                    </h3>
                    <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                      Take a selfie or short video and instantly get all your event photos.
                    </p>

                    {/* Indicator: "✓ 42 photos found" */}
                    <div className="pt-2">
                      <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FCAA02] text-slate-950 font-extrabold text-sm sm:text-base shadow-xl shadow-black/25 hover:scale-105 transition-transform cursor-pointer">
                        <Check className="w-5 h-5 stroke-[3]" />
                        <span>42 photos found</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* RIGHT STACK: Cards 2 & 3 (Spans 5 cols on lg) */}
              <div className="lg:col-span-5 flex flex-col gap-6 justify-between">

                {/* CARD 2 WRAPPER: "Smart Group Sharing" */}
                <div className="relative rounded-[28px] p-1.5 border border-slate-200/90 bg-slate-50/60 shadow-sm transition-all flex-1">
                  <GlowingEffect
                    blur={0}
                    borderWidth={2}
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={70}
                    inactiveZone={0.01}
                  />
                  <div
                    className="relative rounded-[22px] p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-[#FCAA02]/50 transition-all overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5 min-h-[205px] bg-white bg-cover bg-center h-full"
                    style={{ backgroundImage: "url('/bento/bento-bg-card2.jpg?v=seamless')" }}
                  >

                    {/* Left Content */}
                    <div className="space-y-1.5 relative z-10 flex-1 pr-2">
                      <h3 className="text-2xl font-extrabold text-[#0053FF]">
                        Smart Group Sharing
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Share photos with specific friends, groups, or the whole event.
                      </p>
                    </div>

                    {/* Right Visual: Stacked Group Pills with Real Photos */}
                    <div className="space-y-2 relative z-10 w-full sm:w-[210px] shrink-0">

                      {/* Pill 1 */}
                      <div className="flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <img
                            src="/bento/bento-group-dinner.jpg"
                            alt="Friends"
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <div className="text-left">
                            <div className="text-xs font-bold text-slate-800">Friends</div>
                            <div className="text-[10px] text-slate-500 font-medium">56 members</div>
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full bg-[#FCAA02] text-slate-950 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>

                      {/* Pill 2 */}
                      <div className="flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <img
                            src="/bento/bento-group-dinner.jpg"
                            alt="College Team"
                            className="w-8 h-8 rounded-lg object-cover object-left"
                          />
                          <div className="text-left">
                            <div className="text-xs font-bold text-slate-800">College Team</div>
                            <div className="text-[10px] text-slate-500 font-medium">78 members</div>
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full bg-[#FCAA02] text-slate-950 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>

                      {/* Pill 3 */}
                      <div className="flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <img
                            src="/bento/bento-group-dinner.jpg"
                            alt="Organizing Crew"
                            className="w-8 h-8 rounded-lg object-cover object-right"
                          />
                          <div className="text-left">
                            <div className="text-xs font-bold text-slate-800">Organizing Crew</div>
                            <div className="text-[10px] text-slate-500 font-medium">24 members</div>
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full bg-[#FCAA02] text-slate-950 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>

                    </div>

                  </div>
                </div>

                {/* CARD 3 WRAPPER: "AI Photo Selection" */}
                <div className="relative rounded-[28px] p-1.5 border border-slate-200/90 bg-slate-50/60 shadow-sm transition-all flex-1">
                  <GlowingEffect
                    blur={0}
                    borderWidth={2}
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={70}
                    inactiveZone={0.01}
                  />
                  <div
                    className="relative rounded-[22px] p-6 sm:p-7 text-white shadow-xl overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5 min-h-[205px] group bg-[#0053FF] bg-cover bg-center border border-blue-600/30 h-full"
                    style={{ backgroundImage: "url('/bento/bento-bg-card3.jpg?v=seamless')" }}
                  >

                    {/* Left Content */}
                    <div className="space-y-1.5 relative z-10 flex-1 pr-2">
                      <h3 className="text-2xl font-extrabold text-white">
                        AI Photo Selection
                      </h3>
                      <p className="text-blue-100 text-sm leading-relaxed">
                        Our AI picks the best and most relevant photos for you.
                      </p>
                    </div>

                    {/* Right Visual: Stacked White-Bordered Celebration Photo Covering Space */}
                    <div className="relative z-10 shrink-0 w-full sm:w-[240px] h-[145px] flex items-center justify-end -mr-2">
                      {/* Background stacked card 1 */}
                      <div className="absolute w-[185px] h-[120px] rounded-2xl bg-white/20 border border-white/30 -rotate-6 pointer-events-none"></div>
                      {/* Background stacked card 2 */}
                      <div className="absolute w-[190px] h-[125px] rounded-2xl bg-white/40 border border-white/50 rotate-8 pointer-events-none"></div>
                      {/* Main front photo card */}
                      <div className="relative w-[195px] h-[130px] rounded-2xl overflow-hidden p-1.5 bg-white shadow-2xl rotate-2 group-hover:rotate-0 transition-transform z-10">
                        <img
                          src="/bento/bento-sparklers.jpg"
                          alt="AI Photo Selection"
                          className="w-full h-full object-cover rounded-xl"
                          loading="lazy"
                        />
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>

            {/* LOWER ROW: 3 Compact-Height Feature Cards with GlowingEffect & Zero Dead Space */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* CARD 4 WRAPPER: "Automatic Photo Organization" */}
              <div className="relative rounded-[28px] p-1.5 border border-slate-200/90 bg-slate-50/60 shadow-sm transition-all h-full">
                <GlowingEffect
                  blur={0}
                  borderWidth={2}
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={70}
                  inactiveZone={0.01}
                />
                <div
                  className="relative rounded-[22px] p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-[#FCAA02]/50 transition-all overflow-hidden flex flex-row items-center justify-between min-h-[220px] bg-white bg-cover bg-center h-full"
                  style={{ backgroundImage: "url('/bento/bento-bg-card4.jpg?v=seamless')" }}
                >

                  <div className="w-[48%] z-10 pr-2 space-y-1.5">
                    <h3 className="text-xl font-extrabold text-[#0053FF] leading-tight">
                      Automatic Photo Organization
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      We detect faces and organize your event photos, so you don&apos;t have to.
                    </p>
                  </div>

                  {/* Right Visual: Prominent Group Photo Taking Up Right Half with no dead space */}
                  <div className="w-[52%] relative flex justify-end items-center h-full -mr-3 sm:-mr-2 z-10">
                    <div className="relative w-full max-w-[240px] h-[145px] sm:h-[155px] rounded-2xl overflow-hidden p-1.5 bg-white border border-slate-200 shadow-2xl rotate-2 hover:rotate-0 transition-transform">
                      <img
                        src="/bento/bento-group-dinner.jpg"
                        alt="Automatic Organization"
                        className="w-full h-full object-cover rounded-xl"
                        loading="lazy"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* CARD 5 WRAPPER: "Private & Secure" */}
              <div className="relative rounded-[28px] p-1.5 border border-slate-200/90 bg-slate-50/60 shadow-sm transition-all h-full">
                <GlowingEffect
                  blur={0}
                  borderWidth={2}
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={70}
                  inactiveZone={0.01}
                />
                <div
                  className="relative rounded-[22px] p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-[#0053FF]/40 transition-all overflow-hidden flex flex-row items-center justify-between min-h-[220px] bg-white bg-cover bg-center h-full"
                  style={{ backgroundImage: "url('/bento/bento-bg-card5.jpg?v=seamless')" }}
                >

                  <div className="w-[55%] z-10 pr-2 space-y-1.5">
                    <h3 className="text-xl font-extrabold text-[#0053FF] leading-tight">
                      Private &amp; Secure
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      Your photos stay within your event and are shared only with invited people.
                    </p>
                  </div>

                  {/* Right Visual: 3D Blue Padlock Icon */}
                  <div className="w-[45%] relative flex justify-end items-center h-full pr-1 sm:pr-4 z-10">
                    <img
                      src="/bento/bento-lock-3d.png"
                      alt="Private & Secure 3D Padlock"
                      className="w-24 sm:w-28 md:w-32 h-auto object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                </div>
              </div>

              {/* CARD 6 WRAPPER: "Built for Any Occasion" */}
              <div className="relative rounded-[28px] p-1.5 border border-slate-200/90 bg-slate-50/60 shadow-sm transition-all h-full">
                <GlowingEffect
                  blur={0}
                  borderWidth={2}
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={70}
                  inactiveZone={0.01}
                />
                <div
                  className="relative rounded-[22px] p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-[#FCAA02]/50 transition-all overflow-hidden flex flex-row items-center justify-between min-h-[220px] bg-white bg-cover bg-center h-full"
                  style={{ backgroundImage: "url('/bento/bento-bg-card6.jpg?v=seamless')" }}
                >

                  <div className="w-[48%] z-20 pr-2 space-y-1.5">
                    <h3 className="text-xl font-extrabold text-[#0053FF] leading-tight">
                      Built for Any Occasion
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                      From college fests and weddings to corporate events — share memories effortlessly.
                    </p>
                  </div>

                  {/* Right Visual: TWO LARGE OVERLAPPING PHOTOS FILLING THE ENTIRE RIGHT SIDE WITHOUT COVERING TEXT */}
                  <div className="w-[52%] relative flex justify-end items-center h-full min-h-[150px] -mr-3 sm:-mr-2 z-10">
                    <div className="relative w-full h-[155px]">
                      {/* Top Concert Photo (Fills upper-right) */}
                      <div className="absolute top-0 right-0 w-[150px] sm:w-[170px] h-[100px] sm:h-[110px] rounded-xl overflow-hidden p-1 bg-white border border-slate-200/90 shadow-xl rotate-6 hover:rotate-0 transition-transform z-10">
                        <img
                          src="/bento/bento-concert.jpg"
                          alt="College Fest / Concert"
                          className="w-full h-full object-cover rounded-lg"
                          loading="lazy"
                        />
                      </div>
                      {/* Bottom Wedding Photo (Shifted right so it never overlaps the text "college fests") */}
                      <div className="absolute bottom-0 right-2 sm:right-4 w-[150px] sm:w-[170px] h-[100px] sm:h-[110px] rounded-xl overflow-hidden p-1 bg-white border border-slate-200/90 shadow-2xl -rotate-3 hover:rotate-0 transition-transform z-20">
                        <img
                          src="/bento/bento-wedding.jpg"
                          alt="Wedding Occasion"
                          className="w-full h-full object-cover rounded-lg"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>

        </section>

        {/* =========================================================================
            SECTION 3: HOW NEXTSHARE WORKS (3-Step Walkthrough Inspired by Cardboard.ai)
            ========================================================================= */}
        <section id="how-it-works" className="border-t border-slate-200/80 bg-slate-50/60 py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16">

            <div className="text-center max-w-2xl mx-auto space-y-4">
              {/* <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-[#0053FF]/10 text-[#0053FF]">
                <span>SEAMLESS WORKFLOW</span>
              </div> */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
                How Sharext Works in 3 Steps
              </h2>
              <p className="text-slate-600 text-base">
                From photographer batch ingestion to instant attendee retrieval in seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              {/* Step 1 */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-[#0053FF] text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-[#0053FF]/20">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900">Organizers Upload Gallery</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Event photographers batch-upload hundreds or thousands of photos. Deduplication eliminates duplicate files instantly.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-[#FCAA02] text-slate-900 flex items-center justify-center font-extrabold text-lg shadow-md shadow-[#FCAA02]/20">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900">Attendee Snaps a Selfie</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Attendees scan the event QR code and snap a selfie. The image is processed in RAM only — never saved to disk.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-[#0053FF] text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-[#0053FF]/20">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900">Instant Facial Matching</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  AI facial recognition scans all faces in seconds, delivering your personal memories ready for high-resolution download.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* =========================================================================
            SECTION 4: FINAL CALL TO ACTION (Generous Spacing, Clean Light Canvas)
            ========================================================================= */}
        <section className="py-28 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="rounded-3xl bg-[#0053FF] text-white p-12 sm:p-16 shadow-2xl shadow-[#0053FF]/30 space-y-8 relative overflow-hidden">

            {/* Background accent circles */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#FCAA02]/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                Ready to find your event memories in seconds?
              </h2>
              <p className="text-indigo-100 text-base sm:text-lg">
                Create an event album or explore our instant facial recognition search with Sharext.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/events/new"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base bg-[#FCAA02] text-slate-900 hover:bg-[#e99c00] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Update Yourself</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Dashboard</span>
              </Link>
            </div>

          </div>
        </section>

      </main>

      {/* Footer with Nextshare Logo */}
      <footer className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src="/nextshare-logo.png?v=sharext"
              alt="Sharext Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="text-slate-300">|</span>
            <span>AI Event Photo Retrieval Platform</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#hero" className="hover:text-[#0053FF] transition-colors">Overview</a>
            <a href="#bento" className="hover:text-[#0053FF] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#0053FF] transition-colors">Workflow</a>
            <Link href="/dashboard" className="hover:text-[#0053FF] transition-colors">Dashboard</Link>
            <a
              href={`${apiUrl}/api/v1/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0053FF] transition-colors flex items-center gap-1 font-mono text-xs"
            >
              <span>API Docs</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
