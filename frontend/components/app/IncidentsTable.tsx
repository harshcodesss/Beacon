"use client";

import Link from "next/link";

import { StatusChip } from "@/components/StatusChip";
import { formatWhen } from "@/lib/format";
import type { IncidentStatus, IncidentWithProject } from "@/lib/types";

const ROW_GRID = "grid grid-cols-[90px_1.1fr_90px_2fr_90px] items-center gap-3 px-4 py-2.5";
const HEAD_LABEL = "text-[10px] font-semibold uppercase tracking-wider text-zinc-400";

function PulsingDots() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5">
      <span className="h-1 w-1 animate-pulse rounded-full bg-zinc-400" />
      <span className="h-1 w-1 animate-pulse rounded-full bg-zinc-400 [animation-delay:150ms]" />
      <span className="h-1 w-1 animate-pulse rounded-full bg-zinc-400 [animation-delay:300ms]" />
    </span>
  );
}

function RootCauseCell({ status }: { status: IncidentStatus }) {
  if (status === "done") {
    return <span className="text-[12.5px] text-zinc-600">Root cause identified</span>;
  }
  if (status === "running") {
    return (
      <span className="flex items-center text-[12.5px] italic text-zinc-400">
        investigating
        <PulsingDots />
      </span>
    );
  }
  if (status === "failed") {
    return <span className="text-[12.5px] italic text-danger-ink">run failed</span>;
  }
  return <span className="text-[12.5px] italic text-zinc-400">waiting for a worker</span>;
}

export function IncidentsTable({ items }: { items: IncidentWithProject[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className={`${ROW_GRID} bg-zinc-50`}>
            <span className={HEAD_LABEL}>Status</span>
            <span className={HEAD_LABEL}>Project</span>
            <span className={HEAD_LABEL}>Run</span>
            <span className={HEAD_LABEL}>Root cause</span>
            <span className={`${HEAD_LABEL} text-right`}>When</span>
          </div>
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/incidents/${item.id}`}
              className={`${ROW_GRID} border-t border-zinc-100 hover:bg-beacon-tint`}
            >
              <StatusChip status={item.status} />
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium text-zinc-900">
                  {item.project_name ?? "Unknown project"}
                </span>
                <span className="block truncate font-mono text-[10.5px] text-zinc-400">
                  {item.trigger}
                </span>
              </span>
              <span className="font-mono text-[11px] text-zinc-500">{item.id.slice(0, 8)}</span>
              <RootCauseCell status={item.status} />
              <span className="text-right font-mono text-[10.5px] text-zinc-400">
                {formatWhen(item.created_at)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
