"use client";

/* Shared SVG building blocks for the agent workflow diagrams. Each diagram is
 * a hand-placed node graph (mirroring the drawio design doc) composed from
 * these pieces so the four panels read as one system. Primitives are
 * animation-aware: nodes cascade in on a delay schedule the diagram assigns,
 * edges draw themselves tip-first, then orange beams ride every edge while
 * the panel is open. With animation off everything renders static. */

import { motion, type Variants } from "framer-motion";
import { useId } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

export const INK = "#262626";
export const EDGE_C = "#e4e4e7";
export const BEACON = "#ff7f11";
export const BEACON_DIM = "#c25f00";
export const Z300 = "#d4d4d8";
export const Z400 = "#a1a1aa";
export const Z500 = "#71717a";
export const Z900 = "#18181b";
export const GREEN = "#15803d";
export const GREEN_EDGE = "#86efac";
export const GREEN_BG = "#f0fdf4";

// cascade timing: nodes pop first, edges draw behind them, beams flow last
const NODE_STEP = 0.07;
const EDGE_BASE = 0.5;
const EDGE_STEP = 0.09;
const EDGE_DUR = 0.4;
const BEAM_AT = 1.5;

type NodeKind = "process" | "source" | "dark";

// drawio-style pastel fills so the node types read at a glance on the
// dotted white canvas
const KIND_STYLE: Record<NodeKind, { fill: string; stroke: string; kicker: string }> = {
  process: { fill: "#fff7ed", stroke: "#fed7aa", kicker: BEACON_DIM },
  source: { fill: "#fefce8", stroke: "#fde68a", kicker: "#a16207" },
  dark: { fill: INK, stroke: INK, kicker: BEACON },
};
const STORE_FILL = "#f0f9ff";
const STORE_STROKE = "#bae6fd";
const STORE_SUB = "#0369a1";
const DIAMOND_FILL = "#fef2f2";
const DIAMOND_STROKE = "#fca5a5";

function nodeV(order: number): Variants {
  return {
    hidden: { opacity: 0, y: 10 },
    shown: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: EASE, delay: 0.1 + order * NODE_STEP },
    },
  };
}

/* ------------------------------------------------------------------ nodes */

export function Node({
  x,
  y,
  w,
  h = 42,
  order = 0,
  kind = "process",
  kicker,
  title,
  sub,
  right,
  animated,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  order?: number;
  kind?: NodeKind;
  kicker: string;
  title: string;
  sub?: string;
  right?: string;
  animated: boolean;
  children?: React.ReactNode;
}) {
  const dark = kind === "dark";
  const tx = x + 15;
  return (
    <motion.g variants={animated ? nodeV(order) : undefined}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={dark ? 10 : 8}
        fill={KIND_STYLE[kind].fill}
        stroke={KIND_STYLE[kind].stroke}
        strokeWidth={1.2}
        strokeDasharray={kind === "source" ? "4 4" : undefined}
        filter="url(#wfCard)"
      />
      {kind === "process" && <rect x={x} y={y} width={3} height={h} rx={1.5} fill={BEACON} />}
      <text
        x={tx}
        y={y + 17}
        className="font-sans"
        fontSize={7.5}
        fontWeight={700}
        letterSpacing={1}
        fill={KIND_STYLE[kind].kicker}
      >
        {kicker.toUpperCase()}
      </text>
      {title && (
        <text
          x={tx}
          y={y + 32}
          className="font-mono"
          fontSize={10}
          fontWeight={600}
          fill={dark ? "#fff" : Z900}
        >
          {title}
        </text>
      )}
      {sub && (
        <text
          x={tx}
          y={y + 45}
          className="font-mono"
          fontSize={8}
          fill={dark ? Z400 : Z500}
        >
          {sub}
        </text>
      )}
      {right && (
        <text
          x={x + w - 13}
          y={y + 32}
          textAnchor="end"
          className="font-mono"
          fontSize={8}
          fill={dark ? Z400 : Z500}
        >
          {right}
        </text>
      )}
      {children}
    </motion.g>
  );
}

