"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function NavBar() {
  const { data: session, status } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-beacon/15 text-beacon">
            ⌁
          </span>
          <span className="text-sm font-semibold tracking-wide text-zinc-100">Beacon</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {status === "authenticated" ? (
            <>
              <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100">
                Dashboard
              </Link>
              <span className="hidden text-xs text-zinc-600 sm:inline">
                {session.user?.email}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md border border-edge px-3 py-1.5 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
              >
                Sign out
              </button>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
