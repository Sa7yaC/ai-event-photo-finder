"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  Copy,
  Images,
  MessageCircle,
  ScanFace,
  X,
} from "lucide-react";

// Free Pexels photos (Pexels License), saved locally under /public/bento/stock
const photo = (name: string) => `/bento/stock/${name}.jpg`;

/* Wedding party dumped in the group chat */
const DUMP_PHOTOS = [
  photo("wedding-group"),
  photo("confetti"),
  photo("sparklers"),
  photo("party-selfie"),
  photo("night-selfie"),
  photo("reception"),
];

/* Office groups asking for the album */
const OFFICE_GROUPS = [
  { name: "office group", note: "46 members", asked: "2 asked", initials: "OG", time: "9:41 AM" },
  { name: "product team", note: "9 members", asked: "1 asked", initials: "PT", time: "9:38 AM" },
];

/* The four colleagues asking for photos */
const ASKERS: { name: string; initials: string; asked: string; time: string; message: string; photo?: string }[] = [
  { name: "Rahul Kumar", initials: "RK", asked: "1", time: "9:40 AM", message: "share the pics", photo: photo("person-rahul") },
  { name: "Priya Sharma", initials: "PS", asked: "2", time: "9:41 AM", message: "photos bhej de yrr", photo: photo("person-priya") },
  { name: "Arjun Mehta", initials: "AM", asked: "1", time: "9:42 AM", message: "album bhejna yaar" },
  { name: "Sneha Iyer", initials: "SI", asked: "1", time: "9:43 AM", message: "pics bhejo na" },
];

/* College fest album, for the "scroll to find yourself" tile */
const HUNT_PHOTOS = [
  photo("campus-friends-night"),
  photo("fest-crowd"),
  photo("grads-group"),
  photo("fest-smoke"),
  photo("grads-celebrate"),
  photo("stage-silhouette"),
  photo("grads-caps"),
  photo("uni-crowd"),
  photo("students-indoor"),
  photo("campus-crowd"),
  photo("grads-outdoor"),
  photo("grads-pair"),
];

/* Four photos from that set where faces are clearly visible */
const MATCH_INDICES = [0, 4, 8, 11];

/* Indian get-together and family gathering album, for the gallery tile */
const TOGETHER_PHOTOS = [
  photo("together-groupfie"),
  photo("together-diwali-gifts"),
  photo("together-friends-five"),
  photo("together-girlfriends"),
  photo("together-traditional"),
  photo("together-gifts"),
  photo("together-women-pink"),
  photo("together-temple-friends"),
];

/* Corporate / professional event album, for the share tile */
const CORPORATE_PHOTOS = [
  photo("meeting-team"),
  photo("meeting-room"),
  photo("meeting-agenda"),
  photo("meeting-office"),
];

