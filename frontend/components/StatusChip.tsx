import type { IncidentStatus } from "@/lib/types";

// Semantic tints stay on status chips for scanability (green done, red
// failed); queued/running are neutral in the monochromatic theme.
const STYLES: Record<IncidentStatus, { label: string; className: string; pulse?: boolean }> = {
  queued: { label: "Queued", className: "border-zinc-300 bg-zinc-100 text-zinc-600" },
  running: {
    label: "Running",
    className: "border-zinc-400 bg-zinc-100 text-zinc-800",
    pulse: true,
  },
  done: { label: "Done", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  failed: { label: "Failed", className: "border-red-200 bg-red-50 text-red-700" },
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
