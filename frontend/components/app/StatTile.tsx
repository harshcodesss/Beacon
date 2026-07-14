"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "orange" | "ink" | "white";

const CARD: Record<Variant, string> = {
  orange: "bg-gradient-to-br from-[#ff8f2b] to-[#ee6d00] text-white shadow-md",
  ink: "bg-gradient-to-br from-[#3d3d3d] to-[#232323] text-white shadow-md",
  white: "bg-white text-ink border border-edge",
};

export function StatTile({
  variant,
  href,
  label,
  value,
  trend,
  graph,
}: {
  variant: Variant;
  href: string;
  label: string;
  value: ReactNode;
  trend?: ReactNode;
  graph?: ReactNode;
}) {
  const muted = variant === "white" ? "text-zinc-500" : "text-white/85";
  return (
    <Link
      href={href}
      className={`group flex min-h-[152px] flex-col rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${CARD[variant]}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${muted}`}>{label}</span>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
            variant === "white" ? "border-zinc-300 text-zinc-500" : "border-white/50"
          }`}
          aria-hidden
        >
          ↗
        </span>
      </div>
      <div className="mt-auto flex items-end justify-between gap-3">
        <span className="text-[2.6rem] font-bold leading-none tracking-tight">{value}</span>
        {graph}
      </div>
      {trend ? <div className={`mt-2.5 text-[10.5px] ${muted}`}>{trend}</div> : null}
    </Link>
  );
}

export function Histogram({ data, light }: { data: number[]; light?: boolean }) {
  const max = Math.max(1, ...data);
  const color = light ? "bg-white/85" : "bg-beacon";
  return (
    <span className="flex h-9 items-end gap-[3px]">
      {data.map((v, i) => (
        <span
          key={i}
          className={`w-[7px] rounded-sm ${color}`}
          style={{ height: `${Math.max((v / max) * 100, 8)}%`, opacity: v === 0 ? 0.25 : 1 }}
        />
      ))}
    </span>
  );
}

export function SemiGauge({ pct, light }: { pct: number; light?: boolean }) {
  const track = light ? "rgba(255,255,255,.25)" : "#eef0f2";
  const clamped = Math.max(0, Math.min(pct, 100));
  const theta = (clamped / 100) * Math.PI; // 0..pi across the semicircle
  const endX = 50 - 40 * Math.cos(theta);
  const endY = 50 - 40 * Math.sin(theta);
  return (
    <svg viewBox="0 0 100 52" className="h-10 w-[76px]">
      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={track} strokeWidth="10" strokeLinecap="round" />
      {clamped > 0 ? (
        <path
          d={`M 10 50 A 40 40 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`}
          fill="none"
          stroke="#ff7f11"
          strokeWidth="10"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

export function DualMeter({ used, cap, light }: { used: number; cap: number; light?: boolean }) {
  const track = light ? "bg-white/20" : "bg-zinc-200";
  const pct = cap > 0 ? Math.min((used / cap) * 100, 100) : 0;
  return (
    <span className="flex w-[84px] flex-col gap-1">
      <span className={`h-[5px] overflow-hidden rounded ${track}`}>
        <span className="block h-full rounded bg-beacon" style={{ width: `${pct}%` }} />
      </span>
      <span className={`h-[5px] rounded ${light ? "bg-white/30" : "bg-zinc-300"}`} />
    </span>
  );
}
