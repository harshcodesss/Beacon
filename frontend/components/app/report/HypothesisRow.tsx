"use client";

import { useState } from "react";
import { renderInlineTokens } from "@/lib/reportTokens";

export function HypothesisRow({
  statement,
  confirmed,
  confidencePct,
  checks,
  reason,
  onJump,
}: {
  statement: string;
  confirmed: boolean;
  confidencePct?: number;
  checks?: { pass: boolean; text: string }[];
  reason?: string;
  onJump: (target: string) => void;
}) {
  const [open, setOpen] = useState(confirmed);

  return (
    <div className="rounded-lg border border-zinc-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        <span className={confirmed ? "text-ok-ink" : "text-zinc-400"}>
          {confirmed ? "✓" : "✕"}
        </span>
        <span className={`text-[12.5px] ${confirmed ? "" : "text-zinc-500"}`}>
          {renderInlineTokens(statement, onJump)}
        </span>
        <span className="ml-auto font-mono text-[12px] text-zinc-500">
          {confirmed && confidencePct !== undefined ? `${confidencePct}%` : "rejected"}
        </span>
        <span className={`text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open ? (
        <div className="border-t border-zinc-100 bg-zinc-50/60 px-3.5 py-3 pl-10">
          {checks?.map((check, i) => (
            <p key={i} className="flex items-start gap-2 text-[12.5px]">
              <span className={check.pass ? "text-ok-ink" : "text-danger-ink"}>
                {check.pass ? "✓" : "✕"}
              </span>
              <span>{renderInlineTokens(check.text, onJump)}</span>
            </p>
          ))}
          {reason ? (
            <p className="mt-2 border-t border-dashed border-zinc-200 pt-2 text-[12px] text-zinc-500">
              {reason}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
