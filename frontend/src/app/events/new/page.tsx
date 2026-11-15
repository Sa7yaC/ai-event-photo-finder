"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0053FF] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* If event was just created, show secret token confirmation */}
        {createdEvent ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-7 sm:p-9 space-y-6 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Event Created Successfully!</h2>
                <p className="text-sm font-semibold text-emerald-800">{createdEvent.name}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-[#0053FF] text-xs font-bold uppercase tracking-wider">
                <Key className="h-4 w-4 text-[#FCAA02]" />
                <span>Secret Organizer Token (Cached in Browser)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This token is required to upload photographs, access private galleries, and delete content. We have automatically cached it in your browser storage.
              </p>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto">
                <span className="truncate font-semibold">{createdEvent.organizer_token}</span>
                <button
                  onClick={copyToken}
                  className="flex items-center gap-1.5 text-slate-600 hover:text-[#0053FF] shrink-0 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition-colors font-sans text-xs font-semibold shadow-2xs"
                >
                  {tokenCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => router.push(`/events/${createdEvent.id}/manage`)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#0053FF] hover:bg-[#0047db] active:scale-98 text-white font-bold text-sm transition-all shadow-xl shadow-[#0053FF]/25 cursor-pointer"
            >
              <span>Go to Event Management &amp; Upload Photos</span>
              <ArrowRight className="h-4 w-4 text-[#FCAA02]" />
            </button>
          </div>
        ) : (
          /* Event Creation Form */
          <div className="rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-9 space-y-7 shadow-sm">
            <div className="space-y-1.5">
              <h1 className="font-balimo text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Create New Event
              </h1>
              <p className="text-slate-600 text-sm">
                Set up an event space to ingest photos and enable attendee selfie discovery.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Event Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wedding Gala 2026, College Fest, Tech Summit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0053FF] focus:bg-white focus:outline-none text-slate-900 text-sm placeholder:text-slate-400 transition-all shadow-2xs font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Event Date <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0053FF] focus:bg-white focus:outline-none text-slate-900 text-sm placeholder:text-slate-400 transition-all shadow-2xs font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief context for attendees and photographers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0053FF] focus:bg-white focus:outline-none text-slate-900 text-sm placeholder:text-slate-400 transition-all shadow-2xs resize-none font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#0053FF] hover:bg-[#0047db] active:scale-98 text-white font-extrabold text-sm transition-all shadow-xl shadow-[#0053FF]/25 disabled:opacity-50 cursor-pointer"
              >
                <CalendarPlus className="h-4 w-4 text-[#FCAA02]" />
                <span>{loading ? "Creating Event..." : "Create Event"}</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
