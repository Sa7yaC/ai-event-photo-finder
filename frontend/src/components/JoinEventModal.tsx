"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, X } from "lucide-react";

interface JoinEventModalProps {
  open: boolean;
  onClose: () => void;
}

export function JoinEventModal({ open, onClose }: JoinEventModalProps) {
  const [joinSlug, setJoinSlug] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const router = useRouter();

  const handleClose = () => {
    setJoinSlug("");
    onClose();
  };

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    const getFocusable = () =>
      panelRef.current
        ? Array.from(
            panelRef.current.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter((element) => element.offsetParent !== null)
        : [];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setJoinSlug("");
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      window.clearTimeout(focusTimer);
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-event-title"
        aria-describedby="join-event-hint"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0053FF]/10 text-[#0053FF]">
              <UserCheck className="h-4 w-4" />
            </span>
            <div>
              <h2 id="join-event-title" className="text-base font-bold text-slate-900">
                Join an event
              </h2>
              <p id="join-event-hint" className="mt-0.5 text-xs text-slate-500">
                Use the code or link the host shared with you.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0053FF]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const slug = joinSlug.trim();
            if (slug) router.push(`/events/${slug}`);
          }}
          className="mt-5 space-y-4"
        >
          <div>
            <label htmlFor="join-event-code" className="block text-xs font-semibold text-slate-700">
              Event code or link
            </label>
            <input
              ref={inputRef}
              id="join-event-code"
              name="event-code"
              type="text"
              required
              autoComplete="off"
              placeholder="e.g. houston-wedding-2026"
              value={joinSlug}
              onChange={(event) => setJoinSlug(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0053FF] focus:outline-none focus:ring-2 focus:ring-[#0053FF]/25"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              Take a selfie once the event opens to find your photos.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#0053FF] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0047db]"
            >
              Find my photos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
