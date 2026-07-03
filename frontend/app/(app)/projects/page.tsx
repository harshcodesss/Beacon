"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import { formatWhen, primaryButton, secondaryButton } from "@/lib/format";
import type { ProjectWithStats } from "@/lib/types";
import { useApi, useBackendToken } from "@/lib/useApi";

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
      <button type="button" onClick={() => setOpen(true)} className={`px-4 py-2 ${primaryButton}`}>
        New project
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-edge bg-surface-raised p-4"
    >
      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 w-44 rounded-md border border-edge bg-white px-3 text-sm text-zinc-800 outline-none focus:border-beacon"
          placeholder="checkout-api"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Repository
        <input
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          className="h-9 w-52 rounded-md border border-edge bg-white px-3 text-sm text-zinc-800 outline-none focus:border-beacon"
          placeholder="org/repo"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Log path
        <input
          value={logPath}
          onChange={(e) => setLogPath(e.target.value)}
          className="h-9 w-44 rounded-md border border-edge bg-white px-3 font-mono text-xs text-zinc-800 outline-none focus:border-beacon"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={`h-9 px-4 ${primaryButton}`}>
          {saving ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`h-9 px-3 text-sm ${secondaryButton}`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ProjectCard({ project }: { project: ProjectWithStats }) {
  const lastRun = project.recent_incidents[0]?.created_at;
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group rounded-lg border border-edge bg-surface-raised p-5 transition-colors hover:border-zinc-400"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          {project.name}
          {project.settings?.demo ? (
            <span className="rounded-full border border-edge bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              demo
            </span>
          ) : null}
        </h3>
        <span className="text-zinc-300 transition-colors group-hover:text-zinc-500">→</span>
      </div>
      {project.repo_full_name ? (
        <p className="mt-0.5 font-mono text-xs text-zinc-500">{project.repo_full_name}</p>
      ) : null}
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-edge pt-3 text-xs">
        <div>
          <dt className="text-zinc-400">Incidents</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold text-zinc-800">
            {project.incident_count}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-400">Last run</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold text-zinc-800">
            {lastRun ? formatWhen(lastRun) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-400">Top-1 acc.</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold text-zinc-800">
            {project.accuracy ? `${Math.round(project.accuracy.top1_rate * 100)}%` : "—"}
          </dd>
        </div>
      </dl>
    </Link>
  );
}

export default function ProjectsPage() {
  const { data: projects, error, loading, refresh } = useApi<ProjectWithStats[]>("/projects");
  const toast = useToast();

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Projects</h1>
          <p className="text-sm text-zinc-500">Incident triage across your services</p>
        </div>
        <NewProjectForm onCreated={refresh} />
      </div>

      {loading && !projects ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : projects?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
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
