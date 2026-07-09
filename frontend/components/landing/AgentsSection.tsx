"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState, type ComponentType } from "react";

import {
  HunchAvatar,
  ScribeAvatar,
  SiftAvatar,
  SleuthAvatar,
} from "@/components/landing/AgentAvatars";

type FlowStep = { title: string; sub: string };

type Agent = {
  id: string;
  name: string;
  role: string;
  tagline: string;
  stats: string;
  Avatar: ComponentType<{ className?: string; inverted?: boolean }>;
  flow: FlowStep[];
  hasLoop?: boolean;
  handoff: string;
};

const AGENTS: Agent[] = [
  {
    id: "sift",
    name: "Sift",
    role: "the Collector",
    tagline:
      "Reads 50,000 log lines so nobody else has to, then hands over only the ones that matter.",
    stats: "0 LLM calls · ~50K lines in · ~8K tokens out",
    Avatar: SiftAvatar,
    flow: [
      { title: "Read the windows", sub: "the last 30 minutes of logs, plus the 2-hour baseline before them" },
      { title: "Cluster the noise", sub: "thousands of lines collapse into a handful of templates" },
      { title: "Flag what's NEW", sub: "templates in the incident window but absent from the baseline: the gold" },
      { title: "Pull recent deploys", sub: "the last five commits, patches truncated: the other prime suspect" },
      { title: "Cap the budget", sub: "hard-trimmed to ~8K tokens; patches shrink before signal does" },
    ],
    handoff: "context_pack → handed to Hunch",
  },
  {
    id: "hunch",
    name: "Hunch",
    role: "the Generator",
    tagline:
      "Turns the evidence into three to five competing theories, each with a test to prove or kill it.",
    stats: "1 LLM call · 3 to 5 ranked hypotheses",
    Avatar: HunchAvatar,
    flow: [
      { title: "Read the context pack", sub: "error clusters, the error-rate spike, recent deploys" },
      { title: "One structured call", sub: "few-shot prompt, schema-validated output, no free-form rambling" },
      { title: "Declare the tests", sub: "every hypothesis states what evidence would confirm or refute it" },
      { title: "Rank by confidence", sub: "the contract Sleuth is about to enforce" },
    ],
    handoff: "hypotheses[] → handed to Sleuth",
  },
  {
    id: "sleuth",
    name: "Sleuth",
    role: "the Investigator",
    tagline:
      "The agent proper: works each theory with real tool calls, on a hard budget it cannot exceed.",
    stats: "3 tools · ≤15 calls · enforced in code",
    Avatar: SleuthAvatar,
    flow: [
      { title: "Take one hypothesis", sub: "a fresh thread for every theory, no cross-contamination" },
    ],
    hasLoop: true,
    handoff: "verdicts[] → handed to Scribe",
  },
  {
    id: "scribe",
    name: "Scribe",
    role: "the Reporter",
    tagline:
      "Writes the report, then lets cold, deterministic code check every citation before it ships.",
    stats: "1 LLM call + a pure-code citation gate",
    Avatar: ScribeAvatar,
    flow: [
      { title: "Read the verdicts", sub: "what was proven, what was ruled out, and why" },
      { title: "Write the report", sub: "root cause, confidence, evidence, ruled-out theories, next step" },
      { title: "Run the citation gate", sub: "code re-checks every cite against gathered evidence, no LLM involved" },
      { title: "Deliver", sub: "the failing pull request, the dashboard, beacon-report.md" },
    ],
    handoff: "report → delivered to a human",
  },
];

/* ---------------------------------------------------------------- cards */

function AgentCard({ agent, onOpen, reduced }: { agent: Agent; onOpen: () => void; reduced: boolean }) {
  const { Avatar } = agent;
  return (
    <motion.button
      type="button"
      layoutId={reduced ? undefined : `agent-panel-${agent.id}`}
      onClick={onOpen}
      transition={{ type: "spring", stiffness: 240, damping: 30 }}
      className="group flex h-full flex-col items-start gap-4 rounded-2xl border border-edge bg-white p-6 text-left shadow-sm transition-colors duration-300 hover:border-zinc-900 hover:bg-ink hover:shadow-md"
    >
      <Avatar className="h-24 w-24 text-zinc-800 transition-colors duration-300 group-hover:text-white" />
      <span>
        <span className="block text-2xl font-extrabold tracking-tight text-zinc-900 transition-colors duration-300 group-hover:text-white">
          {agent.name}
        </span>
        <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.22em] text-beacon">
          {agent.role}
        </span>
      </span>
      <span className="block text-sm leading-relaxed text-zinc-600 transition-colors duration-300 group-hover:text-zinc-300">
        {agent.tagline}
      </span>
      <span className="mt-auto inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-300 group-hover:bg-white group-hover:text-ink">
        Watch it work
        <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      </span>
    </motion.button>
  );
}

