import type { ReactNode } from "react";

export function TokenChip({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-[0.06em] font-mono text-[0.82em] font-medium text-zinc-700">
      {children}
    </code>
  );
}

export function CiteChip({
  children,
  target,
  onJump,
}: {
  children: ReactNode;
  target: string;
  onJump: (target: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onJump(target)}
      className="rounded bg-beacon-tint px-1.5 py-[0.06em] font-mono text-[0.82em] text-beacon-dim transition-colors hover:bg-beacon/20"
    >
      {children}
    </button>
  );
}
