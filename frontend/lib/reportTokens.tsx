import type { ReactNode } from "react";
import { CiteChip, TokenChip } from "@/components/ui/TokenChip";

// Matches a path-ish token with a dot-extension followed by ":line", e.g.
// "app.log:1042" or "api/config.py:18". Future extension: commit hashes and
// metric-style citations are intentionally out of scope for this parser.
const CITE = /([\w./-]+\.[a-z]{1,4}:\d+)/g;

export function renderInlineTokens(text: string, onJump: (target: string) => void): ReactNode[] {
  const out: ReactNode[] = [];
  let k = 0;
  text.split("`").forEach((seg, i) => {
    if (i % 2 === 1) {
      out.push(<TokenChip key={k++}>{seg}</TokenChip>);
      return;
    }
    let last = 0;
    for (const m of Array.from(seg.matchAll(CITE))) {
      const start = m.index ?? 0;
      if (start > last) out.push(<span key={k++}>{seg.slice(last, start)}</span>);
      out.push(
        <CiteChip key={k++} target={m[1]} onJump={onJump}>
          {m[1]}
        </CiteChip>,
      );
      last = start + m[1].length;
    }
    if (last < seg.length) out.push(<span key={k++}>{seg.slice(last)}</span>);
  });
  return out;
}
