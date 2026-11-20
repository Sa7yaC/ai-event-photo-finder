"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { auth } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { AuthDivider, GoogleSignIn } from "@/components/GoogleSignIn";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await auth.signup({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (result.verification_token) {
        setVerificationToken(result.verification_token);
      } else {
        setVerificationToken("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setSubmitting(false);
    }
  };

  if (verificationToken !== null) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a verification link to ${email.trim() || "your inbox"}. Open it once to activate your account.`}
        footer={
          <>
            Already verified?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              className="font-semibold text-[#0053FF] hover:underline"
            >
              Sign in
            </Link>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Your account is created. It becomes active after you verify your email.</span>
          </div>

          {verificationToken ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Local development shortcut
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Email delivery is not configured, so continue here instead of your inbox.
              </p>
              <Link
                href={`/verify-email?token=${encodeURIComponent(verificationToken)}&next=${encodeURIComponent(nextPath)}`}
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#0053FF] text-sm font-bold text-white transition-colors hover:bg-[#0047db]"
              >
                Verify email now
              </Link>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-slate-500">
              The link expires in 24 hours. You can request a new one from the sign-in screen.
            </p>
          )}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create an account"
      subtitle="One account for hosting albums and finding your own photos."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="font-semibold text-[#0053FF] hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <GoogleSignIn nextPath={nextPath} />
        <AuthDivider />
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-700">
            Full name
          </label>
          <input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0053FF] focus:outline-none focus:ring-2 focus:ring-[#0053FF]/25"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700">
            Email address
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0053FF] focus:outline-none focus:ring-2 focus:ring-[#0053FF]/25"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700">
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0053FF] focus:outline-none focus:ring-2 focus:ring-[#0053FF]/25"
            placeholder="At least 8 characters"
          />
          <p className="mt-1.5 text-[11px] text-slate-500">Use 8 or more characters.</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0053FF] text-sm font-bold text-white transition-colors hover:bg-[#0047db] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
          <span>Create account</span>
        </button>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <SignupForm />
    </Suspense>
  );
}
