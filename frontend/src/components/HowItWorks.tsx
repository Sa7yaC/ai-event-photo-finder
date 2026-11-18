"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { Check, Download, ImageUp } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const ENTER = [0.22, 1, 0.36, 1] as const;
const LOOP_GAP = 1500;

const photo = (name: string) => `/bento/stock/${name}.jpg`;
const FACE_FRONT = "/demo/face-front.jpg";
const FACE_LEFT = "/demo/face-left.jpg";
const FACE_RIGHT = "/demo/face-right.jpg";

const UPLOAD_PHOTOS = [
  photo("wedding-group"),
  photo("confetti"),
  photo("sparklers"),
  photo("party-selfie"),
  photo("night-selfie"),
  photo("reception"),
  photo("together-groupfie"),
  photo("together-diwali-gifts"),
  photo("together-friends-five"),
  photo("grads-celebrate"),
  photo("grads-group"),
  photo("fest-crowd"),
];

const GALLERY_PHOTOS = [
  photo("together-groupfie"),
  photo("together-friends-five"),
  photo("together-traditional"),
  photo("together-women-pink"),
  photo("together-diwali-gifts"),
  photo("together-gifts"),
  photo("together-girlfriends"),
  photo("together-temple-friends"),
];

const MATCHED = [0, 1, 2, 4, 5, 7];

/**
 * Looping scripted timeline. Each beat advances one stage, then the whole
 * sequence restarts after a short hold so the demo keeps playing on its own.
 * `instant` (reduced motion) settles on the finished stage without movement.
 */
function useStages(beats: readonly number[], runKey: number, instant: boolean) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (runKey === 0) return;
    if (instant) {
      const t = window.setTimeout(() => setStage(beats.length), 0);
      return () => window.clearTimeout(t);
    }

    let cancelled = false;
    let timers: number[] = [];
    const schedule = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const cycle = () => {
      if (cancelled) return;
      timers = [];
      setStage(0);
      let acc = 0;
      for (let i = 0; i < beats.length; i++) {
        acc += beats[i];
        const next = i + 1;
        schedule(() => {
          if (!cancelled) setStage(next);
        }, acc);
      }
      schedule(cycle, acc + LOOP_GAP);
    };

    schedule(cycle, 0);
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [beats, runKey, instant]);

  return stage;
}

function useDemo() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();
  return { ref, instant: reduced === true, runKey: inView ? 1 : 0 };
}

/* ------------------------------------------------------------------ */
/* Step 1 — Host drops the album in                                    */
/* ------------------------------------------------------------------ */

const UPLOAD_BEATS = [900, 1700, 700] as const;

