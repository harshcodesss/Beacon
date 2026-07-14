"use client";

import Link from "next/link";

import { CardSkeleton } from "@/components/Skeleton";
import { formatWhen } from "@/lib/format";
import type { IncidentStatus, ProjectHealth } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const RUN_SLOTS = 10;

function runColor(status: IncidentStatus | undefined) {
  if (status === "done") return "bg-ok";
  if (status === "failed") return "bg-danger";
  return "bg-zinc-200";
}

function RunStrip({ runs }: { runs: IncidentStatus[] }) {
  const padded: (IncidentStatus | undefined)[] = [...runs].slice(0, RUN_SLOTS);
  while (padded.length < RUN_SLOTS) padded.push(undefined);
  return (
    <div className="flex items-center gap-1">
      {padded.map((status, i) => (
        <span key={i} className={`h-2 w-5 rounded-sm ${runColor(status)}`} />
      ))}
    </div>
  );
}

export function ProjectHealthPanel() {
  const { data: projects, loading } = useApi<ProjectHealth[]>("/projects");

  return (
    <div className="flex h-full flex-col rounded-2xl border border-edge bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-zinc-900">Project health</h2>
        <Link href="/projects" className="text-xs text-beacon-dim hover:underline">
          All projects →
        </Link>
      </div>
      <p className="text-[11px] text-zinc-400">Last 10 runs per project</p>

      {loading && !projects ? (
        <div className="mt-3">
          <CardSkeleton />
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="mt-1 flex flex-1 flex-col justify-center">
          {projects.map((project) => {
            const failing = project.last_runs.some((status) => status === "failed");
            return (
              <div
                key={project.id}
                className="flex items-center justify-between gap-3 border-t border-zinc-100 py-3.5 first:border-t-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">
                    {project.name}
                  </div>
                  <div className="font-mono text-[10.5px] text-zinc-400">
                    {project.settings?.demo ? "demo project" : "beacon.yml"}
                  </div>
                </div>
                <RunStrip runs={project.last_runs} />
                <span
                  className={`shrink-0 text-[11px] font-medium ${
                    failing ? "text-danger-ink" : "text-ok-ink"
                  }`}
                >
                  ● {failing ? "failing" : "healthy"}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                  {project.last_incident_at ? formatWhen(project.last_incident_at) : "no runs"}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
