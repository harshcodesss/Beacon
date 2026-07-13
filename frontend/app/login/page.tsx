"use client";

/* Dedicated sign-in page. GitHub is the only real provider; the checkbox
 * decides session length. Its value rides a short-lived cookie through the
 * OAuth redirect, where the NextAuth jwt callback picks it up. */

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** Little pixel robot perched on the card's top edge, legs dangling over it.
 *  It bobs, blinks, and idly kicks a leg. */
function PixelBuddy() {
  const reduced = useReducedMotion() ?? false;
  const BODY = "#ff7f11";
  const DARK = "#262626";

  const blink = reduced
    ? {}
    : {
        animate: { scaleY: [1, 1, 0.15, 1, 1] },
        transition: {
          duration: 0.5,
          times: [0, 0.4, 0.6, 0.8, 1],
          repeat: Infinity,
          repeatDelay: 2.6,
        },
      };

  return (
    <motion.svg
      viewBox="0 0 28 20"
      width={64}
      height={46}
      shapeRendering="crispEdges"
      aria-hidden
      className="pointer-events-none absolute -top-[31px] left-1/2 -translate-x-1/2"
      animate={reduced ? undefined : { y: [0, -2, 0] }}
      transition={reduced ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* ears */}
      <rect x={4} y={0} width={3} height={2} fill={BODY} />
      <rect x={21} y={0} width={3} height={2} fill={BODY} />
      {/* body, softly rounded by stepping the outline */}
      <rect x={2} y={2} width={24} height={12} fill={BODY} />
      <rect x={1} y={3} width={26} height={10} fill={BODY} />
      <rect x={0} y={4} width={28} height={8} fill={BODY} />
      {/* eyes: squash to a line every few seconds */}
      <motion.rect
        x={7}
        y={6}
        width={3}
        height={3}
        fill={DARK}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        {...blink}
      />
      <motion.rect
        x={18}
        y={6}
        width={3}
        height={3}
        fill={DARK}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        {...blink}
      />
      {/* legs, dangling over the card edge */}
      <motion.rect
        x={6}
        y={14}
        width={3}
        height={4}
        fill={BODY}
        animate={reduced ? undefined : { y: [0, 1, 0] }}
        transition={
          reduced
            ? undefined
            : { duration: 1.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.1 }
        }
      />
      <rect x={13} y={14} width={3} height={5} fill={BODY} />
      <motion.rect
        x={19}
        y={14}
        width={3}
        height={4}
        fill={BODY}
        animate={reduced ? undefined : { y: [0, 1, 0] }}
        transition={
          reduced
            ? undefined
            : { duration: 1.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.9, delay: 0.6 }
        }
      />
    </motion.svg>
  );
}

const ERROR_COPY: Record<string, string> = {
  AccessDenied: "GitHub sign-in was cancelled. Try again when you're ready.",
  SessionRequired: "Please sign in to continue.",
  OAuthCallback: "GitHub did not complete the sign-in. Please try again.",
};

function LoginCard() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const errorText = errorCode
    ? (ERROR_COPY[errorCode] ?? "Sign-in failed. Please try again.")
    : null;

  const [providers, setProviders] = useState<Record<string, { id: string }> | null>(null);
  const [remember, setRemember] = useState(false);
  const [devEmail, setDevEmail] = useState("demo@beacon.dev");

  useEffect(() => {
    getProviders().then((p) => setProviders(p as Record<string, { id: string }> | null));
  }, []);

  const github = Boolean(providers?.github);
  const dev = Boolean(providers?.dev);
  const loading = providers === null;

  const stampRememberCookie = () => {
    // 10 minutes is plenty to make it through GitHub and back
    document.cookie = `beacon.remember=${remember ? "1" : "0"}; path=/; max-age=600; samesite=lax`;
  };

  const signInGitHub = () => {
    stampRememberCookie();
    signIn("github", { callbackUrl: "/home" });
  };

  const signInDev = (event: React.FormEvent) => {
    event.preventDefault();
    signIn("dev", { email: devEmail, remember: remember ? "1" : "0", callbackUrl: "/home" });
  };

  return (
    <div className="relative z-10 w-full max-w-md">
      <PixelBuddy />
      <div className="rounded-2xl border border-edge bg-white p-8 shadow-2xl">
        <div className="flex items-start justify-between">
          {/* expands on hover: arrow first, then the words slide in */}
          <Link
            href="/"
            aria-label="Go back"
            className="group flex h-11 w-11 items-center overflow-hidden rounded-full border border-edge bg-white pl-[13px] text-zinc-600 transition-all duration-300 ease-out hover:w-[6.9rem] hover:border-zinc-400 hover:text-zinc-900"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 shrink-0"
              aria-hidden
            >
              <path
                d="M11.5 4.5 6 10l5.5 5.5M6.5 10H17"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="ml-2 whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              Go back
            </span>
          </Link>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-xl text-beacon">
            ⌁
          </span>
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-zinc-900">
          Sign in to Beacon
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          One GitHub account, and your next failed deploy arrives with a report.
        </p>

        {errorText && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700"
          >
            {errorText}
          </p>
        )}

        <button
          type="button"
          onClick={signInGitHub}
          disabled={!github}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-ink text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GitHubMark className="h-[18px] w-[18px]" />
          Continue with GitHub
        </button>
        {!github && !loading && (
          <p className="mt-2 text-center text-[11px] text-zinc-400">
            GitHub sign-in is not configured on this server.
          </p>
        )}

        <label className="mt-6 flex cursor-pointer items-center gap-3.5">
          <span className="relative">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="peer absolute opacity-0"
            />
            <span
              className="block h-5 w-5 rounded-[4px] border-2 border-ink bg-zinc-200 shadow-[2.5px_2.5px_0_0_#262626] transition-all duration-300 after:absolute after:left-[6px] after:top-[2px] after:hidden after:h-[11px] after:w-[5.5px] after:rotate-45 after:border-white after:border-b-[2px] after:border-r-[2px] after:content-[''] peer-checked:bg-beacon peer-checked:after:block peer-focus-visible:ring-2 peer-focus-visible:ring-beacon/50 peer-focus-visible:ring-offset-2"
              aria-hidden
            />
          </span>
          <span className="text-[13px] leading-snug text-zinc-700">
            Keep me signed in for 30 days
            <span className="mt-0.5 block text-[11px] leading-snug text-zinc-400">
              Otherwise you are signed out after 24 hours of inactivity.
            </span>
          </span>
        </label>

        {dev && (
          <>
            <div className="mt-6 flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-edge" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                dev mode
              </span>
              <span className="h-px flex-1 bg-edge" />
            </div>
            <form onSubmit={signInDev} className="mt-4 flex items-center gap-2">
              <input
                type="email"
                required
                value={devEmail}
                onChange={(event) => setDevEmail(event.target.value)}
                aria-label="Dev sign-in email"
                className="h-9 flex-1 rounded-lg border border-edge bg-surface px-3 font-mono text-[12px] text-zinc-800 outline-none focus:border-zinc-400"
              />
              <button
                type="submit"
                className="h-9 rounded-lg bg-ink px-3.5 font-mono text-[11px] uppercase tracking-wider text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-black hover:shadow-lg active:translate-y-0 active:shadow-md"
              >
                dev →
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-zinc-950 px-5 py-16">
      <Suspense>
        <LoginCard />
      </Suspense>
    </main>
  );
}
