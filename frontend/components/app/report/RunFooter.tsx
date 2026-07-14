"use client";

import { useState } from "react";

export function RunFooter({
  toolCalls,
  tokens,
  elapsed,
  timeline,
}: {
  toolCalls?: string;
  tokens?: string;
  elapsed?: string;
  timeline?: { at: string; text: string }[];
}) {
  const [open, setOpen] = useState(false);
  const hasTimeline = !!timeline && timeline.length > 0;

  return (
    <footer className="mt-6 flex flex-wrap gap-6 border-t border-edge pt-3.5 font-mono text-[12px] text-zinc-500">
      {toolCalls !== undefined ? (
        <span>
          tool calls <span className="font-mono text-zinc-700">{toolCalls}</span>
        </span>
      ) : null}
      {tokens !== undefined ? (
        <span>
          tokens <span className="font-mono text-zinc-700">{tokens}</span>
        </span>
      ) : null}
      {elapsed !== undefined ? (
        <span>
          deploy to report <span className="font-mono text-zinc-700">{elapsed}</span>
        </span>
      ) : null}
      {hasTimeline ? (
        <div className="w-full">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-beacon-dim"
          >
            timeline
          </button>
          {open ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {timeline!.map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="font-mono text-zinc-700">{item.at}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </footer>
  );
}
