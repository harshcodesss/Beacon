"use client";

import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/* Beacon-native "how it runs": a horizontal relay you scroll through. The
 * orange wire grows left to right with scroll; each station lights up as the
 * wire's edge reaches it and its scene pops in. Timestamps ride above the
 * wire and track the real ~5-minute triage, not a fake 4 seconds. */

const STATIONS = [
  {
    time: "03:12:04",
    pos: 12,
    trigger: 0.12,
    kicker: "01 collect",
    title: "The failing run reports itself",
    body: "The Action grabs the trailing log window, recent commits, and run metadata the moment a deploy concludes in failure.",
    Scene: CollectScene,
  },
  {
    time: "03:14:38",
    pos: 50,
    trigger: 0.32,
    kicker: "02 investigate",
    title: "Hypotheses meet evidence",
    body: "The agent ranks competing root causes, then verifies each one with real tool calls under a hard token and tool-call budget.",
    Scene: InvestigateScene,
  },
  {
    time: "03:17:11",
    pos: 88,
    trigger: 0.52,
    kicker: "03 report",
    title: "The answer finds you",
    body: "An evidence-cited report lands in the dashboard, your inbox, and as a comment on the failing pull request.",
    Scene: ReportScene,
  },
];

/* ------------------------------------------------------------ animations */

// reveal variants: play when the parent card latches to "shown", reverse on
// scroll-back. Every scene shares this vocabulary so the three feel identical.
const sceneV: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.11, delayChildren: 0.15 } },
};
const rowV: Variants = {
  hidden: { opacity: 0, x: -14 },
  shown: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } },
};
const fillV: Variants = {
  hidden: { scaleX: 0 },
  shown: { scaleX: 1, transition: { duration: 0.7, ease: EASE, delay: 0.15 } },
};
const popV: Variants = {
  hidden: { scale: 0 },
  shown: { scale: 1, transition: { type: "spring", stiffness: 500, damping: 15, delay: 0.5 } },
};
const stampV: Variants = {
  hidden: { scale: 1.7, opacity: 0, rotate: -16 },
  shown: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 320, damping: 13, delay: 0.55 },
  },
};
const cardV: Variants = {
  hidden: { opacity: 0, y: 28 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, when: "beforeChildren" } },
};

/* ------------------------------------------------------------ the scenes */

// One shared frame so the three read as siblings: a white panel, a header
// chip + three rows, uniform padding and height. Only the row payload differs.
function Panel({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <motion.div
      variants={sceneV}
      className="relative flex h-[132px] flex-col gap-2.5 rounded-xl border border-edge bg-white p-3.5"
    >
      <motion.div variants={rowV} className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-beacon" />
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-400">{tag}</span>
      </motion.div>
      <div className="flex flex-1 flex-col justify-center gap-2.5">{children}</div>
    </motion.div>
  );
}

/** Collect: log lines stream in; the failing line lands last, cursor blinking. */
function CollectScene() {
  return (
    <Panel tag="app.log">
      {["66%", "82%"].map((w) => (
        <motion.div key={w} variants={rowV} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" />
          <span className="block h-1.5 rounded-full bg-zinc-200" style={{ width: w }} />
        </motion.div>
      ))}
      <motion.div variants={rowV} className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
        <span className="block h-1.5 w-[58%] rounded-full bg-zinc-500" />
        <motion.span
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          className="h-3 w-[3px] rounded-sm bg-beacon"
          aria-hidden
        />
      </motion.div>
    </Panel>
  );
}

/** Investigate: confidence bars fill, verdicts pop; the accepted one pulses. */
function InvestigateScene() {
  const rows = [
    { conf: "88%", verdict: "bg-emerald-400", live: true },
    { conf: "34%", verdict: "bg-zinc-300", live: false },
    { conf: "16%", verdict: "bg-zinc-300", live: false },
  ];
  return (
    <Panel tag="verdicts">
      {rows.map((row) => (
        <motion.div key={row.conf} variants={rowV} className="flex items-center gap-2.5">
          <span className="block h-1.5 w-9 shrink-0 rounded-full bg-zinc-200" />
          <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
            <motion.span
              variants={fillV}
              className="block h-full origin-left rounded-full bg-beacon"
              style={{ width: row.conf }}
            />
          </span>
          <motion.span variants={popV} className="h-3 w-3 shrink-0">
            <motion.span
              animate={row.live ? { scale: [1, 1.25, 1] } : undefined}
              transition={
                row.live ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : undefined
              }
              className={`block h-full w-full rounded-full ${row.verdict}`}
            />
          </motion.span>
        </motion.div>
      ))}
    </Panel>
  );
}

/** Report: the doc writes itself, then the seal stamps and keeps breathing. */
function ReportScene() {
  return (
    <Panel tag="report.md">
      {["52%", "84%", "68%"].map((w, i) => (
        <motion.div key={w} variants={rowV} className="flex items-center gap-2">
          <span
            className={`block h-1.5 rounded-full ${i === 0 ? "bg-zinc-500" : "bg-zinc-200"}`}
            style={{ width: w }}
          />
        </motion.div>
      ))}
      <motion.span
        variants={stampV}
        className="absolute -right-2.5 -top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-beacon shadow-md"
      >
        <motion.span
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-full w-full items-center justify-center"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
            <path
              d="M5 10.5l3.5 3.5L15 7"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.span>
      </motion.span>
    </Panel>
  );
}

