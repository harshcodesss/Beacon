import { Collapsible } from "@/components/Collapsible";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import type { Hypothesis } from "@/lib/types";

export function HypothesesSection({ hypotheses }: { hypotheses: Hypothesis[] }) {
  return (
    <Collapsible title="Hypotheses" badge={`${hypotheses.length}`}>
      <ul className="space-y-4">
        {hypotheses.map((hypothesis) => (
          <li key={hypothesis.id} className="rounded-md border border-edge bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-500">{hypothesis.id}</span>
                <code className="rounded border border-edge bg-surface-overlay px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                  {hypothesis.suspected_component}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">prior</span>
                <ConfidenceBar value={hypothesis.prior_confidence} />
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700">{hypothesis.statement}</p>
            <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <div className="mb-1 font-medium uppercase tracking-wide text-zinc-500">
                  Confirms if
                </div>
                <ul className="list-inside list-disc space-y-1 text-zinc-600">
                  {hypothesis.evidence_to_confirm?.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div>
                <div className="mb-1 font-medium uppercase tracking-wide text-zinc-500">
                  Refutes if
                </div>
                <ul className="list-inside list-disc space-y-1 text-zinc-600">
                  {hypothesis.evidence_to_refute?.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Collapsible>
  );
}
