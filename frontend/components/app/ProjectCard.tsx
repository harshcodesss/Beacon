import Link from "next/link";

import { formatWhen } from "@/lib/format";
import type { ProjectHealth } from "@/lib/types";

const SPARK_SLOTS = 10;

function createdLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProjectCard({ project }: { project: ProjectHealth }) {
  const failing = project.last_runs.some((status) => status === "failed");
  const spark = project.last_runs.slice(-SPARK_SLOTS);
  const padCount = Math.max(0, SPARK_SLOTS - spark.length);

  return (
    <div className="flex h-full min-h-[200px] flex-col rounded-2xl border border-edge bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{project.name}</h3>
          <p className="mt-0.5 font-mono text-[10.5px] text-zinc-400">
            created {createdLabel(project.created_at)} ·{" "}
            {project.settings?.demo ? "demo project" : "api key active"}
          </p>
        </div>
        {failing ? (
          <span className="rounded-full bg-danger-tint px-2.5 py-0.5 text-[10.5px] font-semibold text-danger-ink">
            ● failing
          </span>
        ) : (
          <span className="rounded-full bg-ok-tint px-2.5 py-0.5 text-[10.5px] font-semibold text-ok-ink">
            ● healthy
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-[3px]">
        {Array.from({ length: padCount }).map((_, i) => (
          <span key={`pad-${i}`} className="h-1.5 flex-1 rounded-sm bg-zinc-100" />
        ))}
        {spark.map((status, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-sm ${
              status === "done" ? "bg-ok" : status === "failed" ? "bg-danger" : "bg-zinc-200"
            }`}
          />
        ))}
      </div>

      <div className="mt-auto grid grid-cols-4 gap-2 pt-3.5 text-center">
        <div>
          <div className="text-lg font-semibold text-ink">{project.incident_counts.total}</div>
          <div className="text-[10px] text-zinc-400">Incidents</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-ok-ink">{project.incident_counts.done}</div>
          <div className="text-[10px] text-zinc-400">Done</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-danger-ink">
            {project.incident_counts.failed}
          </div>
          <div className="text-[10px] text-zinc-400">Failed</div>
        </div>
        <div>
          <div className="text-[13px] font-semibold text-ink">
            {project.last_incident_at ? formatWhen(project.last_incident_at) : "none"}
          </div>
          <div className="text-[10px] text-zinc-400">Last run</div>
        </div>
      </div>

      <Link
        href={`/projects/${project.id}`}
        className="mt-3.5 rounded-lg border border-edge bg-surface px-3 py-2 text-center text-[11.5px] font-medium text-zinc-500 hover:border-beacon hover:bg-beacon-tint hover:text-beacon-dim"
      >
        Open project
      </Link>
    </div>
  );
}