function UploadDemo() {
  const { ref, instant, runKey } = useDemo();
  const stage = useStages(UPLOAD_BEATS, runKey, instant);
  const settled = stage >= 2;
  const filling = stage >= 1;

  const [count, setCount] = useState(0);
  useEffect(() => {
    const timers: number[] = [];
    const defer = (fn: () => void) => timers.push(window.setTimeout(fn, 0));

    if (instant) {
      defer(() => setCount(UPLOAD_PHOTOS.length));
      return () => timers.forEach((t) => window.clearTimeout(t));
    }
    if (!filling) {
      defer(() => setCount(0));
      return () => timers.forEach((t) => window.clearTimeout(t));
    }

    defer(() => setCount(1));
    const timer = window.setInterval(() => {
      setCount((c) => {
        if (c >= UPLOAD_PHOTOS.length) {
          window.clearInterval(timer);
          return c;
        }
        return c + 1;
      });
    }, 120);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(timer);
    };
  }, [filling, runKey, instant]);

  return (
    <div
      ref={ref}
      className="relative h-[330px] overflow-hidden rounded-2xl bg-white/85 p-4 shadow-[0_18px_34px_-22px_rgba(11,27,61,0.45)] ring-1 ring-white/60 sm:p-5"
    >
      <p aria-live="polite" className="sr-only">
        {settled
          ? "All twelve photos are in the event album."
          : filling
            ? "Uploading photos to the event."
            : "Waiting to upload photos."}
      </p>

      <div className="mx-auto flex h-full w-full max-w-[420px] flex-col overflow-hidden rounded-xl bg-white ring-1 ring-slate-900/[0.07]">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <span className="h-2 w-2 rounded-full bg-rose-300" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          <span className="ml-1.5 truncate text-[11px] font-bold text-slate-600">
          </span>
          {/* <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors duration-300 ${settled
                ? "bg-emerald-50 text-emerald-700"
                : "bg-[#0053FF]/10 text-[#0053FF]"
              }`}
          >
            {settled ? "live" : "draft"}
          </span> */}
        </div>

        <div className="relative flex-1 p-2.5">
          <AnimatePresence initial={false}>
            {!filling ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.28, ease: ENTER }}
                className="absolute inset-2.5 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#0053FF]/25 bg-[#0053FF]/[0.02]"
              >
                <motion.div
                  animate={instant ? undefined : { y: [0, -4, 0] }}
                  transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
                  className="text-[#0053FF]"
                >
                  <ImageUp className="h-6 w-6" strokeWidth={2} />
                </motion.div>
                <span className="text-[12px] font-bold text-slate-700">
                  Drop the camera roll here
                </span>
                <span className="text-[10.5px] text-slate-500">
                  JPG or RAW, batch upload
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-2.5 grid grid-cols-4 grid-rows-3 gap-1.5"
              >
                {UPLOAD_PHOTOS.map((src, i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={
                      i < count
                        ? { opacity: 1, scale: 1, y: 0 }
                        : { opacity: 0, scale: 0.82, y: 10 }
                    }
                    transition={{
                      duration: 0.34,
                      ease: ENTER,
                      delay: i < count ? Math.min(i, 4) * 0.02 : 0,
                    }}
                    className="relative overflow-hidden rounded-md bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2 border-t border-slate-100 px-3 py-2.5">
          <div className="flex items-center justify-between text-[10.5px] font-bold">
            <span className={settled ? "text-emerald-700" : "text-slate-600"}>
              {settled ? (
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                  12 photos in the album
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  Uploading
                  <span className="tabular-nums text-slate-500">{count}/12</span>
                </span>
              )}
            </span>
            <span className="tabular-nums text-slate-500">
              {settled ? "100%" : filling ? `${Math.round((count / 12) * 100)}%` : "0%"}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className={`h-full rounded-full ${settled ? "bg-emerald-500" : "bg-[#0053FF]"}`}
              initial={false}
              animate={{ width: filling ? `${(count / 12) * 100}%` : "0%" }}
              transition={instant ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2 — Turn to the camera                                         */
/* ------------------------------------------------------------------ */

const SELFIE_BEATS = [1000, 1200, 650, 1200, 900] as const;

const TURN_CUE = [
  "Look straight",
  "Turn left",
  "Back to center",
  "Turn right",
  "Look straight",
];

function SelfieDemo() {
  const { ref, instant, runKey } = useDemo();
  const stage = useStages(SELFIE_BEATS, runKey, instant);

  const i = Math.min(stage, 4);
  const showingLeft = stage === 1;
  const showingRight = stage === 3;
  const flash = stage === 1 || stage === 3;
  const cue = TURN_CUE[i];

  return (
    <div
      ref={ref}
      className="relative flex h-[330px] items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(160deg,#0B1B3D_0%,#0B1B3D_52%,#123063_100%)] shadow-[0_18px_34px_-22px_rgba(0,0,0,0.65)] ring-1 ring-white/25"
    >
      <p aria-live="polite" className="sr-only">
        {cue}.
      </p>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-[-14%] scale-110 bg-cover bg-center opacity-45 blur-2xl"
          style={{ backgroundImage: `url(${FACE_FRONT})` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,27,61,0.55)_0%,rgba(11,27,61,0.25)_45%,rgba(11,27,61,0.75)_100%)]" />
      </div>

      <div className="relative w-[216px] max-w-full">
        <div className="relative h-[258px] overflow-hidden rounded-[22px] bg-[#DCE4FA] ring-1 ring-white/25 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.9)]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${FACE_FRONT})` }}
          />
          <motion.div
            initial={false}
            animate={{ opacity: showingLeft ? 1 : 0 }}
            transition={{ duration: 0.26, ease: ENTER }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${FACE_LEFT})` }}
          />
          <motion.div
            initial={false}
            animate={{ opacity: showingRight ? 1 : 0 }}
            transition={{ duration: 0.26, ease: ENTER }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${FACE_RIGHT})` }}
          />

          {flash && (
            <motion.span
              key={`flash-${stage}`}
              initial={{ opacity: 0.24 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 bg-white"
            />
          )}

          {flash && (
            <motion.div
              key={`frame-${stage}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-none absolute inset-x-[15%] bottom-[17%] top-[3%]"
            >
              <div className="absolute inset-0 rounded-[20px] border border-[#8AC4FF]/55 bg-[#0053FF]/[0.05] shadow-[0_0_22px_rgba(76,134,255,0.35),inset_0_0_18px_rgba(76,134,255,0.2)]" />
              <span className="absolute -left-px -top-px h-5 w-5 rounded-tl-[10px] border-l-2 border-t-2 border-[#8AC4FF]" />
              <span className="absolute -right-px -top-px h-5 w-5 rounded-tr-[10px] border-r-2 border-t-2 border-[#8AC4FF]" />
              <span className="absolute -bottom-px -left-px h-5 w-5 rounded-bl-[10px] border-b-2 border-l-2 border-[#8AC4FF]" />
              <span className="absolute -bottom-px -right-px h-5 w-5 rounded-br-[10px] border-b-2 border-r-2 border-[#8AC4FF]" />
            </motion.div>
          )}

          {flash && (
            <motion.span
              key={`scan-${stage}`}
              initial={{ top: "-14%" }}
              animate={{ top: "102%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-x-0 h-16 -translate-y-1/2 bg-[linear-gradient(180deg,rgba(37,99,255,0)_0%,rgba(37,99,255,0.28)_42%,rgba(138,196,255,0.9)_50%,rgba(37,99,255,0.28)_58%,rgba(37,99,255,0)_100%)]"
            />
          )}
        </div>

        <div className="mt-3 text-center text-[11px] font-semibold tracking-wide text-slate-200">
          {cue}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3 — Download what is yours                                     */
/* ------------------------------------------------------------------ */

const DOWNLOAD_BEATS = [1200, 1700, 800] as const;

function DownloadDemo() {
  const { ref, instant, runKey } = useDemo();
  const stage = useStages(DOWNLOAD_BEATS, runKey, instant);
  const downloading = stage === 1;
  const done = stage >= 2;

  const [saved, setSaved] = useState(0);
  useEffect(() => {
    const timers: number[] = [];
    const defer = (fn: () => void) => timers.push(window.setTimeout(fn, 0));
    const cleanup = () => {
      timers.forEach((t) => window.clearTimeout(t));
    };

    if (instant || stage >= 2) {
      defer(() => setSaved(MATCHED.length));
      return cleanup;
    }
    if (stage < 1) {
      defer(() => setSaved(0));
      return cleanup;
    }

    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setSaved(i);
      if (i >= MATCHED.length) window.clearInterval(timer);
    }, 240);

    return () => {
      cleanup();
      window.clearInterval(timer);
    };
  }, [stage, runKey, instant]);

  return (
    <div
      ref={ref}
      className="relative h-[330px] overflow-hidden rounded-2xl bg-white/85 p-4 shadow-[0_18px_34px_-22px_rgba(11,27,61,0.45)] ring-1 ring-white/60 sm:p-5"
    >
      <p aria-live="polite" className="sr-only">
        {done
          ? `All ${MATCHED.length} matching photos saved to the gallery.`
          : downloading
            ? "Downloading your matching photos."
            : `${MATCHED.length} photos matched to you.`}
      </p>

      <div className="mx-auto flex h-full w-full max-w-[420px] flex-col justify-center rounded-xl bg-white p-3 ring-1 ring-slate-900/[0.07]">
        <div className="flex items-baseline justify-between pb-2.5">
          <span className="text-[11px] font-extrabold text-slate-800">
            Matched to you
          </span>
          <span className="text-[10.5px] font-semibold tabular-nums text-slate-500">
            {MATCHED.length} of 8
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {GALLERY_PHOTOS.map((src, i) => {
            const matched = MATCHED.includes(i);
            const isSaved = matched && saved >= MATCHED.indexOf(i) + 1;
            return (
              <div
                key={i}
                className={`relative aspect-[4/3] overflow-hidden rounded-md ${matched ? "ring-1 ring-[#FCAA02]/70" : ""
                  }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={`h-full w-full object-cover transition-all duration-500 ${matched ? "opacity-100" : "opacity-25 grayscale"
                    }`}
                />
                {isSaved && (
                  <motion.span
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.18, ease: ENTER }}
                    className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white"
                  >
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-[#FCAA02]"}`}
              initial={false}
              animate={{ width: `${(saved / MATCHED.length) * 100}%` }}
              transition={instant ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between text-[10.5px] font-bold">
            <span
              className={
                done
                  ? "inline-flex items-center gap-1 text-emerald-700"
                  : "text-slate-600"
              }
            >
              {done ? (
                <>
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                  Saved to your gallery
                </>
              ) : downloading ? (
                `Downloading ${saved} of ${MATCHED.length}`
              ) : (
                "Ready to download"
              )}
            </span>
            <span className="text-slate-500">4K originals</span>
          </div>
        </div>

        <div className="mt-3 flex justify-center">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10.5px] font-extrabold text-white transition-colors duration-300 ${done ? "bg-emerald-600" : "bg-[#0053FF]"
              }`}
          >
            <Download className="h-3 w-3" strokeWidth={2.5} />
            {done ? "Downloaded" : "Download all"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

function StepCard({
  step,
  label,
  title,
  body,
  children,
}: {
  step: string;
  label: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative flex h-full">
      <div className="relative h-full w-full rounded-[26px] transition-transform duration-300 hover:-translate-y-0.5">
        <GlowingEffect blur={0} borderWidth={2} spread={40} glow={true} disabled={false} proximity={70} inactiveZone={0.01} />

        <div className="relative flex h-full flex-col gap-5 overflow-hidden rounded-[26px] bg-[linear-gradient(155deg,#F8F9FB_0%,#F3F5F9_55%,#EDF0F5_100%)] p-6 text-slate-900 ring-1 ring-slate-200/80 sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/70 blur-[55px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[#FCAA02]/10 blur-[60px]"
          />

          <div className="relative space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[11px] font-extrabold tabular-nums text-[#0B1B3D] shadow-sm ring-1 ring-slate-200">
                {step}
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-600">
                {label}
              </span>
            </div>
            <h3 className="font-balimo text-2xl font-extrabold leading-[1.15] tracking-tight">{title}</h3>
            <p className="text-[13px] leading-relaxed text-slate-600">{body}</p>
          </div>

          <div className="relative mt-auto">{children}</div>
        </div>
      </div>
    </li>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            How Sharext works?
          </h2>
        </header>

        <ol className="mt-14 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
          <StepCard
            step="01"
            label="Upload"
            title="The host uploads the album"
            body="Drop the camera roll into one event. Duplicates are dropped as they arrive, so nobody sorts anything by hand."
          >
            <UploadDemo />
          </StepCard>

          <StepCard
            step="02"
            label="Scan"
            title="Attendee upload their selfie"
            body="Look straight, then turn slowly to each side. Three frames are enough for the face to be matched."
          >
            <SelfieDemo />
          </StepCard>

          <StepCard
            step="03"
            label="Download"
            title="Download what's yours"
            body="Every frame you appear in lands in one gallery at full resolution. Take all of it in a single tap."
          >
            <DownloadDemo />
          </StepCard>
        </ol>
      </div>
    </section>
  );
}
