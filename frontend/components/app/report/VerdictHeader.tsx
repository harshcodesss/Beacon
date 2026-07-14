import { renderInlineTokens } from "@/lib/reportTokens";

export function VerdictHeader({
  kicker,
  headline,
  confidencePct,
  citations,
  duration,
  onJump,
}: {
  kicker: string;
  headline: string;
  confidencePct?: number;
  citations?: number;
  duration?: string;
  onJump: (target: string) => void;
}) {
  const parts: string[] = [];
  if (confidencePct !== undefined) parts.push(`${confidencePct}% confidence`);
  if (citations !== undefined) parts.push(`${citations} citations`);
  if (duration !== undefined) parts.push(`finished in ${duration}`);

  return (
    <header>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-beacon-dim">{kicker}</p>
      <h1 className="mt-1.5 text-[21px] font-semibold leading-[1.5] tracking-tight text-ink">
        {renderInlineTokens(headline, onJump)}
      </h1>
      {confidencePct !== undefined ? (
        <div className="mt-3 h-[5px] w-[120px] rounded bg-zinc-200">
          <div
            className="h-[5px] rounded bg-beacon"
            style={{ width: `${Math.max(0, Math.min(100, confidencePct))}%` }}
          />
        </div>
      ) : null}
      {parts.length > 0 ? (
        <p className="mt-2 text-[12.5px] text-zinc-500">{parts.join(" · ")}</p>
      ) : null}
    </header>
  );
}
