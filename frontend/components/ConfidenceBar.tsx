// Confidence bars are one of the few places the orange accent is allowed.
export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="flex items-center gap-2" title={`Confidence ${pct}%`}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-beacon" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-zinc-500">{pct}%</span>
    </div>
  );
}
