"use client";

import { useState } from "react";

export function Collapsible({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg border border-edge bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
          {title}
          {badge ? (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500">
              {badge}
            </span>
          ) : null}
        </span>
        <span className={`text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open ? <div className="border-t border-edge px-4 py-4">{children}</div> : null}
    </section>
  );
}
