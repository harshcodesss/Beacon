"use client";

import { Filter } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function FunnelSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative inline-flex">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-[12px] text-zinc-700">
        <Filter className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} />
        <span className="text-zinc-500">{label}:</span>
        <span className="font-medium">{current?.label}</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-md border border-edge bg-white py-1 shadow-md">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] hover:bg-surface ${
                o.value === value ? "font-medium text-ink" : "text-zinc-500"
              }`}
            >
              {o.label}
              {o.value === value ? <span className="text-beacon">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
