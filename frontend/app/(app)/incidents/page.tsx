"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { IncidentsTable } from "@/components/app/IncidentsTable";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { FunnelSelect } from "@/components/ui/FunnelSelect";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import type { IncidentFeedPage, ProjectHealth, StatsOverview } from "@/lib/types";
import { useApi } from "@/lib/useApi";

type TabValue = "all" | "running" | "done" | "failed";

export default function IncidentsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabValue>("all");
  const [projectId, setProjectId] = useState("all");

  const { data: stats } = useApi<StatsOverview>("/stats/overview");
  const { data: projects } = useApi<ProjectHealth[]>("/projects");

  const feedPath = useMemo(() => {
    const query = new URLSearchParams({ page_size: "50" });
    if (tab !== "all") query.set("status", tab);
    if (projectId !== "all") query.set("project_id", projectId);
    return `/incidents?${query.toString()}`;
  }, [tab, projectId]);

  const {
    data: feed,
    error,
    loading,
  } = useApi<IncidentFeedPage>(feedPath, { pollMs: 10000 });

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  const projectOptions = useMemo(
    () => [
      { value: "all", label: "All projects" },
      ...(projects ?? []).map((project) => ({ value: project.id, label: project.name })),
    ],
    [projects],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Incidents</h1>
        <p className="text-sm text-zinc-500">
          Every triage run across your projects, newest first.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge pb-3">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All", count: stats?.total_incidents ?? 0 },
            { value: "running", label: "Running", count: stats?.active ?? 0 },
            { value: "done", label: "Done", count: stats?.done ?? 0 },
            { value: "failed", label: "Failed", count: stats?.failed ?? 0 },
          ]}
        />
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            live
          </span>
          <FunnelSelect
            label="Project"
            value={projectId}
            onChange={setProjectId}
            options={projectOptions}
          />
        </div>
      </div>

      {loading && !feed ? (
        <div className="space-y-3.5">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !feed || feed.items.length === 0 ? (
        <EmptyState
          title="No incidents yet"
          description="Create a project and trigger your first triage run to see Beacon work."
          action={
            <Link href="/projects" className="text-sm text-zinc-900 underline">
              Go to projects
            </Link>
          }
        />
      ) : (
        <IncidentsTable items={feed.items} />
      )}
    </div>
  );
}
