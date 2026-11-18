"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ArrowRight, CheckCircle2, Save } from "lucide-react";

interface Profile {
  name: string;
  email: string;
}

const DEFAULT_PROFILE: Profile = {
  name: "Satya",
  email: "satya@sharext.ai",
};

const STORAGE_KEY = "sharext_profile";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<Profile>;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile({
        name: stored.name?.trim() || DEFAULT_PROFILE.name,
        email: stored.email?.trim() || DEFAULT_PROFILE.email,
      });
    } catch {
      // Ignore malformed local data and keep the defaults.
    }
  }, []);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Saving can be blocked; the confirmation still appears for the session.
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  const initials = profile.name.trim().slice(0, 2).toUpperCase() || "?";

  return (
    <DashboardLayout>
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
        <header className="max-w-2xl space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Profile
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            Your account details and how photo matching works.
          </p>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <aside
            aria-label="Account summary"
            className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center md:self-start"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#0053FF] text-2xl font-bold text-white">
              {initials}
            </div>

            <div className="mt-4">
              <p className="text-xl font-bold text-slate-900">
                {profile.name.trim() || "Your name"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {profile.email.trim() || "No email set"}
              </p>
            </div>

            <span className="mt-4 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
              Premium member
            </span>

            <dl className="mt-5 w-full space-y-1 border-t border-slate-100 pt-4 text-left text-xs">
              <dt className="text-slate-500">Account type</dt>
              <dd className="font-semibold text-slate-900">Organizer and attendee</dd>
            </dl>
          </aside>

          <div className="space-y-4 md:col-span-2">
            <form
              onSubmit={handleSave}
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
            >
              <h2 className="text-base font-semibold text-slate-900">Personal information</h2>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Full name
                  </label>
                  <input
                    id="profile-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={profile.name}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, name: event.target.value }))
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0053FF] focus:outline-none focus:ring-2 focus:ring-[#0053FF]/25"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-email"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Email address
                  </label>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    spellCheck={false}
                    value={profile.email}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, email: event.target.value }))
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0053FF] focus:outline-none focus:ring-2 focus:ring-[#0053FF]/25"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                <p
                  role="status"
                  aria-live="polite"
                  className="text-xs font-semibold text-emerald-700"
                >
                  {saved && (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Profile saved
                    </span>
                  )}
                </p>

                <button
                  type="submit"
                  className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-[#0053FF] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0047db]"
                >
                  <Save className="h-4 w-4" />
                  <span>Save changes</span>
                </button>
              </div>
            </form>

            <section
              aria-labelledby="matching-heading"
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
            >
              <h2 id="matching-heading" className="text-base font-semibold text-slate-900">
                How photo matching works
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                Matching happens per event. When you open an event, you take a selfie and only
                the photos you appear in are returned. A profile selfie is not stored.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1">
                <Link
                  href="/dashboard?tab=participated"
                  className="inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-[#0053FF] hover:underline"
                >
                  Join an event
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/photos"
                  className="inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 hover:underline"
                >
                  Photo library
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
