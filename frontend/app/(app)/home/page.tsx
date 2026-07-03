"use client";

import Link from "next/link";
import { useEffect } from "react";

import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { StatusChip } from "@/components/StatusChip";
import { useToast } from "@/components/Toast";
import { formatWhen } from "@/lib/format";
import type { IncidentFeedPage, StatsOverview } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-raised px-4 py-3">
      <div className="font-mono text-lg font-semibold text-zinc-900">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

export default function HomePage() {
  const toast = useToast();
  const { data: stats } = useApi<StatsOverview>("/stats/overview");
  const { data: feed, error, loading } = useApi<IncidentFeedPage>(
    "/incidents?page_size=10",
    { pollMs: 10000 },
  );

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Home</h1>
        <p className="text-sm text-zinc-500">Triage activity across all your projects</p>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="total triages" value={`${stats.total_incidents}`} />
          <Stat
            label="top-1 accuracy"
            value={stats.accuracy ? `${Math.round(stats.accuracy.top1_rate * 100)}%` : "—"}
          />
          <Stat
            label="top-3 accuracy"
            value={stats.accuracy ? `${Math.round(stats.accuracy.top3_rate * 100)}%` : "—"}
          />
          <Stat
            label="avg tokens"
            value={stats.avg_tokens ? Math.round(stats.avg_tokens).toLocaleString() : "—"}
          />
          <Stat
            label="avg tool calls"
            value={stats.avg_tool_calls ? `${stats.avg_tool_calls}` : "—"}
          />
        </div>
      ) : (
        <CardSkeleton />
      )}

      <section className="rounded-lg border border-edge bg-surface-raised">
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">Recent incidents</h2>
          <Link href="/incidents" className="text-xs text-zinc-500 hover:text-zinc-900">
            View all →
          </Link>
        </div>
        {loading && !feed ? (
          <div className="p-4">
            <CardSkeleton />
          </div>
        ) : feed?.items.length ? (
          <ul className="divide-y divide-edge">
            {feed.items.map((incident) => (
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
        ) : (
          <div className="p-4">
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
      </section>
    </div>
  );
}
