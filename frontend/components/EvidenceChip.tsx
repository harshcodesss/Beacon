export function EvidenceChip({ citation }: { citation: string }) {
  return (
    <code className="inline-block rounded border border-edge bg-surface px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
      {citation}
    </code>
  );
}
