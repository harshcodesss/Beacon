"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function NewProjectTile() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/projects?new=1")}
      className="group flex min-h-full flex-col items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-br from-[#3d3d3d] to-[#232323] p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-beacon text-white transition-transform group-hover:rotate-90 motion-safe:animate-[beacon-radar_2.4s_ease-in-out_infinite]">
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </span>
      <span className="text-sm font-semibold text-white">New project</span>
      <span className="max-w-[180px] text-[11px] leading-snug text-white/55">
        Point Beacon at a repo and its logs. Reports on the next failure.
      </span>
    </button>
  );
}