/* ------------------------------------------------------------- heading */

function Heading() {
  return (
    <div className="space-y-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">How it runs</p>
      <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
        One failed deploy. A cited answer{" "}
        <span className="text-beacon">about five minutes later.</span>
      </h2>
    </div>
  );
}

/* ------------------------------------------------- desktop: scroll relay */

// the wire must pass through the node centers: timestamp block (64px) + half
// the node (18/2) = 73px down from the top of each station column
const WIRE_TOP = 73;

function Station({
  station,
  progress,
}: {
  station: (typeof STATIONS)[number];
  progress: MotionValue<number>;
}) {
  const { trigger, Scene } = station;
  // latch: once the wire's edge crosses this station it is "shown" and stays
  // shown (framer holds the target); it only reverses when you scroll back up
  // past the trigger. No continuous scrubbing, so it can never fade mid-scroll.
  const [shown, setShown] = useState(false);
  useMotionValueEvent(progress, "change", (p) => {
    if (p >= trigger && !shown) setShown(true);
    else if (p < trigger && shown) setShown(false);
  });

  return (
    <div
      className="absolute top-0 w-[300px] -translate-x-1/2"
      style={{ left: `${station.pos}%` }}
    >
      {/* timestamp, above the wire */}
      <motion.p
        animate={{ opacity: shown ? 1 : 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="flex h-[64px] items-end justify-center pb-3 font-mono text-[12px] tracking-wider text-zinc-500"
      >
        {station.time} AM
      </motion.p>

      {/* node, sitting on the wire */}
      <motion.span
        animate={{ scale: shown ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        className="relative z-10 mx-auto flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-beacon bg-white"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-beacon" />
      </motion.span>

      {/* card, below the wire — variant name cascades the scene's reveal, and
          it lifts on hover */}
      <motion.div
        initial="hidden"
        animate={shown ? "shown" : "hidden"}
        variants={cardV}
        whileHover={{ y: -6 }}
        className="mt-7 flex flex-col gap-4 rounded-2xl border border-edge bg-surface p-6 transition-shadow duration-300 hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-900/5"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-400">
          {station.kicker}
        </p>
        <h3 className="text-base font-semibold text-zinc-900">{station.title}</h3>
        <Scene />
        <p className="min-h-[5.75rem] text-sm leading-relaxed text-zinc-600">{station.body}</p>
      </motion.div>
    </div>
  );
}

function ScrollRelay() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // wire and all reveals complete by ~58% of the scroll; the remaining ~42%
  // is a hold where the full relay stays on screen (nothing appears then leaves)
  const wireWidth = useTransform(scrollYProgress, [0.05, 0.58], ["0%", "100%"]);

  return (
    <div ref={ref} className="h-[300vh]">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-8">
          <Heading />
          <div className="relative mt-14 h-[380px]">
            {/* base track */}
            <div
              className="absolute inset-x-0 h-px bg-edge"
              style={{ top: WIRE_TOP }}
              aria-hidden
            />
            {/* the wire, growing with scroll */}
            <motion.div
              className="absolute left-0 h-0.5 origin-left rounded-full bg-beacon"
              style={{ top: WIRE_TOP - 0.5, width: wireWidth }}
              aria-hidden
            />
            {STATIONS.map((s) => (
              <Station key={s.kicker} station={s} progress={scrollYProgress} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------- mobile / reduced-motion: stacked */

function Stacked({ className = "" }: { className?: string }) {
  return (
    <div className={`mx-auto max-w-6xl px-5 sm:px-8 ${className}`}>
      <Heading />
      <div className="mt-12 space-y-5">
        {STATIONS.map(({ time, kicker, title, body, Scene }) => (
          <div key={kicker} className="rounded-2xl border border-edge bg-surface p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-beacon bg-white">
                <span className="h-1.5 w-1.5 rounded-full bg-beacon" />
              </span>
              <span className="font-mono text-[12px] tracking-wider text-zinc-500">{time} AM</span>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-400">
              {kicker}
            </p>
            <h3 className="mt-2 text-base font-semibold text-zinc-900">{title}</h3>
            <div className="mt-4">
              <Scene />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowItRuns() {
  const reduced = useReducedMotion() ?? false;
  // Only mount the pinned relay on desktop, so its scroll target is never a
  // display:none element (framer measures a hidden target as a zero-length
  // scroll range and the wire freezes). Starts false so SSR renders the
  // stacked version; swaps in after mount on wide screens.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <section id="install" className="border-t border-edge bg-white">
      {!reduced && isDesktop ? (
        <ScrollRelay />
      ) : (
        <div className="py-24 sm:py-28">
          <Stacked />
        </div>
      )}
    </section>
  );
}
