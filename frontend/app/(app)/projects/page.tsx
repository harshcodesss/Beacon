"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { NewProjectModal } from "@/components/app/NewProjectModal";
import { ProjectCard } from "@/components/app/ProjectCard";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { FunnelSelect } from "@/components/ui/FunnelSelect";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import type { ProjectHealth } from "@/lib/types";
import { useApi } from "@/lib/useApi";

type TabValue = "all" | "failing" | "quiet";
type SortValue = "recent" | "name" | "incidents";

const QUIET_MS = 14 * 864e5;

function isFailing(project: ProjectHealth): boolean {
  return project.last_runs.some((status) => status === "failed");
}

function isQuiet(project: ProjectHealth): boolean {
  return (
    !project.last_incident_at ||
    Date.now() - new Date(project.last_incident_at).getTime() > QUIET_MS
  );
}

function NewProjectCell({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-edge text-center hover:border-beacon/50"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-2xl text-beacon">
        +
      </span>
      <span className="text-[13px] font-semibold">New project</span>
      <span className="text-[11px] text-zinc-400 max-w-[170px]">
        Point Beacon at a repo and its logs. Reports on the next failure.
      </span>
    </button>
  );
}

function ProjectsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { data: projects, error, loading } = useApi<ProjectHealth[]>("/projects");

  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<TabValue>("all");
  const [sort, setSort] = useState<SortValue>("recent");

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setModalOpen(true);
  }, [searchParams]);

  function openModal() {
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    if (searchParams.get("new") === "1") router.replace("/projects");
  }

  const counts = useMemo(() => {
    const list = projects ?? [];
    return {
      all: list.length,
      failing: list.filter(isFailing).length,
      quiet: list.filter(isQuiet).length,
    };
  }, [projects]);

  const visibleProjects = useMemo(() => {
    const list = projects ?? [];
    const filtered =
      tab === "failing" ? list.filter(isFailing) : tab === "quiet" ? list.filter(isQuiet) : list;

    const sorted = [...filtered];
    if (sort === "recent") {
      sorted.sort((a, b) => {
        if (!a.last_incident_at && !b.last_incident_at) return 0;
        if (!a.last_incident_at) return 1;
        if (!b.last_incident_at) return -1;
        return new Date(b.last_incident_at).getTime() - new Date(a.last_incident_at).getTime();
      });
    } else if (sort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => b.incident_counts.total - a.incident_counts.total);
    }
    return sorted;
  }, [projects, tab, sort]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Projects</h1>
          <p className="text-sm text-zinc-500">
            Every service Beacon is watching, and how it has been holding up.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg bg-ink px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-black"
        >
          + New project
        </button>
      </div>

      {loading && !projects ? (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !projects || projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project pointing at your service's logs and repository, then trigger your first triage run."
          action={
            <Link
              href="/install"
              className="mt-2 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Set up a project
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-edge pb-3">
            <SegmentedTabs
              value={tab}
              onChange={setTab}
              options={[
                { value: "all", label: "All projects", count: counts.all },
                { value: "failing", label: "Failing", count: counts.failing },
                { value: "quiet", label: "Quiet", count: counts.quiet },
              ]}
            />
            <FunnelSelect
              label="Sort"
              value={sort}
              onChange={setSort}
              options={[
                { value: "recent", label: "Recent activity" },
                { value: "name", label: "Name" },
                { value: "incidents", label: "Most incidents" },
              ]}
            />
          </div>

          {visibleProjects.length === 0 ? (
            <p className="text-sm text-zinc-500">No projects match this filter.</p>
          ) : null}

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
            <NewProjectCell onClick={openModal} />
          </div>
        </>
      )}

      <NewProjectModal
        open={modalOpen}
        onClose={closeModal}
        onCreated={(id) => {
          setModalOpen(false);
          router.push(`/projects/${id}`);
        }}
      />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsPageInner />
    </Suspense>
  );
}
