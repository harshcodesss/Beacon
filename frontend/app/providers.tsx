"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

import { ToastProvider } from "@/components/Toast";

/** When the backend refresh session dies (idle or 30-day ceiling), the JWT
 * carries error="SessionExpired": clear the cookie session and land on the
 * login page. */
function SessionExpiryWatcher() {
  const { data } = useSession();
  useEffect(() => {
    if (data?.error === "SessionExpired") signOut({ callbackUrl: "/login" });
  }, [data?.error]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionExpiryWatcher />
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
