import { Collapsible } from "@/components/Collapsible";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { EvidenceChip } from "@/components/EvidenceChip";
import type { Verdict, VerdictItem } from "@/lib/types";

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

export function VerdictsSection({ verdicts }: { verdicts: VerdictItem[] }) {
  return (
    <Collapsible title="Verdicts" badge={`${verdicts.length}`} defaultOpen>
      <ul className="space-y-4">
        {verdicts.map((verdict) => (
          <li
            key={verdict.hypothesis_id}
            className="rounded-md border border-edge bg-surface p-4"
            data-testid="verdict-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-500">{verdict.hypothesis_id}</span>
                <VerdictBadge verdict={verdict.verdict} />
              </div>
              <ConfidenceBar value={verdict.confidence} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700">{verdict.reasoning}</p>
            {verdict.evidence?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {verdict.evidence.map((citation) => (
                  <EvidenceChip key={citation} citation={citation} />
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Collapsible>
  );
}