function Tile({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative h-full rounded-[26px] transition-transform duration-300 hover:-translate-y-0.5 ${className}`}>
      <GlowingEffect blur={0} borderWidth={2} spread={40} glow={true} disabled={false} proximity={70} inactiveZone={0.01} />
      {children}
    </div>
  );
}

/* 3D stacked-photo gallery icon */
function GalleryIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-hidden="true">
      <defs>
        <linearGradient id="gallery-back" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#BBA6FF" />
          <stop offset="55%" stopColor="#8A63FF" />
          <stop offset="100%" stopColor="#6C46F2" />
        </linearGradient>
        <linearGradient id="gallery-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="62%" stopColor="#F7F3FF" />
          <stop offset="100%" stopColor="#E2D9F7" />
        </linearGradient>
        <linearGradient id="gallery-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2CB7FF" />
          <stop offset="100%" stopColor="#0690F5" />
        </linearGradient>
        <radialGradient id="gallery-sun" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFF0A2" />
          <stop offset="55%" stopColor="#FFD83D" />
          <stop offset="100%" stopColor="#FFB400" />
        </radialGradient>
        <linearGradient id="gallery-hill-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#AAF26B" />
          <stop offset="100%" stopColor="#5FCE2D" />
        </linearGradient>
        <linearGradient id="gallery-hill-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7BE046" />
          <stop offset="100%" stopColor="#37B31F" />
        </linearGradient>
        <filter id="gallery-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#2B1A66" floodOpacity="0.3" />
        </filter>
        <clipPath id="gallery-screen">
          <rect x="20" y="33" width="42" height="39" rx="8.5" />
        </clipPath>
      </defs>

      {/* back plate */}
      <g transform="rotate(-13 48 48)">
        <rect x="25" y="15" width="56" height="55" rx="15" fill="url(#gallery-back)" stroke="#D8CDFF" strokeWidth="2.5" />
        <rect x="29" y="19" width="48" height="46" rx="12" fill="#FFFFFF" opacity="0.1" />
      </g>

      {/* front frame */}
      <g transform="rotate(-6 48 48)">
        <rect
          x="9"
          y="24"
          width="62"
          height="57"
          rx="15"
          fill="url(#gallery-frame)"
          stroke="#FFFFFF"
          strokeWidth="2"
          filter="url(#gallery-shadow)"
        />
        <rect x="20" y="33" width="42" height="39" rx="8.5" fill="url(#gallery-sky)" />

        <g clipPath="url(#gallery-screen)">
          <circle cx="53.5" cy="44" r="6.6" fill="url(#gallery-sun)" />
          <circle cx="51.2" cy="41.8" r="1.8" fill="#FFFFFF" opacity="0.55" />

          <g fill="#FFFFFF">
            <ellipse cx="28" cy="46" rx="5.6" ry="3.8" />
            <ellipse cx="33.5" cy="44.6" rx="4.4" ry="3.2" />
            <ellipse cx="23.5" cy="44.8" rx="3.4" ry="2.6" />
            <ellipse cx="45" cy="53.5" rx="4.6" ry="3.1" />
            <ellipse cx="49" cy="52.7" rx="3.4" ry="2.4" />
            <ellipse cx="41.4" cy="52.9" rx="2.8" ry="2.1" />
          </g>

          <path d="M20 72c5-11 12-15.5 20-15.5S55 61 62 72Z" fill="url(#gallery-hill-back)" />
          <path d="M20 72c6-6.5 11.5-10 17-10s10.5 3.8 16 10Z" fill="url(#gallery-hill-front)" />
        </g>

        <rect x="20" y="33" width="42" height="39" rx="8.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1" />
      </g>
    </svg>
  );
}

export function BentoProblem() {
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [scan, setScan] = useState<"idle" | "scanning" | "found">("idle");
  const [showAfter, setShowAfter] = useState(false);
  const [shared, setShared] = useState(false);

  const scanTimer = useRef<number | null>(null);
  const sharedTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (scanTimer.current) window.clearTimeout(scanTimer.current);
      if (sharedTimer.current) window.clearTimeout(sharedTimer.current);
    },
    []
  );

  const shareLink = "sharext.app/e/cousins-wedding";

  const runScan = () => {
    if (scan === "scanning") return;
    setScan("scanning");
    if (scanTimer.current) window.clearTimeout(scanTimer.current);
    scanTimer.current = window.setTimeout(() => setScan("found"), 1500);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`https://${shareLink}`);
    } catch {
      // Clipboard access can be blocked; the button still confirms visually.
    }
    setShared(true);
    if (sharedTimer.current) window.clearTimeout(sharedTimer.current);
    sharedTimer.current = window.setTimeout(() => setShared(false), 2200);
  };

  const toggleSent = (target: string) => {
    setSentTo((prev) => (prev.includes(target) ? prev.filter((t) => t !== target) : [...prev, target]));
  };

  const sentGroups = OFFICE_GROUPS.filter((group) => sentTo.includes(group.name)).length;
  const sentPeople = ASKERS.filter((person) => sentTo.includes(person.name)).length;

  return (
    <section id="bento" className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
          Sharing photos is broken
        </h2>
        <p className="text-slate-600 text-base sm:text-lg">
          One album. Two office groups, four colleagues, and the same request in every chat.
        </p>
      </div>

      <div className="rounded-[34px] border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-[0_40px_90px_-55px_rgba(2,20,60,0.5)]">
        <div className="grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-12">

          {/* TILE A: the group chat dump, shown as a WhatsApp conversation */}
          <Tile className="md:col-span-2 xl:col-span-5">
            <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-[26px] bg-[linear-gradient(150deg,#FFE58F_0%,#FCC02F_45%,#FCAA02_100%)] p-6 text-[#0B1B3D] sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/40 blur-[55px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[#0053FF]/15 blur-[60px]"
              />

              <div className="relative grid grid-cols-1 items-center gap-5 sm:grid-cols-[1fr_auto]">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-700 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
                    The group chat
                  </span>
                  <h3 className="font-balimo text-2xl font-extrabold leading-[1.16] tracking-tight text-[#0B1B3D] sm:text-[25px]">
                    55 photos dumped in the chat
                  </h3>
                  <p className="text-[13px] leading-relaxed text-[#6B4700] sm:text-sm">
                    Everyone downloads all of them, and in most photos you are not there.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-700 shadow-[0_2px_6px_rgba(11,27,61,0.12)]">
                      <Images className="h-3 w-3 text-slate-500" />
                      55 sent
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0B1B3D] bg-[#0B1B3D] px-2.5 py-1.5 text-[10.5px] font-extrabold text-[#FFE7A3]">
                      4 are you
                    </span>
                  </div>
                </div>

                <div className="relative mx-auto w-full max-w-[15rem] sm:max-w-[13.5rem]">
                  <div className="overflow-hidden rounded-[18px] border border-white/60 bg-[#efeae2] shadow-[0_22px_40px_-18px_rgba(11,27,61,0.45)] -rotate-[1.5deg]">
                    {/* WhatsApp header */}
                    <div className="flex items-center gap-2 bg-[#008069] px-2.5 py-2 text-white">
                      <ArrowLeft className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                        CW
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-bold leading-tight">Cousin&apos;s Wedding</div>
                        <div className="text-[10px] leading-tight text-emerald-50/90">24 members</div>
                      </div>
                      <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    </div>

                    {/* Chat body: friends asking, then you send the album */}
                    <div className="space-y-1.5 px-2 py-2.5">
                      <div className="max-w-[80%] rounded-lg rounded-tl-sm bg-white px-2 py-1 shadow-sm">
                        <div className="text-[10px] font-bold text-[#008069]">Rhea</div>
                        <div className="text-[10px] leading-snug text-[#111b21]">oyee send images</div>
                      </div>

                      <div className="max-w-[80%] rounded-lg rounded-tl-sm bg-white px-2 py-1 shadow-sm">
                        <div className="text-[10px] font-bold text-[#008069]">Kabir</div>
                        <div className="text-[10px] leading-snug text-[#111b21]">pics bhejdo</div>
                      </div>

                      <div className="max-w-[80%] rounded-lg rounded-tl-sm bg-white px-2 py-1 shadow-sm">
                        <div className="text-[10px] font-bold text-[#008069]">Neha</div>
                        <div className="text-[10px] leading-snug text-[#111b21]">send the pics yaar</div>
                      </div>

                      <div className="ml-auto w-[92%] rounded-lg rounded-tr-sm bg-[#d9fdd3] p-1 shadow-sm">
                        <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded">
                          {DUMP_PHOTOS.map((src, i) => (
                            <div key={i} className="relative aspect-square">
                              <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-1 pr-0.5 text-[10px] text-[#667781]">
                          9:41 PM
                          <Check className="h-2.5 w-2.5 text-[#53bdeb]" strokeWidth={3} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Tile>

          {/* TILE C: people asking for the same photos */}
          <Tile className="md:col-span-1 xl:col-span-3">
            <div className="relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-[26px] bg-[linear-gradient(155deg,#F8F9FB_0%,#F3F5F9_55%,#EDF0F5_100%)] p-5 text-slate-900 ring-1 ring-slate-200/80 sm:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/70 blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#FCAA02]/10 blur-2xl"
              />

              <div className="relative space-y-2">
                <h3 className="font-balimo text-xl font-extrabold leading-[1.16] tracking-tight">
                  Four people ask for the photos
                </h3>
                <p className="text-[12px] leading-relaxed text-slate-600">You send the album again and again.</p>
              </div>

              <div className="relative overflow-hidden rounded-[16px] border border-slate-200/80 bg-white shadow-[0_18px_34px_-18px_rgba(2,20,60,0.35)]">
                {/* WhatsApp-style chat list */}
                <div className="divide-y divide-slate-100">
                  {OFFICE_GROUPS.map((group) => {
                    const isSent = sentTo.includes(group.name);
                    return (
                      <button
                        key={group.name}
                        type="button"
                        onClick={() => toggleSent(group.name)}
                        aria-pressed={isSent}
                        className="flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0053FF]"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[10px] font-extrabold text-[#0B7A55]">
                          <span className="translate-y-[1.5px]">{group.initials}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] font-bold leading-tight text-slate-900">{group.name}</div>
                          <div className="truncate text-[10px] leading-tight text-slate-500">{group.note}</div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="text-[10px] text-slate-500">{group.time}</span>
                          {isSent ? (
                            <span className="inline-flex h-4 items-center justify-center gap-0.5 rounded-full bg-emerald-50 px-1.5 text-[10px] font-bold leading-none text-emerald-700">
                              <Check className="h-2 w-2" strokeWidth={4} />
                              <span className="translate-y-[1px]">Sent</span>
                            </span>
                          ) : (
                            <span className="inline-flex h-4 items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[10px] font-extrabold leading-none text-[#053B23] tabular-nums">
                              <span className="translate-y-[1px]">{group.asked}</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {ASKERS.map((person) => {
                    const isSent = sentTo.includes(person.name);
                    return (
                      <button
                        key={person.initials}
                        type="button"
                        onClick={() => toggleSent(person.name)}
                        aria-pressed={isSent}
                        className="flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0053FF]"
                      >
                        {person.photo ? (
                          <img
                            src={person.photo}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-black/5"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0053FF]/10 text-[10px] font-extrabold text-[#0053FF]">
                            <span className="translate-y-[1.5px]">{person.initials}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] font-bold leading-tight text-slate-900">{person.name}</div>
                          <div className="truncate text-[10px] leading-tight text-slate-500">{person.message}</div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="text-[10px] text-slate-500">{person.time}</span>
                          {isSent ? (
                            <span className="inline-flex h-4 items-center justify-center gap-0.5 rounded-full bg-emerald-50 px-1.5 text-[10px] font-bold leading-none text-emerald-700">
                              <Check className="h-2 w-2" strokeWidth={4} />
                              <span className="translate-y-[1px]">Sent</span>
                            </span>
                          ) : (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#25D366] px-1 text-[10px] font-extrabold leading-none text-[#053B23] tabular-nums">
                              <span className="translate-y-[1px]">{person.asked}</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-600">
                <Bell className="h-3.5 w-3.5 text-[#25D366]" />
                {sentGroups === 0 && sentPeople === 0
                  ? "Tap a group or person to send the link"
                  : `${sentGroups} of ${OFFICE_GROUPS.length} groups and ${sentPeople} of ${ASKERS.length} people have the link`}
              </div>
            </div>
          </Tile>

          {/* TILE D: the manual hunt */}
          <Tile className="md:col-span-1 xl:col-span-4 xl:col-start-9 xl:row-span-2">
            <div className="relative flex h-full flex-col justify-between gap-5 overflow-hidden rounded-[26px] bg-[linear-gradient(155deg,#F8F9FB_0%,#F3F5F9_55%,#EDF0F5_100%)] p-6 text-slate-900 ring-1 ring-slate-200/80 sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/70 blur-[70px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-14 top-1/3 h-44 w-44 rounded-full bg-[#FCAA02]/10 blur-[60px]"
              />

              <h3 className="relative max-w-[16rem] font-balimo text-xl font-extrabold leading-[1.16] tracking-tight">
                You scroll 55 photos to find yourself
              </h3>

              <div className="relative">
                <div className="grid grid-cols-4 gap-1.5 overflow-hidden rounded-2xl bg-slate-200/60 p-1.5 ring-1 ring-slate-200/80 xl:grid-cols-3">
                  {HUNT_PHOTOS.map((src, i) => {
                    const isMatch = MATCH_INDICES.includes(i);
                    const revealed = scan === "found" && isMatch;
                    return (
                      <div key={i} className="relative aspect-[4/5] overflow-hidden rounded-[10px]">
                        <img
                          src={src}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className={`h-full w-full object-cover transition-all duration-500 ${revealed ? "opacity-100" : "opacity-40"
                            }`}
                        />
                        {revealed && (
                          <div className="animate-bento-ring absolute inset-0 rounded-[10px] ring-2 ring-inset ring-[#FCAA02]" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {scan === "scanning" && (
                  <div className="pointer-events-none absolute inset-1.5 overflow-hidden rounded-[14px]">
                    <div className="animate-bento-scan h-full w-full bg-gradient-to-b from-transparent via-[#4C86FF]/70 to-transparent" />
                  </div>
                )}

                {scan !== "scanning" && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      className={`flex items-center gap-2 rounded-xl border border-white bg-white px-3 py-2 shadow-[0_16px_30px_-14px_rgba(2,20,60,0.3)] ring-1 ring-[#FCAA02]/40 transition-all duration-300 ${scan === "found" ? "scale-100 opacity-100" : "scale-95 opacity-90"
                        }`}
                    >
                      <ScanFace className="h-4 w-4 text-[#0053FF]" />
                      <div>
                        <div className="text-[11px] font-extrabold leading-tight text-slate-900">
                          {scan === "found" ? "4 photos of you" : "Find your photos"}
                        </div>
                        <div className="text-[10px] leading-tight text-slate-500">
                          {scan === "found" ? "matched from your selfie" : "one selfie"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative pt-1">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 360 96"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-x-0 -bottom-4 h-24 w-full opacity-40"
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <path
                      key={i}
                      d={`M-10 ${26 + i * 11} C 60 ${4 + i * 11}, 110 ${56 + i * 11}, 190 ${32 + i * 11} S 300 ${2 + i * 11}, 370 ${38 + i * 11}`}
                      fill="none"
                      stroke={i % 2 === 0 ? "#4C86FF" : "#FCAA02"}
                      strokeOpacity={i % 2 === 0 ? 0.45 : 0.3}
                      strokeWidth="1"
                    />
                  ))}
                </svg>
                <button
                  type="button"
                  onClick={runScan}
                  disabled={scan === "scanning"}
                  className="btn-3d-amber relative inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[11.5px] font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                >
                  <ScanFace className="h-4 w-4" />
                  {scan === "idle" ? "Find my photos" : scan === "scanning" ? "Scanning..." : "Scan again"}
                </button>
              </div>
            </div>
          </Tile>

          {/* TILE E: clean gallery */}
          <Tile className="md:col-span-2 xl:col-span-4">
            <div className="relative flex h-full flex-col gap-4 overflow-hidden rounded-[26px] bg-[linear-gradient(155deg,#F8F9FB_0%,#F3F5F9_55%,#EDF0F5_100%)] p-5 text-slate-900 ring-1 ring-slate-200/80 sm:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/70 blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[#FCAA02]/10 blur-[60px]"
              />

              <div className="relative">
                <h3 className="flex items-center gap-2.5 font-balimo text-lg font-extrabold leading-tight text-slate-900">
                  <GalleryIcon className="h-10 w-10 shrink-0 drop-shadow-[0_6px_10px_rgba(0,20,60,0.3)]" />
                  Your gallery stays clean
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600">
                  Only the photos you appear in get saved.
                </p>
              </div>

              <div className="relative grid grid-cols-4 gap-1.5 rounded-2xl bg-white p-1.5 shadow-[0_18px_30px_-18px_rgba(2,20,60,0.35)] ring-1 ring-slate-200/80 md:grid-cols-8 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, slot) => {
                  const isKept = slot < MATCH_INDICES.length;
                  const shown = showAfter ? isKept : true;
                  const src = TOGETHER_PHOTOS[slot];
                  return (
                    <div
                      key={slot}
                      className={`relative aspect-square overflow-hidden rounded-[10px] ${shown ? "" : "border border-dashed border-slate-300 bg-slate-200/40"
                        }`}
                    >
                      {shown && (
                        <>
                          <img
                            src={src}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className={`h-full w-full object-cover ${isKept ? "" : "opacity-45"}`}
                          />
                          <span
                            className={`absolute bottom-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full shadow-sm ring-1 ring-white/90 ${isKept ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                          >
                            {isKept ? (
                              <Check className="h-2 w-2 text-white" strokeWidth={4} />
                            ) : (
                              <X className="h-2 w-2 text-white" strokeWidth={4} />
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="relative mt-auto space-y-2 md:w-[18rem] md:shrink-0 xl:w-auto">
                <div className="flex rounded-full bg-slate-200/70 p-1">
                  <button
                    type="button"
                    onClick={() => setShowAfter(false)}
                    aria-pressed={!showAfter}
                    className={`flex h-8 flex-1 cursor-pointer items-center justify-center rounded-full px-2 text-[11px] font-bold transition-all ${!showAfter ? "bg-white text-rose-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Before · 55
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAfter(true)}
                    aria-pressed={showAfter}
                    className={`flex h-8 flex-1 cursor-pointer items-center justify-center rounded-full px-2 text-[11px] font-bold transition-all ${showAfter ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    After · 4
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-600">
                  <Images className="h-3.5 w-3.5 shrink-0" />
                  {showAfter ? "4 photos saved. All of them you." : "55 photos saved. 51 irrelevant."}
                </div>
              </div>
            </div>
          </Tile>

          {/* TILE F: share once */}
          <Tile className="md:col-span-2 xl:col-span-4">
            <div className="relative flex h-full flex-col justify-between gap-5 overflow-hidden rounded-[26px] bg-[linear-gradient(150deg,#FFE58F_0%,#FCC02F_45%,#FCAA02_100%)] p-6 text-[#0B1B3D] sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-white/40 blur-[55px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-[#0053FF]/15 blur-[60px]"
              />

              <div className="relative space-y-3">
                <h3 className="font-balimo text-xl font-extrabold leading-[1.16] tracking-tight sm:text-[22px]">
                  Share once. Not multiple times.
                </h3>
                <p className="max-w-sm text-[13px] leading-relaxed text-[#6B4700]">
                  One link in every group. Everyone gets their own photos.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="btn-3d-blue inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold text-white transition-transform hover:scale-[1.03] active:scale-95"
                  >
                    {shared ? <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={3} /> : <Copy className="h-3.5 w-3.5" />}
                    {shared ? "Link copied" : "Copy link"}
                  </button>
                  <Link
                    href="/events/new"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white px-3.5 py-1.5 text-[11px] font-extrabold text-[#0B1B3D] shadow-[0_8px_18px_-8px_rgba(11,27,61,0.55)] transition-transform hover:scale-[1.03] active:scale-95"
                  >
                    Create an album
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={3} />
                  </Link>
                </div>
                <p aria-live="polite" className="sr-only">
                  {shared ? "Link copied" : ""}
                </p>
              </div>

              <div className="relative space-y-2 rounded-2xl bg-white/95 p-2.5 shadow-[0_20px_38px_-20px_rgba(11,27,61,0.5)] ring-1 ring-white/70 md:max-w-[26rem]">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-[#0053FF] px-2.5 py-2">
                  <div className="flex items-center gap-1">
                    {ASKERS.map((person, i) => (
                      <div
                        key={person.initials}
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0053FF] text-[9px] font-extrabold leading-none ${i % 2 === 0 ? "bg-white text-[#0053FF]" : "bg-[#FCAA02] text-slate-950"
                          }`}
                      >
                        <span className="translate-y-[1px]">{person.initials}</span>
                      </div>
                    ))}
                  </div>
                  <span
                    className={`inline-flex h-5 min-w-[3.25rem] items-center justify-center rounded px-2 text-[10px] font-extrabold leading-none transition-colors ${shared ? "bg-[#4ade80] text-emerald-950" : "bg-white text-[#0053FF]"
                      }`}
                  >
                    <span className="translate-y-[1.5px]">{shared ? "Sent" : "Share"}</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-semibold leading-snug text-slate-500">
                    With Rahul, Priya, Arjun and Sneha
                  </p>
                  <div className="h-1.5 w-4/5 rounded-full bg-slate-200" />
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {CORPORATE_PHOTOS.map((src, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded">
                      <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Tile>

        </div>
      </div>
    </section>
  );
}