/** Cylinder store: shared BeaconState reads/writes. */
export function StoreNode({
  x,
  y,
  w,
  h = 60,
  order = 0,
  title,
  sub,
  animated,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  order?: number;
  title: string;
  sub?: string;
  animated: boolean;
}) {
  const ry = 8;
  return (
    <motion.g variants={animated ? nodeV(order) : undefined}>
      <path
        d={`M ${x} ${y + ry} v ${h - 2 * ry} a ${w / 2} ${ry} 0 0 0 ${w} 0 v ${-(h - 2 * ry)}`}
        fill={STORE_FILL}
        stroke={STORE_STROKE}
        strokeWidth={1.2}
        filter="url(#wfCard)"
      />
      <ellipse
        cx={x + w / 2}
        cy={y + ry}
        rx={w / 2}
        ry={ry}
        fill={STORE_FILL}
        stroke={STORE_STROKE}
        strokeWidth={1.2}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        textAnchor="middle"
        className="font-mono"
        fontSize={10}
        fontWeight={600}
        fill={Z900}
      >
        {title}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 17}
          textAnchor="middle"
          className="font-mono"
          fontSize={7.5}
          fill={STORE_SUB}
        >
          {sub}
        </text>
      )}
    </motion.g>
  );
}

/** Decision diamond (the Investigator's tool_call? branch). */
export function Diamond({
  cx,
  cy,
  rx = 70,
  ry = 28,
  order = 0,
  title,
  animated,
}: {
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
  order?: number;
  title: string;
  animated: boolean;
}) {
  return (
    <motion.g variants={animated ? nodeV(order) : undefined}>
      <polygon
        points={`${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`}
        fill={DIAMOND_FILL}
        stroke={DIAMOND_STROKE}
        strokeWidth={1.2}
        filter="url(#wfCard)"
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        className="font-mono"
        fontSize={10}
        fontWeight={700}
        fill={Z900}
      >
        {title}
      </text>
    </motion.g>
  );
}

/** Dashed container with an uppercase label; children render inside. */
export function GroupBox({
  x,
  y,
  w,
  h,
  order = 0,
  label,
  tone = "neutral",
  animated,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  order?: number;
  label: string;
  tone?: "neutral" | "beacon";
  animated: boolean;
  children?: React.ReactNode;
}) {
  const beacon = tone === "beacon";
  return (
    <motion.g variants={animated ? nodeV(order) : undefined}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        fill={beacon ? "rgba(255,127,17,0.03)" : "none"}
        stroke={beacon ? "#fdba74" : Z300}
        strokeWidth={1.2}
        strokeDasharray="4 4"
      />
      <text
        x={x + 16}
        y={y + 18}
        className="font-sans"
        fontSize={7.5}
        fontWeight={700}
        letterSpacing={1}
        fill={beacon ? BEACON_DIM : Z400}
      >
        {label.toUpperCase()}
      </text>
      {children}
    </motion.g>
  );
}

/** Small row inside a node or group (drain3, the tools list, the NEW flag). */
export function SubRow({
  x,
  y,
  w,
  h = 22,
  text,
  tone = "neutral",
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  text: string;
  tone?: "neutral" | "beacon";
}) {
  const beacon = tone === "beacon";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={5}
        fill={beacon ? "#ffedd5" : "#fff"}
        stroke={beacon ? "#fdba74" : EDGE_C}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 3.5}
        textAnchor="middle"
        className="font-mono"
        fontSize={9}
        fontWeight={beacon ? 700 : 500}
        fill={beacon ? BEACON_DIM : Z900}
      >
        {text}
      </text>
    </g>
  );
}

/** Green deliverable pill with a check seal: what the agent hands off. */
export function Deliverable({
  x,
  y,
  w,
  h = 36,
  order = 0,
  label,
  note,
  caption = "deliverable",
  animated,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  order?: number;
  label: string;
  note?: string;
  caption?: string;
  animated: boolean;
}) {
  const cy = y + h / 2;
  return (
    <motion.g variants={animated ? nodeV(order) : undefined}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={h / 2}
        fill={GREEN_BG}
        stroke={GREEN_EDGE}
        strokeWidth={1.5}
        filter="url(#wfCard)"
      />
      <circle cx={x + 20} cy={cy} r={6} fill="#22c55e" />
      <path
        d={`M ${x + 17} ${cy} l 2.2 2.2 l 4 -4.5`}
        stroke="#fff"
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x={x + 34} y={cy + 3.5} className="font-mono" fontSize={10} fontWeight={700} fill={GREEN}>
        {label}
      </text>
      {note && (
        <text x={x + w - 14} y={cy + 3.5} textAnchor="end" className="font-mono" fontSize={7.5} fill="#4ade80">
          {note}
        </text>
      )}
      <text
        x={x - 10}
        y={cy + 3}
        textAnchor="end"
        className="font-sans"
        fontSize={7.5}
        fontWeight={700}
        letterSpacing={1}
        fill={Z400}
      >
        {caption.toUpperCase()}
      </text>
    </motion.g>
  );
}

