"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { api } from "@/lib/api";
import { 
  CalendarPlus, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Copy, 
  Check, 
  ArrowRight 
} from "lucide-react";

export default function NewEventPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success modal / banner state
  const [createdEvent, setCreatedEvent] = useState<{ id: string; name: string; organizer_token: string } | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a valid event name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const event = await api.createEvent({
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        event_date: eventDate ? eventDate : undefined,
      });

      setCreatedEvent({
        id: event.id,
        name: event.name,
        organizer_token: event.organizer_token,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create event");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (createdEvent) {
      navigator.clipboard.writeText(createdEvent.organizer_token);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        {/* If event was just created, show secret token confirmation */}
        {createdEvent ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Event Created Successfully!</h2>
                <p className="text-xs text-slate-400">{createdEvent.name}</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <Key className="h-4 w-4" />
                <span>Secret Organizer Token (Saved to Browser)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                This token is required to upload photographs, access private galleries, and delete content. We have automatically cached it in your browser storage.
              </p>
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                <span className="truncate">{createdEvent.organizer_token}</span>
                <button
                  onClick={copyToken}
                  className="flex items-center gap-1 text-slate-400 hover:text-white shrink-0 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 transition-colors"
                >
                  {tokenCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-[11px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="text-[11px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => router.push(`/events/${createdEvent.id}/manage`)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20"
            >
              <span>Go to Event Management & Upload Photos</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Event Creation Form */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight">Create New Event</h1>
              <p className="text-slate-400 text-xs">
                Set up an event space to ingest photos and enable attendee selfie discovery.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Event Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. College Fest 2026, Annual Hackathon, Tech Summit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-slate-100 text-sm placeholder:text-slate-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Event Date <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-slate-100 text-sm placeholder:text-slate-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief context for organizers and attendees..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-slate-100 text-sm placeholder:text-slate-600 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
              >
                <CalendarPlus className="h-4 w-4" />
                <span>{loading ? "Creating Event..." : "Create Event"}</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
