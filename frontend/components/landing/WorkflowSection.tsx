"use client";

/* The pipeline section: a horizontal spine with the five-agent relay
 * (START and END as quiet pills, four uniform agent chips), and one fixed
 * detail panel below that redraws the active agent's workflow diagram.
 * Clicking a chip powers up that agent's circuit: nodes cascade in, edges
 * draw themselves, then beams flow along every wire while the panel is open. */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ComponentType, type RefObject } from "react";

import { CollectorDiagram } from "@/components/landing/workflow/CollectorDiagram";
import { GeneratorDiagram } from "@/components/landing/workflow/GeneratorDiagram";
import { InvestigatorDiagram } from "@/components/landing/workflow/InvestigatorDiagram";
import { ReporterDiagram } from "@/components/landing/workflow/ReporterDiagram";

const EASE = [0.22, 1, 0.36, 1] as const;

type Stage = {
  id: string;
  num: string;
  name: string;
  pos: number; // % position on the spine; also how far the lit wire reaches
  note: string;
  Diagram: ComponentType<{ animated: boolean; shown: boolean }>;
};

const STAGES: Stage[] = [
  {
    id: "collector",
    num: "Agent 1",
    name: "Collector",
    pos: 20,
    note: "Pure Python, no LLM · compression is the skill",
    Diagram: CollectorDiagram,
  },
  {
    id: "generator",
    num: "Agent 2",
    name: "Hypothesis Generator",
    pos: 40,
    note: "1 LLM call · schema-validated output",
    Diagram: GeneratorDiagram,
  },
  {
    id: "investigator",
    num: "Agent 3",
    name: "Investigator",
    pos: 60,
    note: "hard budget: 15 tool calls · enforced in code",
    Diagram: InvestigatorDiagram,
  },
  {
    id: "reporter",
    num: "Agent 4",
    name: "Reporter",
    pos: 80,
    note: "it cannot cite what was not gathered",
    Diagram: ReporterDiagram,
  },
];

/* one-shot "has this scrolled into view" latch. A plain scroll-position check
 * instead of IntersectionObserver: fires under programmatic scrolling too,
 * where observer callbacks can be suppressed. */
function useOnScreen(ref: RefObject<HTMLElement>) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen) return;
    const check = () => {
      const el = ref.current;
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.75) setSeen(true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [seen, ref]);
  return seen;
}

function TerminalPill({ label, side }: { label: string; side: "left" | "right" }) {
  return (
    <span
      className={`absolute top-1/2 flex h-[30px] w-[60px] -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-dashed border-edge bg-white font-mono text-[9px] font-semibold tracking-[0.14em] text-zinc-400 ${
        side === "left" ? "left-[3%] -translate-x-1/2" : "left-[97%] -translate-x-1/2"
      }`}
    >
      {label}
    </span>
  );
}

function StageChip({
  stage,
  active,
  onSelect,
  className = "",
  style,
}: {
  stage: Stage;
  active: boolean;
  onSelect: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      style={style}
      className={`flex h-[56px] w-[126px] flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] bg-white text-center leading-tight transition-all duration-300 ${
        active
          ? "border-beacon text-zinc-900 shadow-lg shadow-beacon/15"
          : "border-edge text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
      } ${className}`}
    >
      <span
        className={`font-mono text-[7.5px] uppercase tracking-[0.16em] ${
          active ? "text-beacon" : "text-zinc-400"
        }`}
      >
        {stage.num}
      </span>
      <span className="px-1 text-[10px] font-bold">{stage.name}</span>
    </button>
  );
}

export function WorkflowSection() {
  const reduced = useReducedMotion() ?? false;
  const [activeId, setActiveId] = useState(STAGES[0].id);
  const active = STAGES.find((s) => s.id === activeId) ?? STAGES[0];
  const { Diagram } = active;

  // the first draw waits until the section is actually on screen
  const panelRef = useRef<HTMLDivElement>(null);
  const inView = useOnScreen(panelRef);

  return (
    <section id="workflow" className="border-t border-edge bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="space-y-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            the pipeline · four agents, one compiled graph
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            One <span className="text-beacon">graph.</span>
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-zinc-600">
            Four agents that never call each other. Each writes to shared state, and the graph
            routes. Click any stage to see its wiring.
          </p>
        </div>

        {/* desktop spine */}
        <div className="relative mt-20 hidden h-[56px] md:block" role="group" aria-label="Pipeline stages">
          <div className="absolute inset-x-0 top-1/2 h-px bg-edge" aria-hidden />
          <motion.div
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-beacon"
            initial={false}
            animate={{ width: `${active.pos}%` }}
            transition={
              reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 22 }
            }
            aria-hidden
          />
          <TerminalPill label="START" side="left" />
          {STAGES.map((stage) => (
            <StageChip
              key={stage.id}
              stage={stage}
              active={stage.id === activeId}
              onSelect={() => setActiveId(stage.id)}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${stage.pos}%` }}
            />
          ))}
          <TerminalPill label="END" side="right" />
        </div>

        {/* mobile: same chips, laid out as a grid */}
        <div className="mt-12 grid grid-cols-2 justify-items-center gap-2 md:hidden">
          {STAGES.map((stage) => (
            <StageChip
              key={stage.id}
              stage={stage}
              active={stage.id === activeId}
              onSelect={() => setActiveId(stage.id)}
            />
          ))}
        </div>

        {/* detail panel */}
        <div
          ref={panelRef}
          className="relative mt-12 rounded-2xl border border-edge bg-white p-3 sm:p-5"
          style={{
            backgroundImage: "radial-gradient(circle, #e4e4e7 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        >
          <span className="absolute -top-[11px] left-6 z-10 rounded-full bg-ink px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white">
            {active.num} · {active.name}
          </span>
          <span className="absolute -top-[11px] right-6 z-10 hidden rounded-full border border-edge bg-white px-3 py-1.5 text-[9px] font-medium text-zinc-500 sm:block">
            {active.note}
          </span>

          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active.id}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: EASE }}
                >
                  <Diagram animated={!reduced} shown={inView} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
