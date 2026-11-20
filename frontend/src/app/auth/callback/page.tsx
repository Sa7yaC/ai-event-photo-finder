"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/components/AuthShell";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");

  const [state, setState] = useState<"working" | "done" | "error">(
    oauthError ? "error" : "working"
  );
  const [message, setMessage] = useState(
    oauthError ? decodeURIComponent(oauthError) : ""
  );

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      if (oauthError) return;

      if (!supabase) {
        setState("error");
        setMessage("Supabase is not configured for this deployment.");
        return;
      }

      if (!code) {
        setState("error");
        setMessage("The sign-in response is missing its authorization code.");
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;
      if (exchangeError) {
        setState("error");
        setMessage(exchangeError.message);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const supabaseToken = data.session?.access_token;
      if (cancelled) return;
      if (!supabaseToken) {
        setState("error");
        setMessage("Google sign-in completed but no session was returned. Try again.");
        return;
      }

      try {
        await auth.exchangeSupabaseSession(supabaseToken);
        if (cancelled) return;
        setState("done");
        setMessage("Signed in with Google.");

        let destination = nextParam;
        if (!destination) {
          try {
            destination = sessionStorage.getItem("oauth_next");
          } catch {
            destination = null;
          }
        }
        window.setTimeout(() => router.replace(destination || "/dashboard"), 900);
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setMessage(err instanceof Error ? err.message : "Could not complete Google sign-in.");
      }
    }

    finish();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <AuthShell
      title="Completing sign-in"
      subtitle="Finishing the Google handoff with Supabase."
      footer={
        <Link href="/login" className="font-semibold text-[#0053FF] hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-4">
        {state === "working" && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Verifying your Google account.</span>
          </div>
        )}

        {state === "done" && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message} Taking you to your dashboard.</span>
          </div>
        )}

        {state === "error" && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {state === "error" && (
          <Link
            href="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0053FF] text-sm font-bold text-white transition-colors hover:bg-[#0047db]"
          >
            Try signing in again
          </Link>
        )}
      </div>
    </AuthShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <CallbackContent />
    </Suspense>
  );
}
