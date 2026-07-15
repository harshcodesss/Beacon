import type { Verdict } from "@/lib/types";

// Accept/reject badges keep the same semantic tints as status chips.
const VERDICT_BADGES: Record<Verdict, string> = {
  accept: "border-emerald-200 bg-emerald-50 text-emerald-700",
  reject: "border-red-200 bg-red-50 text-red-700",
  inconclusive: "border-zinc-300 bg-zinc-100 text-zinc-600",
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const className = VERDICT_BADGES[verdict] ?? VERDICT_BADGES.inconclusive;
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${className}`}
    >
      {verdict}
    </span>
  );
}
