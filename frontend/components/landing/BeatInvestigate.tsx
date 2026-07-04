"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

import { SIGNAL_LINE } from "@/components/landing/BeatNoise";
import { Reveal, Stamp } from "@/components/landing/scroll";
import { VerdictBadge } from "@/components/VerdictsSection";
import type { Verdict } from "@/lib/types";

const HYPOTHESES: {
  id: string;
  title: string;
  prior: string;
  verdict: Verdict;
  confidence: number;
}[] = [
  {
    id: "h1",
    title: "api/config.py — DB_URL missing from the deploy environment",
    prior: "prior 70%",
    verdict: "accept",
    confidence: 0.92,
  },
  {
    id: "h2",
    title: "postgres — connection pool exhaustion during rollout",
    prior: "prior 20%",
    verdict: "reject",
    confidence: 0.31,
  },
  {
    id: "h3",
    title: "deploy pipeline — stale image cache on node-3",
    prior: "prior 10%",
    verdict: "reject",
    confidence: 0.12,
  },
];

function ConfidenceFill({
  progress,
  at,
  value,
}: {
  progress: MotionValue<number>;
  at: number;
  value: number;
}) {
  const pct = `${Math.round(value * 100)}%`;
  const width = useTransform(progress, [at, at + 0.1, 1], ["0%", pct, pct]);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
      <motion.div style={{ width }} className="h-full rounded-full bg-beacon" />
    </div>
  );
}

function HypothesisRow({
  hypothesis,
  index,
  progress,
}: {
  hypothesis: (typeof HYPOTHESES)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const appearAt = 0.14 + index * 0.09;
  const verdictAt = 0.5 + index * 0.11;
  return (
    <Reveal progress={progress} at={appearAt}>
      <div className="flex items-start gap-4 border-t border-edge px-5 py-4 first:border-t-0">
        <span className="mt-0.5 font-mono text-[11px] text-zinc-400">{hypothesis.id}</span>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-zinc-800">{hypothesis.title}</p>
            <span className="shrink-0 font-mono text-[11px] text-zinc-400">
              {hypothesis.prior}
            </span>
          </div>
          <ConfidenceFill progress={progress} at={verdictAt} value={hypothesis.confidence} />
        </div>
        <Stamp progress={progress} at={verdictAt} className="mt-0.5">
          <VerdictBadge verdict={hypothesis.verdict} />
        </Stamp>
      </div>
    </Reveal>
  );
}

function IncidentCard({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-white shadow-xl shadow-zinc-900/5">
      <div className="flex items-center justify-between border-b border-edge px-5 py-3">
        <span className="font-mono text-[11px] text-zinc-500">
          incident 629f64bd · meetpilot-api
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          triage
        </span>
      </div>
      <div className="border-b border-edge bg-surface px-5 py-3 font-mono text-[11px] text-zinc-600">
        <span className="mr-2 inline-block h-3 w-1 translate-y-0.5 rounded-sm bg-beacon" aria-hidden />
        {SIGNAL_LINE}
      </div>
      {HYPOTHESES.map((hypothesis, i) => (
        <HypothesisRow key={hypothesis.id} hypothesis={hypothesis} index={i} progress={progress} />
      ))}
      <Reveal progress={progress} at={0.85}>
        <div className="border-t border-edge bg-surface px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          7 tool calls · 18,342 tokens · 4s wall clock — budget respected
        </div>
      </Reveal>
    </div>
  );
}

function StaticCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-white shadow-xl shadow-zinc-900/5">
      <div className="flex items-center justify-between border-b border-edge px-5 py-3">
        <span className="font-mono text-[11px] text-zinc-500">
          incident 629f64bd · meetpilot-api
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          triage
        </span>
      </div>
      <div className="border-b border-edge bg-surface px-5 py-3 font-mono text-[11px] text-zinc-600">
        {SIGNAL_LINE}
      </div>
      {HYPOTHESES.map((hypothesis) => (
        <div
          key={hypothesis.id}
          className="flex items-start gap-4 border-t border-edge px-5 py-4 first:border-t-0"
        >
          <span className="mt-0.5 font-mono text-[11px] text-zinc-400">{hypothesis.id}</span>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-zinc-800">{hypothesis.title}</p>
              <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                {hypothesis.prior}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-beacon"
                style={{ width: `${Math.round(hypothesis.confidence * 100)}%` }}
              />
            </div>
          </div>
          <span className="mt-0.5">
            <VerdictBadge verdict={hypothesis.verdict} />
          </span>
        </div>
      ))}
      <div className="border-t border-edge bg-surface px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        7 tool calls · 18,342 tokens · 4s wall clock — budget respected
      </div>
    </div>
  );
}

function Intro() {
  return (
    <div className="space-y-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
        Beat 02 — Beacon investigates
      </p>
      <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
        Three hypotheses. Real tool calls. One verdict.
      </h2>
      <p className="max-w-md text-base leading-relaxed text-zinc-600">
        Beacon doesn&apos;t summarize your logs — it argues with them. Every hypothesis is
        confirmed or refuted with evidence it fetched itself, and every claim in the report
        cites the line that proves it.
      </p>
    </div>
  );
}

export function BeatInvestigate() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  if (reduced) {
    return (
      <section className="bg-surface py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
          <Intro />
          <StaticCard />
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[300vh] bg-surface">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
          <Reveal progress={scrollYProgress} at={0.05} span={0.06}>
            <Intro />
          </Reveal>
          <IncidentCard progress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}
