import type { ReactNode } from "react";

function withHighlight(lines: string, highlight?: string): ReactNode {
  if (!highlight) return lines;
  const idx = lines.indexOf(highlight);
  if (idx === -1) return lines;
  return (
    <>
      {lines.slice(0, idx)}
      <mark className="rounded-[3px] bg-[#ffe9d4] px-0.5">{highlight}</mark>
      {lines.slice(idx + highlight.length)}
    </>
  );
}

export function EvidenceQuote({
  id,
  source,
  lines,
  highlight,
}: {
  id: string;
  source: string;
  lines: string;
  highlight?: string;
}) {
  return (
    <div
      id={id}
      className="rounded-r-lg border-l-[3px] border-[#ffd9b3] bg-zinc-50 px-3.5 py-2.5"
    >
      <p className="font-mono text-[10.5px] text-zinc-400">{source}</p>
      <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-zinc-700">
        {withHighlight(lines, highlight)}
      </pre>
    </div>
  );
}
