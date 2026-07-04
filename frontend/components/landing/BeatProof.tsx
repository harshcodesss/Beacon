"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

export function BeatProof() {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-surface py-28 sm:py-36">
      {/* Last wisps of the fog. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-24 h-96 w-96 rounded-full bg-zinc-200/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-16 h-80 w-80 rounded-full bg-zinc-200/50 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl space-y-14 px-5 sm:px-8">
        <div className="space-y-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            06:58 AM — Beat 03
          </p>
          <h2 className="max-w-3xl text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            You wake up to the answer, not the alert.
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-zinc-600">
            The report below is a real Beacon triage: root cause, confidence, the evidence for
            it, and the fix — delivered to the dashboard, your inbox, and the failing pull
            request.
          </p>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 80, rotate: 1.6 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-2xl border border-edge bg-white shadow-2xl shadow-zinc-900/10"
        >
          <div className="flex items-center gap-3 border-b border-edge bg-surface px-4 py-2.5">
            <span className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
            </span>
            <span className="mx-auto rounded-md border border-edge bg-white px-3 py-0.5 font-mono text-[11px] text-zinc-500">
              beacon.local/incidents/629f64bd
            </span>
            <span className="w-12" aria-hidden />
          </div>
          <Image
            src="/hero/report.png"
            alt="A finished Beacon incident report: accepted root cause with confidence, verdicts for each hypothesis, and cited evidence"
            width={1600}
            height={1000}
            className="w-full"
          />
        </motion.div>
      </div>
    </section>
  );
}
