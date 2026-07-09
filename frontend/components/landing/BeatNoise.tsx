"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { FillWord, Reveal } from "@/components/landing/scroll";

const LOG_LINES = [
  '02:57:12 INFO  ci.deploy    workflow "Deploy" started · commit 8d1f42c',
  "02:57:48 INFO  registry     pushing meetpilot-api:4127 · 182MB",
  "02:58:41 INFO  k8s.rollout  strategy=RollingUpdate maxUnavailable=0",
  "02:59:02 INFO  api.boot     python 3.11 · uvicorn 0.30 · workers=4",
  "02:59:04 INFO  api.boot     loading settings from environment",
  "02:59:05 INFO  api.db       opening pool postgres:5432 (size=10)",
  "02:59:07 WARN  api.db       acquire retry 1/3: connection refused",
  "02:59:09 INFO  redis        connected · latency 2.1ms",
  "02:59:31 INFO  k8s.rollout  replica 1/3 ready",
  "03:00:02 INFO  worker       rq worker online · queue=triage",
  "03:00:19 WARN  api.cache    p99 latency 240ms over budget",
  "03:00:44 INFO  api.http     GET /healthz 200 · 3ms",
  "03:01:13 INFO  k8s.rollout  replica 2/3 ready",
  "03:02:26 WARN  k8s.probe    readiness probe timeout on pod api-7d4f",
  "03:03:41 INFO  api.http     GET /healthz 200 · 4ms",
  "03:05:58 WARN  k8s.probe    back-off restarting failed container",
  "03:07:32 INFO  ci.deploy    waiting on rollout status…",
  "03:09:15 WARN  k8s.rollout  progress deadline 60% elapsed",
  "03:11:47 ERROR api.boot     application startup failed",
  "03:12:04 ERROR k8s.rollout  deploy #4127 failed · rollback initiated",
  '03:12:05 INFO  ci.deploy    workflow "Deploy" concluded: failure',
  "03:12:06 INFO  beacon       incident opened · trigger=action",
];

const HEADLINE = "Somewhere in 50,000 lines is one sentence that matters.".split(" ");

/** Deterministic pseudo-random in [0, 1) — positions must match on server
 *  and client, so no Math.random(). */
function jitter(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function NoiseField() {
  return (
    <>
      {LOG_LINES.map((line, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute whitespace-nowrap font-mono text-[11px] text-zinc-400"
          style={{
            top: `${4 + jitter(i, 1) * 90}%`,
            left: `${jitter(i, 2) * 62}%`,
            opacity: 0.3 + jitter(i, 3) * 0.45,
            filter: `blur(${(1 + jitter(i, 4) * 1.6).toFixed(1)}px)`,
            animation: `noise-drift ${(18 + jitter(i, 5) * 22).toFixed(1)}s ease-in-out ${(
              -jitter(i, 6) * 20
            ).toFixed(1)}s infinite alternate`,
          }}
        >
          {line}
        </span>
      ))}
    </>
  );
}

export const SIGNAL_LINE =
  "pydantic.ValidationError: 1 validation error for Settings · DB_URL: field required";

export function BeatNoise() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const noiseOpacity = useTransform(scrollYProgress, [0.45, 0.72, 1], [1, 0.15, 0.15]);
  const signalOpacity = useTransform(scrollYProgress, [0.62, 0.76, 1], [0, 1, 1]);
  const signalY = useTransform(scrollYProgress, [0.62, 0.78, 1], [90, 0, 0]);
  const signalBlur = useTransform(
    scrollYProgress,
    [0.62, 0.76, 1],
    ["blur(8px)", "blur(0px)", "blur(0px)"],
  );

  if (reduced) {
    return (
      <section id="story" className="relative overflow-hidden bg-surface py-32">
        <div className="mx-auto max-w-4xl space-y-10 px-5 sm:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            03:12:04 AM · Beacon collects
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            Somewhere in 50,000 lines is <span className="text-beacon">one sentence</span> that
            matters.
          </h2>
          <div className="rounded-lg border border-edge border-l-4 border-l-beacon bg-white px-5 py-4 font-mono text-sm text-zinc-800 shadow-sm">
            {SIGNAL_LINE}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} id="story" className="relative h-[300vh] bg-surface">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <motion.div aria-hidden style={{ opacity: noiseOpacity }} className="absolute inset-0">
          <NoiseField />
        </motion.div>

        <div className="relative mx-auto w-full max-w-4xl space-y-10 px-5 sm:px-8">
          <Reveal progress={scrollYProgress} at={0.06}>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
              03:12:04 AM · Beacon collects
            </p>
          </Reveal>

          <h2 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            {HEADLINE.map((word, i) => (
              <FillWord
                key={i}
                progress={scrollYProgress}
                start={0.12 + (i / HEADLINE.length) * 0.38}
                end={0.16 + (i / HEADLINE.length) * 0.38}
                accent={i === 5 || i === 6}
              >
                {word}
              </FillWord>
            ))}
          </h2>

          <motion.div
            style={{ opacity: signalOpacity, y: signalY, filter: signalBlur }}
            className="rounded-lg border border-edge border-l-4 border-l-beacon bg-white px-5 py-4 font-mono text-[13px] text-zinc-800 shadow-lg shadow-zinc-900/5 sm:text-sm"
          >
            {SIGNAL_LINE}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
