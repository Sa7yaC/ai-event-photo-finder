"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function GoogleSignIn({ nextPath }: { nextPath: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    if (!supabase) {
      setError("Supabase is not configured. Add the Supabase URL and anonymous key.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      sessionStorage.setItem("oauth_next", nextPath);
    } catch {
      // Storage can be unavailable in private modes; fall back to the dashboard.
    }

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });

    if (oauthError) {
      setBusy(false);
      setError(oauthError.message);
      return;
    }

    // Supabase redirects the browser to Google; nothing else to do here.
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled
          title="Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable Google sign-in."
          className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-500"
        >
          <GoogleMark />
          Continue with Google
        </button>
        <p className="text-center text-[11px] leading-relaxed text-slate-400">
          Google sign-in is enabled once Supabase OAuth is configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <GoogleMark />}
        <span>{busy ? "Opening Google" : "Continue with Google"}</span>
      </button>
      {error && (
        <p role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      )}
      <p className="text-center text-[11px] text-slate-400">Secured by Supabase Auth</p>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-slate-200" />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">or</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.3 1.2-4 1.2a7 7 0 0 1-6.5-4.8H1.5v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.5 14.5a7.2 7.2 0 0 1 0-4.9V6.5H1.5a12 12 0 0 0 0 10.7l4-3Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.5 6.5l4 3.1A7 7 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
