"use client";

export interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: TabOption<T>[];
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg bg-zinc-200/70 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[11.5px] font-medium transition-colors ${
              active ? "bg-white text-ink shadow-sm" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {o.label}
            {o.count !== undefined ? <span className="text-zinc-400">{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
