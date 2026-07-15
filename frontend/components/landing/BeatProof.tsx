"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

import { Reveal, Stamp } from "@/components/landing/scroll";

const EVIDENCE = [
  { cite: "app.log:2093", text: "pydantic.ValidationError: DB_URL field required" },
  { cite: "api/config.py:14", text: "Settings.DB_URL has no default, required at boot" },
  { cite: "commit 8d1f42c", text: "deploy.yaml: DB_URL removed from the env block" },
];

const RULED_OUT = [
  "Connection-pool exhaustion: the pool never opened, refused before the first query.",
  "Stale image cache on node-3: the running image digest matches the built artifact.",
];

const ROOT_CAUSE =
  "DB_URL was dropped from the deploy environment, so the API fails settings validation at boot and the rollout never goes healthy.";
const NEXT_STEP = "Restore DB_URL to the deploy environment and re-run deploy #4127.";

function VerifiedTag({ progress, at }: { progress: MotionValue<number>; at: number }) {
  return (
    <Stamp progress={progress} at={at}>
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden>
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 011.4-1.4l2.8 2.8 6.3-6.3a1 1 0 011.4 0z"
            clipRule="evenodd"
          />
        </svg>
        verified
      </span>
    </Stamp>
  );
}

function Intro() {
  return (
    <div className="space-y-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
        03:12:08 AM · Beacon reports
      </p>
      <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
        You wake up to <span className="text-beacon">the answer</span>, not the alert.
      </h2>
      <p className="max-w-md text-base leading-relaxed text-zinc-600">
        Every claim in the report cites the line that proves it. A deterministic gate
        flags any citation it can&apos;t verify against the evidence Beacon actually gathered.
        The model writes the prose; code guarantees the evidence.
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">{children}</p>
  );
}

/** Animated report — mirrors the real Reporter output (root cause, confidence,
 *  cited evidence, ruled-out, next step) and animates the citation gate
 *  verifying each citation in turn. */
function ReportCard({ progress }: { progress: MotionValue<number> }) {
  const verifiedCount = useTransform(progress, [0.46, 0.62], [0, EVIDENCE.length]);
  const verifiedRounded = useTransform(verifiedCount, (v) => Math.round(v));

  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-white shadow-2xl shadow-zinc-900/10">
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

      <div className="space-y-6 px-6 py-6">
        <Reveal progress={progress} at={0.1}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <SectionLabel>Root cause</SectionLabel>
              <Stamp progress={progress} at={0.2}>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  High confidence
                </span>
              </Stamp>
            </div>
            <p className="text-[15px] font-medium leading-relaxed text-zinc-900">{ROOT_CAUSE}</p>
          </div>
        </Reveal>

        <div className="space-y-2.5">
          <SectionLabel>Evidence</SectionLabel>
          {EVIDENCE.map((item, i) => (
            <Reveal key={item.cite} progress={progress} at={0.28 + i * 0.06}>
              <div className="flex items-center gap-3">
                <code className="shrink-0 rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-beacon ring-1 ring-inset ring-edge">
                  {item.cite}
                </code>
                <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-600">
                  {item.text}
                </span>
                <VerifiedTag progress={progress} at={0.48 + i * 0.05} />
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal progress={progress} at={0.66}>
          <div className="space-y-2">
            <SectionLabel>Ruled out</SectionLabel>
            {RULED_OUT.map((line) => (
              <p key={line} className="flex gap-2 text-[13px] text-zinc-500">
                <span className="select-none text-zinc-300" aria-hidden>
                  ✕
                </span>
                {line}
              </p>
            ))}
          </div>
        </Reveal>

        <Reveal progress={progress} at={0.76}>
          <div className="rounded-lg border border-l-4 border-edge border-l-beacon bg-surface px-4 py-3">
            <SectionLabel>Suggested next step</SectionLabel>
            <p className="mt-1 text-[13px] font-medium text-zinc-800">{NEXT_STEP}</p>
          </div>
        </Reveal>
      </div>

      <Reveal progress={progress} at={0.46}>
        <div className="flex items-center gap-2 border-t border-edge bg-surface px-6 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-700">
          <span aria-hidden>◆</span>
          citation gate ·{" "}
          <motion.span className="tabular-nums">{verifiedRounded}</motion.span>
          <span>/ {EVIDENCE.length} citations verified</span>
        </div>
      </Reveal>
    </div>
  );
}

function StaticReport() {
  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-white shadow-2xl shadow-zinc-900/10">
      <div className="flex items-center gap-3 border-b border-edge bg-surface px-4 py-2.5">
        <span className="mx-auto rounded-md border border-edge bg-white px-3 py-0.5 font-mono text-[11px] text-zinc-500">
          beacon.local/incidents/629f64bd
        </span>
      </div>
      <div className="space-y-6 px-6 py-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel>Root cause</SectionLabel>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              High confidence
            </span>
          </div>
          <p className="text-[15px] font-medium leading-relaxed text-zinc-900">{ROOT_CAUSE}</p>
        </div>
        <div className="space-y-2.5">
          <SectionLabel>Evidence</SectionLabel>
          {EVIDENCE.map((item) => (
            <div key={item.cite} className="flex items-center gap-3">
              <code className="shrink-0 rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-beacon ring-1 ring-inset ring-edge">
                {item.cite}
              </code>
              <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-600">{item.text}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                verified
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <SectionLabel>Ruled out</SectionLabel>
          {RULED_OUT.map((line) => (
            <p key={line} className="flex gap-2 text-[13px] text-zinc-500">
              <span className="select-none text-zinc-300" aria-hidden>
                ✕
              </span>
              {line}
            </p>
          ))}
        </div>
        <div className="rounded-lg border border-l-4 border-edge border-l-beacon bg-surface px-4 py-3">
          <SectionLabel>Suggested next step</SectionLabel>
          <p className="mt-1 text-[13px] font-medium text-zinc-800">{NEXT_STEP}</p>
        </div>
      </div>
      <div className="border-t border-edge bg-surface px-6 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-700">
        ◆ citation gate · {EVIDENCE.length}/{EVIDENCE.length} citations verified
      </div>
    </div>
  );
}

export function BeatProof() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  if (reduced) {
    return (
      <section className="relative overflow-hidden bg-surface py-28 sm:py-36">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
          <Intro />
          <StaticReport />
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[300vh] bg-surface">
      {/* Last wisps of the fog. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-24 h-96 w-96 rounded-full bg-zinc-200/60 blur-3xl"
      />
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
          <Reveal progress={scrollYProgress} at={0.05} span={0.06}>
            <Intro />
          </Reveal>
          <ReportCard progress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}
