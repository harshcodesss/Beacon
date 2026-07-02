import type { IncidentStatus } from "@/lib/types";

const STYLES: Record<IncidentStatus, { label: string; className: string; pulse?: boolean }> = {
  queued: { label: "Queued", className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  running: {
    label: "Running",
    className: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    pulse: true,
  },
  done: { label: "Done", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  failed: { label: "Failed", className: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export function StatusChip({ status }: { status: IncidentStatus }) {
  const style = STYLES[status] ?? STYLES.queued;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${style.pulse ? "animate-pulse" : ""}`}
      />
      {style.label}
    </span>
  );
}
