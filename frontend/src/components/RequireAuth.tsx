"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { auth, type AccountUser } from "@/lib/auth";

type GateState = "checking" | "ready";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GateState>("checking");
  const [user, setUser] = useState<AccountUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const currentPath = `${window.location.pathname}${window.location.search}`;

    async function check() {
      const token = auth.getToken();
      if (!token) {
        router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
        return;
      }

      const account = await auth.me();
      if (cancelled) return;

      if (!account) {
        await auth.logout();
        router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
        return;
      }

      setUser(account);
      setState("ready");
    }

    check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (state === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-sm text-slate-500">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        Checking your session
      </div>
    );
  }

  return (
    <>
      <span className="sr-only" data-account-email={user?.email ?? ""} />
      {children}
    </>
  );
}