/* ------------------------------------------------------------- workflow */

const railList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.25 } },
};
const railItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

function StepMarker() {
  return (
    <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-beacon bg-white">
      <span className="h-2 w-2 rounded-full bg-beacon" />
    </span>
  );
}

/** Sleuth's inner ReAct loop: think ⇄ tools, with the budget leash. */
function InvestigatorLoop({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative ml-9 rounded-xl border border-dashed border-beacon/50 bg-beacon/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
        <span className="rounded-lg border border-edge bg-white px-3 py-2 text-[13px] font-semibold text-zinc-800 shadow-sm">
          LLM reasons
        </span>
        <motion.svg
          viewBox="0 0 40 40"
          className="h-9 w-9 text-beacon"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={reduced ? undefined : { repeat: Infinity, duration: 7, ease: "linear" }}
          aria-hidden
        >
          <path
            d="M20 5a15 15 0 1 1-10.6 4.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M9 2v8h8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
        <div className="flex flex-col gap-1.5">
          {["search_logs", "read_diff", "get_metric"].map((tool) => (
            <code
              key={tool}
              className="rounded bg-white px-2 py-0.5 font-mono text-[11px] text-zinc-700 ring-1 ring-inset ring-edge"
            >
              {tool}()
            </code>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-beacon-dim">
        hard cap: 15 tool calls · enforced in code, not prompts
      </p>
    </div>
  );
}

function WorkflowRail({ agent, reduced }: { agent: Agent; reduced: boolean }) {
  return (
    <motion.div
      variants={reduced ? undefined : railList}
      initial={reduced ? false : "hidden"}
      animate="show"
      className="relative space-y-5"
    >
      {/* rail line */}
      <span aria-hidden className="absolute bottom-3 left-3 top-3 w-px -translate-x-1/2 bg-edge" />

      {agent.flow.map((step) => (
        <motion.div key={step.title} variants={reduced ? undefined : railItem} className="flex gap-4">
          <StepMarker />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-zinc-900">{step.title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-500">{step.sub}</p>
          </div>
        </motion.div>
      ))}

      {agent.hasLoop && (
        <motion.div variants={reduced ? undefined : railItem}>
          <InvestigatorLoop reduced={reduced} />
        </motion.div>
      )}

      {agent.hasLoop && (
        <motion.div variants={reduced ? undefined : railItem} className="flex gap-4">
          <StepMarker />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-zinc-900">Rule on it</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-500">
              accept, reject, or inconclusive, with citations to the exact lines. Then the next
              hypothesis, on the same shared budget
            </p>
          </div>
        </motion.div>
      )}

      <motion.div
        variants={reduced ? undefined : railItem}
        className="ml-9 rounded-lg border border-l-4 border-edge border-l-beacon bg-surface px-4 py-2.5 font-mono text-[12px] text-zinc-700"
      >
        {agent.handoff}
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------- overlay */

function AgentOverlay({ agent, onClose, reduced }: { agent: Agent; onClose: () => void; reduced: boolean }) {
  const { Avatar } = agent;
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
        <motion.div
          layoutId={reduced ? undefined : `agent-panel-${agent.id}`}
          initial={reduced ? { opacity: 0 } : undefined}
          animate={reduced ? { opacity: 1 } : undefined}
          exit={reduced ? { opacity: 0 } : undefined}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`${agent.name}, ${agent.role} workflow`}
          className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex items-center gap-4 bg-beacon px-6 py-5">
            <Avatar inverted className="h-14 w-14 shrink-0 text-white" />
            <div className="min-w-0 flex-1">
              <h3 className="text-2xl font-extrabold tracking-tight text-white">{agent.name}</h3>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/80">
                {agent.role}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="space-y-6 px-6 py-6">
            <WorkflowRail agent={agent} reduced={reduced} />
            <div className="border-t border-edge pt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              {agent.stats}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- section */

export function AgentsSection() {
  const reduced = useReducedMotion() ?? false;
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = AGENTS.find((a) => a.id === activeId) ?? null;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActiveId(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  return (
    <section id="agents" className="bg-surface py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-14 space-y-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            under the hood · four agents, one relay
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            Meet the <span className="text-beacon">Beacon agents</span>
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-zinc-600">
            Every incident is a relay: each agent does one job, writes its result to shared
            state, and hands off. No agent talks to another; the pipeline decides what runs.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              reduced={reduced}
              onOpen={() => setActiveId(agent.id)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {active && (
          <AgentOverlay agent={active} reduced={reduced} onClose={() => setActiveId(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