/** Floating label for an edge (yes / no / read / ToolMessage). */
export function EdgeLabel({
  x,
  y,
  text,
  order = 0,
  animated,
}: {
  x: number;
  y: number;
  text: string;
  order?: number;
  animated: boolean;
}) {
  return (
    <motion.text
      x={x}
      y={y}
      textAnchor="middle"
      className="font-sans"
      fontSize={8.5}
      fontWeight={600}
      fill={Z500}
      stroke="#fff"
      strokeWidth={3}
      paintOrder="stroke"
      variants={
        animated
          ? {
              hidden: { opacity: 0 },
              shown: {
                opacity: 1,
                transition: { duration: 0.3, delay: EDGE_BASE + order * EDGE_STEP + EDGE_DUR },
              },
            }
          : undefined
      }
    >
      {text}
    </motion.text>
  );
}

/* ------------------------------------------------------------------ edges */

// paths are strictly "M x y L x y ..." so the tip and its angle fall out of
// the last two coordinate pairs
function pathEnd(d: string) {
  const nums = (d.match(/-?\d+\.?\d*/g) ?? []).map(Number);
  const [x1, y1, x2, y2] = nums.slice(-4);
  return { x: x2, y: y2, angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI };
}

export function Edge({
  d,
  order = 0,
  dashed = false,
  beam = true,
  beamDur = 2.2,
  beamPhase = 0,
  animated,
}: {
  d: string;
  order?: number;
  dashed?: boolean;
  beam?: boolean;
  beamDur?: number;
  beamPhase?: number;
  animated: boolean;
}) {
  // stable across SSR/client, sanitized for use as a url() fragment
  const pathId = `wf-${useId().replace(/:/g, "")}`;
  const delay = EDGE_BASE + order * EDGE_STEP;
  const end = pathEnd(d);

  // dashed edges can't ride the pathLength trick (it owns stroke-dasharray),
  // so they fade in instead of drawing in
  const lineVariants: Variants = dashed
    ? {
        hidden: { opacity: 0 },
        shown: { opacity: 1, transition: { duration: EDGE_DUR, delay } },
      }
    : {
        hidden: { pathLength: 0, opacity: 0 },
        shown: {
          pathLength: 1,
          opacity: 1,
          transition: {
            pathLength: { duration: EDGE_DUR, ease: "easeInOut", delay },
            opacity: { duration: 0.01, delay },
          },
        },
      };

  return (
    <g>
      <motion.path
        id={pathId}
        d={d}
        fill="none"
        stroke={Z300}
        strokeWidth={1.4}
        strokeDasharray={dashed ? "5 4" : undefined}
        variants={animated ? lineVariants : undefined}
      />
      <motion.path
        d="M -6 -3.6 L 1 0 L -6 3.6 Z"
        fill={Z400}
        transform={`translate(${end.x} ${end.y}) rotate(${end.angle})`}
        variants={
          animated
            ? {
                hidden: { opacity: 0 },
                shown: { opacity: 1, transition: { duration: 0.15, delay: delay + EDGE_DUR - 0.05 } },
              }
            : undefined
        }
      />
      {beam && animated && (
        <motion.g
          variants={{
            hidden: { opacity: 0 },
            shown: { opacity: 1, transition: { duration: 0.6, delay: BEAM_AT } },
          }}
        >
          {/* negative begin = phase offset, so beams desync instead of pulsing in lockstep.
              halo is a radial gradient, not a blur filter: 18 filtered moving circles
              re-rasterize every frame and starve the main thread */}
          <circle r={5} fill="url(#wfBeamGlow)">
            <animateMotion dur={`${beamDur}s`} repeatCount="indefinite" begin={`${-beamPhase}s`}>
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
          <circle r={1.8} fill={BEACON}>
            <animateMotion dur={`${beamDur}s`} repeatCount="indefinite" begin={`${-beamPhase}s`}>
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
        </motion.g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ frame */

export function DiagramSvg({
  viewBox,
  label,
  animated,
  shown,
  children,
}: {
  viewBox: string;
  label: string;
  animated: boolean;
  shown: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.svg
      viewBox={viewBox}
      className="block h-auto w-full"
      role="img"
      aria-label={label}
      initial={animated ? "hidden" : undefined}
      animate={animated ? (shown ? "shown" : "hidden") : undefined}
    >
      <defs>
        <radialGradient id="wfBeamGlow">
          <stop offset="0%" stopColor={BEACON} stopOpacity="0.4" />
          <stop offset="100%" stopColor={BEACON} stopOpacity="0" />
        </radialGradient>
        <filter id="wfCard" x="-20%" y="-30%" width="140%" height="180%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor={Z900} floodOpacity="0.07" />
        </filter>
      </defs>
      {children}
    </motion.svg>
  );
}
