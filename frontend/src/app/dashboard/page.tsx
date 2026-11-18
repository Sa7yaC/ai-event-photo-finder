"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, EventItem } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { JoinEventModal } from "@/components/JoinEventModal";
import {
  CalendarPlus,
  ImageIcon,
  Share2,
  Check,
  ArrowRight,
  Camera,
} from "lucide-react";

const SAMPLE_PARTICIPATED_EVENTS = [
  {
    id: "pe-1",
    name: "Tech Summit 2026",
    slug: "tech-summit-2026",
    description: "Annual developer and AI keynote conference with 400+ attendees.",
    event_date: "Nov 12, 2026",
    matchedPhotos: 24,
  },
  {
    id: "pe-2",
    name: "Houston Wedding Gala",
    slug: "houston-wedding-2026",
    description: "Evening reception, speeches, and dance floor candid moments.",
    event_date: "Nov 10, 2026",
    matchedPhotos: 18,
  },
  {
    id: "pe-3",
    name: "Friends Cafe Reunion",
    slug: "friends-cafe-reunion",
    description: "Casual weekend brunch and group photo session.",
    event_date: "Nov 05, 2026",
    matchedPhotos: 9,
  },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function DashboardMain() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const isParticipatedTab = tabParam === "participated";

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const copiedEvent = events.find((event) => event.slug === copiedSlug);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listEvents();
      setEvents(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load events");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listEvents();
        if (!cancelled) setEvents(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load events");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const copyAttendeeLink = (slug: string) => {
    const url = `${window.location.origin}/events/${slug}`;
    navigator.clipboard.writeText(url).catch(() => {
      // Clipboard access can be blocked; the row still confirms visually.
    });
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="max-w-2xl space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {isParticipatedTab ? "Participated events" : "Events dashboard"}
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            {isParticipatedTab
              ? "Events you joined. Jump straight to the photos you appear in."
              : "Albums you host. Upload the camera roll, then share one attendee link."}
          </p>
        </div>

        {isParticipatedTab ? (
          <button
            onClick={() => setShowJoinModal(true)}
            className="inline-flex h-12 w-fit shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-[#0053FF] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0047db] active:scale-95"
          >
            <Camera className="h-4 w-4 text-[#FCAA02]" />
            <span>Join with code</span>
          </button>
        ) : (
          <Link
            href="/events/new"
            className="inline-flex h-12 w-fit shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-[#0053FF] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0047db]"
          >
            <CalendarPlus className="h-4 w-4 text-[#FCAA02]" />
            <span>Create new event</span>
          </Link>
        )}
      </div>

      <nav aria-label="Event lists" className="mt-6 border-b border-slate-200">
        <div className="flex items-center gap-7 overflow-x-auto">
          <Link
            href="/dashboard"
            aria-current={!isParticipatedTab ? "page" : undefined}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 pt-1 pb-3 text-sm font-semibold transition-colors ${
              !isParticipatedTab
                ? "border-[#0053FF] text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Organized</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                !isParticipatedTab ? "bg-[#0053FF]/10 text-[#0053FF]" : "bg-slate-100 text-slate-500"
              }`}
            >
              {loading ? "…" : events.length}
            </span>
          </Link>
          <Link
            href="/dashboard?tab=participated"
            aria-current={isParticipatedTab ? "page" : undefined}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 pt-1 pb-3 text-sm font-semibold transition-colors ${
              isParticipatedTab
                ? "border-[#0053FF] text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Participated</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                isParticipatedTab ? "bg-[#0053FF]/10 text-[#0053FF]" : "bg-slate-100 text-slate-500"
              }`}
            >
              {SAMPLE_PARTICIPATED_EVENTS.length}
            </span>
          </Link>
        </div>
      </nav>

      <div className="mt-6">
        {/* Organized: loading */}
        {!isParticipatedTab && loading && (
          <div aria-busy="true" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <p className="sr-only">Loading events</p>
            {[1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
              >
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-44 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="hidden h-5 w-16 animate-pulse rounded-full bg-slate-100 sm:block" />
                <div className="hidden h-3 w-24 animate-pulse rounded bg-slate-100 sm:block" />
                <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {/* Organized: error */}
        {!isParticipatedTab && !loading && error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-rose-800">
              <span className="font-semibold">Could not load events.</span>{" "}
              {error === "Failed to fetch" ? "Check your connection and try again." : error}
            </p>
            <button
              type="button"
              onClick={loadEvents}
              className="inline-flex h-10 w-fit shrink-0 cursor-pointer items-center whitespace-nowrap rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
            >
              Try again
            </button>
          </div>
        )}

        {/* Organized: empty */}
        {!isParticipatedTab && !loading && !error && events.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <h2 className="text-base font-semibold text-slate-900">No events yet</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Create an album, upload the camera roll, and share one link with everyone who was
                  there.
                </p>
              </div>
              <Link
                href="/events/new"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0053FF] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0047db]"
              >
                <CalendarPlus className="h-4 w-4 text-[#FCAA02]" />
                <span>Create event</span>
              </Link>
            </div>
          </div>
        )}

        {/* Organized: ledger */}
        {!isParticipatedTab && !loading && !error && events.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-[minmax(0,1fr)_90px_100px_260px] gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
              <span>Event</span>
              <span>Status</span>
              <span>Created</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {events.map((event) => {
                const isActive = event.status.toUpperCase() === "ACTIVE";
                return (
                  <li
                    key={event.id}
                    className="grid grid-cols-1 gap-2.5 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:px-5 lg:grid-cols-[minmax(0,1fr)_90px_100px_260px] lg:items-center lg:gap-4"
                  >
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-slate-900">{event.name}</h2>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {event.description?.trim() || event.slug}
                      </p>
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                          isActive ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span className="capitalize">{event.status.toLowerCase()}</span>
                      </span>
                    </div>

                    <div className="text-xs whitespace-nowrap text-slate-500">
                      {formatDate(event.created_at)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                      <Link
                        href={`/events/${event.id}/manage`}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-[#0053FF]/40 hover:text-[#0053FF]"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>Manage</span>
                      </Link>
                      <Link
                        href={`/events/${event.slug}`}
                        className="inline-flex h-10 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      >
                        <span>Preview</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyAttendeeLink(event.slug)}
                        aria-label={`Copy attendee link for ${event.name}`}
                        title="Copy attendee link"
                        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        {copiedSlug === event.slug ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Share2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Participated: local demo rows */}
        {isParticipatedTab && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-[minmax(0,1fr)_100px_100px_260px] gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
              <span>Event</span>
              <span>Attended</span>
              <span>Matches</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {SAMPLE_PARTICIPATED_EVENTS.map((event) => (
                <li
                  key={event.id}
                  className="grid grid-cols-1 gap-2.5 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:px-5 lg:grid-cols-[minmax(0,1fr)_100px_100px_260px] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-slate-900">{event.name}</h2>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{event.description}</p>
                  </div>

                  <div className="text-xs whitespace-nowrap text-slate-500">{event.event_date}</div>

                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {event.matchedPhotos} photos
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                    <Link
                      href={`/events/${event.slug}`}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0053FF] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#0047db]"
                    >
                      <Camera className="h-3.5 w-3.5 text-[#FCAA02]" />
                      <span>View photos</span>
                    </Link>
                    <Link
                      href={`/events/${event.slug}`}
                      className="inline-flex h-10 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <span>Public gallery</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {copiedEvent ? `Attendee link for ${copiedEvent.name} copied` : ""}
      </p>

      <JoinEventModal open={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-8 text-slate-500">Loading dashboard</div>}>
        <DashboardMain />
      </Suspense>
    </DashboardLayout>
  );
}
