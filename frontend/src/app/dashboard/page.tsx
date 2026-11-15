"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, EventItem } from "@/lib/api";
import { 
  Calendar, 
  CalendarPlus, 
  Image as ImageIcon, 
  Settings, 
  Share2, 
  Check, 
  Sparkles,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

export default function DashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

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
    loadEvents();
  }, []);

  const copyAttendeeLink = (slug: string) => {
    const url = `${window.location.origin}/events/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0053FF] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-slate-200 pb-8">
          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Organizer Dashboard
            </h1>
            <p className="text-slate-600 text-sm sm:text-base">
              Manage your event galleries, upload batches of photos, and track AI indexing.
            </p>
          </div>

          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0053FF] hover:bg-[#0047db] active:scale-95 text-white font-bold text-sm transition-all shadow-xl shadow-[#0053FF]/20 w-fit"
          >
            <CalendarPlus className="h-4 w-4 text-[#FCAA02]" />
            <span>Create New Event</span>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-3xl bg-white border border-slate-200 animate-pulse p-7 space-y-4 shadow-sm">
                <div className="h-6 w-3/4 bg-slate-100 rounded-lg"></div>
                <div className="h-4 w-1/2 bg-slate-100 rounded-lg"></div>
                <div className="h-10 w-full bg-slate-100 rounded-xl mt-6"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && events.length === 0 && (
          <div className="text-center py-20 px-6 rounded-3xl border border-dashed border-slate-300 bg-white max-w-lg mx-auto space-y-6 shadow-sm">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-[#0053FF]/10 border border-[#0053FF]/20 flex items-center justify-center text-[#0053FF]">
              <Sparkles className="h-8 w-8 text-[#FCAA02]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-slate-900">No Events Created Yet</h3>
              <p className="text-slate-600 text-sm max-w-sm mx-auto leading-relaxed">
                Create your first event to start uploading photographs. Attendees will use a simple selfie to discover every picture they appear in.
              </p>
            </div>
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#0053FF] hover:bg-[#0047db] text-white font-bold text-sm transition-all shadow-xl shadow-[#0053FF]/25 active:scale-95"
            >
              <CalendarPlus className="h-4 w-4 text-[#FCAA02]" />
              <span>Create Your First Event</span>
            </Link>
          </div>
        )}

        {/* Event Cards Grid */}
        {!loading && !error && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-3xl border border-slate-200/90 bg-white p-7 flex flex-col justify-between hover:border-[#0053FF]/50 transition-all hover:shadow-xl hover:shadow-slate-300/40 group shadow-sm"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-bold tracking-wider">
                      {event.status}
                    </span>
                    {event.event_date && (
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {event.event_date}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-[#0053FF] transition-colors leading-snug">
                    {event.name}
                  </h3>

                  {event.description && (
                    <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => copyAttendeeLink(event.slug)}
                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-semibold"
                    title="Copy attendee search link"
                  >
                    {copiedSlug === event.slug ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Share Link</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/events/${event.id}/manage`}
                    className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#0053FF]/10 text-[#0053FF] hover:bg-[#0053FF] hover:text-white transition-all border border-[#0053FF]/20 shadow-xs"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Manage</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
