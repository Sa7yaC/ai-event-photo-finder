"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { auth } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";

function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const nextPath = searchParams.get("next") || "/dashboard";

  const [state, setState] = useState<"verifying" | "done" | "error">(
    token ? "verifying" : "error"
  );
  const [message, setMessage] = useState<string>(
    token ? "" : "This link is missing its verification token."
  );
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) return;

    auth
      .verifyEmail(token)
      .then(() => {
        setState("done");
        setMessage("Your email is verified and you are signed in.");
        window.setTimeout(() => router.replace(nextPath), 1200);
      })
      .catch((err: unknown) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : "This link is invalid or expired.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthShell
      title="Verify your email"
      subtitle="This confirms your address so you can sign in."
      footer={
        <Link href="/login" className="font-semibold text-[#0053FF] hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-4">
        {state === "verifying" && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking your verification link.</span>
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
            Sign in to request a new link
          </Link>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <VerifyEmail />
    </Suspense>
  );
}
