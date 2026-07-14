"use client";

import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { StatusChip } from "@/components/StatusChip";
import { formatWhen } from "@/lib/format";
import type { IncidentFeedPage } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export function RecentIncidents() {
  const { data: feed, loading } = useApi<IncidentFeedPage>("/incidents?page_size=10", {
    pollMs: 10000,
  });

  return (
    <div className="rounded-2xl border border-edge bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Recent incidents</h2>
        <Link href="/incidents" className="text-xs text-beacon-dim hover:underline">
          View all →
        </Link>
      </div>

      {loading && !feed ? (
        <div className="mt-3">
          <CardSkeleton />
        </div>
      ) : feed?.items.length ? (
        <div className="mt-1">
          {feed.items.map((incident) => (
            <Link
              key={incident.id}
              href={`/incidents/${incident.id}`}
              className="flex items-center gap-3 border-t border-zinc-100 px-1 py-2.5 first:border-t-0 hover:bg-surface"
            >
              <StatusChip status={incident.status} />
              <span className="truncate text-[12.5px] font-medium text-zinc-900">
                {incident.project_name}
              </span>
              <span className="font-mono text-[11px] text-zinc-400">
                {incident.id.slice(0, 8)}
              </span>
              <span className="ml-auto shrink-0 text-[11px] text-zinc-400">
                {incident.trigger} · {formatWhen(incident.created_at)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState
            title="No incidents yet"
            description="Create a project and trigger your first triage run to see Beacon work."
            action={
              <Link href="/projects" className="text-sm text-zinc-900 underline">
                Go to projects
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
