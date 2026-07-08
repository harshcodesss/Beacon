"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import type { ReactNode } from "react";

/* Every input range ends with an explicit keyframe at progress 1 that holds
 * the final value — transforms must stay settled for the rest of the pin. */

/** Fade-and-rise a block in at a point of a pinned section's scroll progress. */
export function Reveal({
  progress,
  at,
  span = 0.08,
  className,
  children,
}: {
  progress: MotionValue<number>;
  at: number;
  span?: number;
  className?: string;
  children: ReactNode;
}) {
  const opacity = useTransform(progress, [at, at + span, 1], [0, 1, 1]);
  const y = useTransform(progress, [at, at + span, 1], [24, 0, 0]);
  return (
    <motion.div style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}

/** Verdict-stamp entrance: drops in with a slight overshoot scale. */
export function Stamp({
  progress,
  at,
  className,
  children,
}: {
  progress: MotionValue<number>;
  at: number;
  className?: string;
  children: ReactNode;
}) {
  const opacity = useTransform(progress, [at, at + 0.05, 1], [0, 1, 1]);
  const scale = useTransform(progress, [at, at + 0.05, at + 0.09, 1], [1.7, 1.7, 1, 1]);
  return (
    <motion.span style={{ opacity, scale }} className={`inline-flex ${className ?? ""}`}>
      {children}
    </motion.span>
  );
}

/** One word of a fill headline: gray until its scroll moment, then fills to
 *  near-black — or to the brand orange when `accent` marks it a keyword. */
export function FillWord({
  progress,
  start,
  end,
  accent = false,
  children,
}: {
  progress: MotionValue<number>;
  start: number;
  end: number;
  accent?: boolean;
  children: string;
}) {
  const filled = accent ? "#ff7f11" : "#18181b";
  const color = useTransform(progress, [start, end, 1], ["#d4d4d8", filled, filled]);
  return <motion.span style={{ color }}>{children} </motion.span>;
}
