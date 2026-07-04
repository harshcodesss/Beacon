"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import type { LandingAuth } from "@/components/landing/useLandingAuth";

function LiveClock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString(undefined, {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span suppressHydrationWarning>{now ?? "--:--:--"} LOCAL</span>;
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** Hand-drawn orange ellipse around "found," — draws itself in after load. */
function Annotation() {
  return (
    <svg
      viewBox="0 0 320 130"
      fill="none"
      aria-hidden
      className="pointer-events-none absolute -inset-x-[12%] -inset-y-[18%] h-[136%] w-[124%] -rotate-2"
    >
      <motion.path
        d="M36 68 C30 30, 96 8, 166 10 C242 12, 300 32, 296 66 C292 102, 214 122, 138 118 C66 114, 30 96, 40 60"
        stroke="#f5a623"
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.9 }}
        transition={{ delay: 1.3, duration: 1.1, ease: "easeInOut" }}
      />
    </svg>
  );
}

const lineReveal = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
});

export function Hero({ auth }: { auth: LandingAuth }) {
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [devEmail, setDevEmail] = useState("demo@beacon.dev");

  useEffect(() => {
    if (reduced) videoRef.current?.pause();
  }, [reduced]);

  const ctaLabel =
    auth.github === null ? "Sign in" : auth.github ? "Sign in with GitHub" : "Try the demo";

  return (
    <section id="top" className="relative h-svh min-h-[640px] overflow-hidden bg-zinc-950">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay={!reduced}
        muted
        loop
        playsInline
        preload="auto"
        poster="/hero/fog-poster.jpg"
        aria-hidden
      >
        <source src="/hero/fog.mp4" type="video/mp4" />
      </video>

      {/* Lighthouse beam — the only color in the scene. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div className="hero-beam" />
        <div className="hero-beam-source" />
      </div>

      {/* Legibility scrim over the ridge + dissolve into the light page. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-surface"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col px-5 sm:px-8">
        {/* Telemetry strip (instrument chrome). */}
        <motion.div
          {...lineReveal(0.9)}
          className="flex items-center justify-between gap-3 pt-24 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-700"
        >
          <span className="rounded-full bg-white/55 px-3 py-1 backdrop-blur-sm">
            Beacon — state: watching
          </span>
          <span className="hidden rounded-full bg-white/55 px-3 py-1 backdrop-blur-sm md:inline">
            last triage: 4s wall clock · agent core: online
          </span>
          <span className="rounded-full bg-white/55 px-3 py-1 backdrop-blur-sm">
            <LiveClock />
          </span>
        </motion.div>

        <div className="flex-1" />

        {/* Staircase headline over the dark ridge. */}
        <h1 className="text-[clamp(3.1rem,9vw,7.75rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-white">
          <motion.span {...lineReveal(0.1)} className="block">
            Root cause,
          </motion.span>
          <motion.span {...lineReveal(0.25)} className="relative ml-[0.75em] block w-fit">
            found,
            <Annotation />
          </motion.span>
          <motion.span {...lineReveal(0.4)} className="ml-[1.5em] block">
            before you wake.
          </motion.span>
        </h1>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-8 pb-16">
          <motion.div {...lineReveal(0.6)} className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={auth.signInPrimary}
                className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-7 text-sm font-semibold text-zinc-900 transition-colors hover:bg-beacon hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beacon"
              >
                {auth.github ? <GitHubMark /> : null}
                {ctaLabel}
                <span aria-hidden>→</span>
              </button>
              <a
                href="#story"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                See how it works ↓
              </a>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
              Evidence-cited · budget-capped · every claim verified
            </p>
            {auth.dev ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  auth.signInDev(devEmail);
                }}
              >
                <input
                  type="email"
                  required
                  value={devEmail}
                  onChange={(event) => setDevEmail(event.target.value)}
                  aria-label="Dev sign-in email"
                  className="h-8 w-48 rounded-full border border-zinc-500/30 bg-white/60 px-3 font-mono text-[11px] text-zinc-800 placeholder-zinc-500 outline-none backdrop-blur-sm focus:border-beacon"
                />
                <button
                  type="submit"
                  className="h-8 rounded-full border border-zinc-500/30 bg-white/60 px-3 font-mono text-[11px] uppercase tracking-wider text-zinc-700 backdrop-blur-sm transition-colors hover:border-beacon hover:text-zinc-900"
                >
                  dev →
                </button>
              </form>
            ) : null}
          </motion.div>

          <motion.p
            {...lineReveal(0.75)}
            className="max-w-xs text-right text-sm leading-relaxed text-zinc-300 [text-shadow:0_1px_14px_rgba(0,0,0,0.6)]"
          >
            When a deploy fails at 3 AM, Beacon reads the logs, investigates competing hypotheses
            with real tool calls, and hands you an evidence-cited report.
          </motion.p>
        </div>

        {/* Scroll affordance. */}
        <motion.div
          {...lineReveal(1.1)}
          className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-500">
            Scroll — follow the signal
          </span>
          <span className="scroll-tick h-7 w-px bg-zinc-500" />
        </motion.div>
      </div>
    </section>
  );
}
