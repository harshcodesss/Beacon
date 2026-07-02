import { Collapsible } from "@/components/Collapsible";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { EvidenceChip } from "@/components/EvidenceChip";
import type { Verdict, VerdictItem } from "@/lib/types";

const VERDICT_BADGES: Record<Verdict, string> = {
  accept: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  reject: "bg-red-500/15 text-red-300 border-red-500/30",
  inconclusive: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
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
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{verdict.reasoning}</p>
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
