"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { StatusChip } from "@/components/StatusChip";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import type { IncidentSummary, ProjectWithStats } from "@/lib/types";
import { useApi, useBackendToken } from "@/lib/useApi";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const deltaMs = Date.now() - date.getTime();
  const hours = Math.floor(deltaMs / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.floor(deltaMs / 60_000))}m ago`;
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NewProjectForm({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const token = useBackendToken();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [logPath, setLogPath] = useState("./logs/app.log");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/projects", token, {
        method: "POST",
        body: JSON.stringify({
          name,
          repo_full_name: repo,
          log_source_type: "file",
          settings: {
            path: logPath,
            budget: { max_tool_calls: 15, max_tokens: 60000 },
            delivery: "in_app",
          },
        }),
      });
      toast(`Project “${name}” created`, "success");
      setOpen(false);
      setName("");
      setRepo("");
      onCreated();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create project", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-beacon px-4 py-2 text-sm font-semibold text-black hover:bg-beacon/90"
      >
        New project
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-edge bg-surface-raised p-4"
    >
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 w-44 rounded-md border border-edge bg-surface px-3 text-sm text-zinc-200 outline-none focus:border-beacon/60"
          placeholder="checkout-api"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Repository
        <input
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          className="h-9 w-52 rounded-md border border-edge bg-surface px-3 text-sm text-zinc-200 outline-none focus:border-beacon/60"
          placeholder="org/repo"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Log path
        <input
          value={logPath}
          onChange={(e) => setLogPath(e.target.value)}
          className="h-9 w-44 rounded-md border border-edge bg-surface px-3 font-mono text-xs text-zinc-200 outline-none focus:border-beacon/60"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="h-9 rounded-md bg-beacon px-4 text-sm font-semibold text-black hover:bg-beacon/90 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-md border border-edge px-3 text-sm text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function IncidentRow({ incident }: { incident: IncidentSummary }) {
  return (
    <Link
      href={`/incidents/${incident.id}`}
      className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-surface-overlay"
    >
      <span className="flex items-center gap-2">
        <StatusChip status={incident.status} />
        <span className="font-mono text-xs text-zinc-500">{incident.id.slice(0, 8)}</span>
      </span>
      <span className="text-xs text-zinc-500">
        {incident.trigger} · {formatWhen(incident.created_at)}
      </span>
    </Link>
  );
}

function ProjectCard({
  project,
  onTriggered,
}: {
  project: ProjectWithStats;
  onTriggered: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const token = useBackendToken();
  const [triggering, setTriggering] = useState(false);

  async function triggerIncident() {
    setTriggering(true);
    try {
      const incident = await apiFetch<IncidentSummary>(
        `/projects/${project.id}/incidents`,
        token,
        { method: "POST", body: JSON.stringify({ trigger: "manual" }) },
      );
      toast("Triage started — investigating now", "success");
      onTriggered();
      router.push(`/incidents/${incident.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to trigger incident", "error");
      setTriggering(false);
    }
  }

  return (
    <div className="rounded-lg border border-edge bg-surface-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            {project.name}
            {project.settings?.demo ? (
              <span className="rounded-full bg-beacon/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-beacon">
                demo
              </span>
            ) : null}
          </h3>
          {project.repo_full_name ? (
            <p className="mt-0.5 font-mono text-xs text-zinc-500">{project.repo_full_name}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerIncident}
            disabled={triggering}
            className="rounded-md bg-beacon px-3 py-1.5 text-xs font-semibold text-black hover:bg-beacon/90 disabled:opacity-50"
          >
            {triggering ? "Starting…" : "Trigger incident"}
          </button>
          <Link
            href={`/settings/${project.id}`}
            className="rounded-md border border-edge px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          >
            Settings
          </Link>
        </div>
      </div>

      {project.accuracy ? (
        <div className="mt-4 flex gap-6 border-y border-edge py-3">
          <div>
            <div className="font-mono text-lg font-semibold text-zinc-100">
              {Math.round(project.accuracy.top1_rate * 100)}%
            </div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">top-1 accuracy</div>
          </div>
          <div>
            <div className="font-mono text-lg font-semibold text-zinc-100">
              {Math.round(project.accuracy.top3_rate * 100)}%
            </div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">top-3 accuracy</div>
          </div>
          <div>
            <div className="font-mono text-lg font-semibold text-zinc-100">
              {project.incident_count}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">incidents</div>
          </div>
        </div>
      ) : null}

      <div className="mt-3">
        {project.recent_incidents.length ? (
          <div className="space-y-0.5">
            {project.recent_incidents.map((incident) => (
              <IncidentRow key={incident.id} incident={incident} />
            ))}
          </div>
        ) : (
          <p className="px-2 py-3 text-sm text-zinc-500">
            No incidents yet — trigger one to see Beacon work.
          </p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: projects, error, loading, refresh } = useApi<ProjectWithStats[]>("/projects");
  const toast = useToast();

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">Projects</h1>
          <p className="text-sm text-zinc-500">Incident triage across your services</p>
        </div>
        <NewProjectForm onCreated={refresh} />
      </div>

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : projects?.length ? (
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onTriggered={refresh} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create a project pointing at your service's logs and repository, then trigger your first triage run."
        />
      )}
    </div>
  );
}
