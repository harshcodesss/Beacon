"use client";

import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

export function SignInButtons() {
  const [providers, setProviders] = useState<Record<string, { id: string }> | null>(null);
  const [devEmail, setDevEmail] = useState("demo@beacon.dev");

  useEffect(() => {
    getProviders().then((p) => setProviders(p as Record<string, { id: string }> | null));
  }, []);

  if (!providers) {
    return <div className="h-11 w-56 animate-pulse rounded-md bg-zinc-800/70" />;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {providers.google ? (
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-beacon px-6 text-sm font-semibold text-black transition hover:bg-beacon/90"
        >
          Sign in with Google
        </button>
      ) : null}
      {providers.dev ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            signIn("dev", { email: devEmail, callbackUrl: "/dashboard" });
          }}
        >
          <input
            type="email"
            required
            value={devEmail}
            onChange={(event) => setDevEmail(event.target.value)}
            className="h-10 w-52 rounded-md border border-edge bg-surface-raised px-3 text-sm text-zinc-200 outline-none focus:border-beacon/60"
            placeholder="you@example.com"
            aria-label="Dev sign-in email"
          />
          <button
            type="submit"
            className="h-10 rounded-md border border-edge px-4 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          >
            Dev sign-in
          </button>
        </form>
      ) : null}
      {!providers.google && !providers.dev ? (
        <p className="text-sm text-red-300">
          No auth providers configured — set GOOGLE_CLIENT_ID or AUTH_DEV_MODE=true.
        </p>
      ) : null}
    </div>
  );
}
