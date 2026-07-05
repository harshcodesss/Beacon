"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import type { LandingAuth } from "@/components/landing/useLandingAuth";
import { Highlighter } from "@/components/ui/highlighter";
import { NoiseTexture } from "@/components/ui/noise-texture";

const lineReveal = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
});

/** Soft white fog banks along the bottom edge — they dissolve the orange
 *  hero into the story section below. */
function FogBank({ reduced }: { reduced: boolean }) {
  const drift = (duration: number, delay: number, reverse = false) =>
    reduced
      ? undefined
      : {
          animation: `noise-drift ${duration}s ease-in-out ${delay}s infinite ${
            reverse ? "alternate-reverse" : "alternate"
          }`,
        };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-72 overflow-hidden">
      <div
        className="absolute -bottom-28 -left-[12%] h-64 w-[58%] rounded-full bg-white/70 blur-3xl"
        style={drift(26, 0)}
      />
      <div
        className="absolute -bottom-36 left-[24%] h-80 w-[62%] rounded-full bg-white/60 blur-3xl"
        style={drift(34, -8, true)}
      />
      <div
        className="absolute -bottom-28 right-[-14%] h-60 w-[52%] rounded-full bg-white/70 blur-3xl"
        style={drift(30, -16)}
      />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-surface" />
    </div>
  );
}

export function Hero({ auth }: { auth: LandingAuth }) {
  const reduced = useReducedMotion() ?? false;
  const [devEmail, setDevEmail] = useState("demo@beacon.dev");

  const reveal = (delay: number) => (reduced ? {} : lineReveal(delay));

  return (
    <section
      id="top"
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-beacon px-5 sm:px-8"
    >
      <NoiseTexture aria-hidden className="opacity-40 mix-blend-soft-light" noiseOpacity={0.55} />
      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center">
        <motion.p
          {...reveal(0.05)}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white/20 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-hidden />
          Deploy failed 03:10 · report ready 03:15
        </motion.p>

        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          <motion.span {...reveal(0.15)} className="block">
            Production breaks fast.
          </motion.span>
          <motion.span {...reveal(0.28)} className="block">
            Beacon answers faster.
          </motion.span>
        </h1>

        <motion.p
          {...reveal(0.45)}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/75 sm:text-xl"
        >
          <span className="sm:block">
            The moment something fails, Beacon{" "}
            <Highlighter action="highlight" color="rgba(255,255,255,0.85)" animate={false} isView>
              starts investigating
            </Highlighter>
            .
          </span>{" "}
          <span className="sm:block">
            <Highlighter action="underline" color="#262626" strokeWidth={2} animate={false} isView>
              Root cause in minutes
            </Highlighter>
            , with evidence behind every claim.
          </span>
        </motion.p>

        <motion.div {...reveal(0.6)} className="mt-10 flex flex-wrap items-center justify-center gap-5">
          <button
            type="button"
            onClick={auth.signInPrimary}
            className="inline-flex h-12 items-center gap-2.5 rounded-full bg-ink px-8 text-sm font-semibold text-white shadow-sm transition-all hover:bg-black hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Get started
            <span aria-hidden>→</span>
          </button>
          <a
            href="#story"
            className="text-sm font-medium text-ink/70 transition-colors hover:text-ink"
          >
            See how it works ↓
          </a>
        </motion.div>

        <motion.p
          {...reveal(0.72)}
          className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60"
        >
          Evidence-cited · budget-capped · every claim verified
        </motion.p>

        {auth.dev ? (
          <motion.form
            {...reveal(0.82)}
            className="mt-5 flex items-center gap-2"
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
              className="h-8 w-48 rounded-full border border-ink/20 bg-white/80 px-3 font-mono text-[11px] text-ink placeholder-zinc-400 outline-none focus:border-ink"
            />
            <button
              type="submit"
              className="h-8 rounded-full border border-ink/20 bg-white/80 px-3 font-mono text-[11px] uppercase tracking-wider text-ink/70 transition-colors hover:border-ink hover:text-ink"
            >
              dev →
            </button>
          </motion.form>
        ) : null}
      </div>

      <FogBank reduced={reduced} />
    </section>
  );
}
