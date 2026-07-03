"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { StatusChip } from "@/components/StatusChip";
import { useToast } from "@/components/Toast";
import { formatWhen, secondaryButton } from "@/lib/format";
import type { IncidentFeedPage, IncidentStatus, ProjectWithStats } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const STATUSES: IncidentStatus[] = ["queued", "running", "done", "failed"];
const PAGE_SIZE = 20;

export default function IncidentsPage() {
  const toast = useToast();
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: `${page}`, page_size: `${PAGE_SIZE}` });
  if (projectId) query.set("project_id", projectId);
  if (status) query.set("status", status);

  const { data: projects } = useApi<ProjectWithStats[]>("/projects");
  const { data, error, loading } = useApi<IncidentFeedPage>(
    `/incidents?${query.toString()}`,
    { pollMs: 10000 },
  );
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  const selectClass =
    "h-9 rounded-md border border-edge bg-white px-2.5 text-sm text-zinc-700 outline-none focus:border-beacon";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Incidents</h1>
        <p className="text-sm text-zinc-500">Every triage run across your projects</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setPage(1);
          }}
          className={selectClass}
          aria-label="Filter by project"
        >
          <option value="">All projects</option>
          {projects?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {data ? (
          <span className="text-xs text-zinc-500">
            {data.total} incident{data.total === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {loading && !data ? (
        <CardSkeleton />
      ) : data?.items.length ? (
        <div className="overflow-hidden rounded-lg border border-edge bg-surface-raised">
          <ul className="divide-y divide-edge">
            {data.items.map((incident) => (
              <li key={incident.id}>
                <Link
                  href={`/incidents/${incident.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-surface-overlay"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <StatusChip status={incident.status} />
                    <span className="truncate text-sm text-zinc-700">
                      {incident.project_name}
                    </span>
                    <span className="hidden font-mono text-xs text-zinc-400 sm:inline">
                      {incident.id.slice(0, 8)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {incident.trigger} · {formatWhen(incident.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          title="No incidents match"
          description="Adjust the filters, or trigger a triage run from a project."
        />
      )}

      {data && totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 text-sm text-zinc-500">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={`px-3 py-1.5 text-xs ${secondaryButton}`}
          >
            ← Prev
          </button>
          Page {page} of {totalPages}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className={`px-3 py-1.5 text-xs ${secondaryButton}`}
          >
            Next →
          </button>
        </div>
      ) : null}
    </div>
  );
}
