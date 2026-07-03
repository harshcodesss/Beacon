"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { StatusChip } from "@/components/StatusChip";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import { formatWhen, primaryButton, secondaryButton } from "@/lib/format";
import type { ApiKeyCreated, ApiKeyMeta, IncidentPage, Project } from "@/lib/types";
import { useApi, useBackendToken } from "@/lib/useApi";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-edge bg-surface-raised p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-800">{title}</h2>
      {children}
    </section>
  );
}

function IncidentList({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const { data, loading } = useApi<IncidentPage>(
    `/projects/${projectId}/incidents?page=${page}&page_size=10`,
    { pollMs: 10000 },
  );
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <section className="rounded-lg border border-edge bg-surface-raised">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">Incidents</h2>
        {data && totalPages > 1 ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className={`px-2 py-1 ${secondaryButton}`}
            >
              ←
            </button>
            {page} / {totalPages}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={`px-2 py-1 ${secondaryButton}`}
            >
              →
            </button>
          </div>
        ) : null}
      </div>
      {loading && !data ? (
        <div className="p-4">
          <CardSkeleton />
        </div>
      ) : data?.items.length ? (
        <ul className="divide-y divide-edge">
          {data.items.map((incident) => (
            <li key={incident.id}>
              <Link
                href={`/incidents/${incident.id}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-surface-overlay"
              >
                <span className="flex items-center gap-3">
                  <StatusChip status={incident.status} />
                  <span className="font-mono text-xs text-zinc-400">
                    {incident.id.slice(0, 8)}
                  </span>
                </span>
                <span className="text-xs text-zinc-500">
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
            description="Trigger one to see Beacon investigate this project."
          />
        </div>
      )}
    </section>
  );
}

function ApiKeysSection({ projectId }: { projectId: string }) {
  const toast = useToast();
  const token = useBackendToken();
  const { data: keys, refresh } = useApi<ApiKeyMeta[]>(`/projects/${projectId}/api-keys`);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const created = await apiFetch<ApiKeyCreated>(
        `/projects/${projectId}/api-keys`,
        token,
        { method: "POST" },
      );
      setNewKey(created.api_key);
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to generate key", "error");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SectionCard title="API keys">
      <p className="mb-4 text-sm text-zinc-500">
        Used by the GitHub Action and the webhook endpoint. Keys are stored hashed — the raw key
        is shown once, right after generation.
      </p>
      {newKey ? (
        <div className="mb-4 space-y-2 rounded-md border border-zinc-300 bg-surface p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-700">
            Copy this key now — it won&apos;t be shown again
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded border border-edge bg-white px-2 py-1.5 font-mono text-xs text-zinc-800">
              {newKey}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                toast("API key copied to clipboard", "success");
              }}
              className={`px-3 py-1.5 text-xs ${secondaryButton}`}
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}
      {keys?.length ? (
        <ul className="mb-4 space-y-1.5">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex items-center justify-between rounded-md border border-edge bg-surface px-3 py-2 text-xs"
            >
              <span className="font-mono text-zinc-500">beacon_sk_••••••••</span>
              <span className="text-zinc-500">
                created {new Date(key.created_at).toLocaleDateString()}
                {key.last_used_at
                  ? ` · last used ${new Date(key.last_used_at).toLocaleString()}`
                  : " · never used"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-zinc-400">No keys yet.</p>
      )}
      <button
        type="button"
        onClick={generate}
        disabled={generating}
        className={`px-4 py-2 ${primaryButton}`}
      >
        {generating ? "Generating…" : "Generate API key"}
      </button>
    </SectionCard>
  );
}

function ProjectSettingsForm({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const toast = useToast();
  const token = useBackendToken();

  const [name, setName] = useState(project.name);
  const [repo, setRepo] = useState(project.repo_full_name);
  const [logPath, setLogPath] = useState(project.settings?.path ?? "./logs/app.log");
  const [maxToolCalls, setMaxToolCalls] = useState(
    project.settings?.budget?.max_tool_calls ?? 15,
  );
  const [maxTokens, setMaxTokens] = useState(project.settings?.budget?.max_tokens ?? 60000);
  const [delivery, setDelivery] = useState<"in_app" | "email">(
    project.settings?.delivery ?? "in_app",
  );
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/projects/${project.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          repo_full_name: repo,
          log_source_type: "file",
          settings: {
            ...project.settings,
            path: logPath,
            budget: { max_tool_calls: maxToolCalls, max_tokens: maxTokens },
            delivery,
          },
        }),
      });
      toast("Settings saved", "success");
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <SectionCard title="Log source">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Project name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 rounded-md border border-edge bg-white px-3 text-sm text-zinc-800 outline-none focus:border-beacon"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Repository (org/repo)
            <input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="h-9 rounded-md border border-edge bg-white px-3 text-sm text-zinc-800 outline-none focus:border-beacon"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2">
            Log file path
            <input
              value={logPath}
              onChange={(e) => setLogPath(e.target.value)}
              className="h-9 rounded-md border border-edge bg-white px-3 font-mono text-xs text-zinc-800 outline-none focus:border-beacon"
            />
            <span className="text-[11px] text-zinc-400">
              v1 supports the file adapter; Loki/CloudWatch adapters are on the roadmap.
            </span>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Budget">
        <div className="space-y-5">
          <label className="block text-xs text-zinc-500">
            <div className="mb-2 flex items-center justify-between">
              <span>Max tool calls per incident</span>
              <span className="font-mono text-sm text-zinc-800">{maxToolCalls}</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={maxToolCalls}
              onChange={(e) => setMaxToolCalls(Number(e.target.value))}
            />
            <span className="text-[11px] text-zinc-400">
              Hard cap enforced in code — keeps the investigator from spiraling.
            </span>
          </label>
          <label className="block text-xs text-zinc-500">
            <div className="mb-2 flex items-center justify-between">
              <span>Max tokens per incident</span>
              <span className="font-mono text-sm text-zinc-800">
                {maxTokens.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={10000}
              max={200000}
              step={5000}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Report delivery">
        <div className="flex flex-col gap-2 text-sm text-zinc-700">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="delivery"
              checked={delivery === "in_app"}
              onChange={() => setDelivery("in_app")}
              className="accent-zinc-900"
            />
            View in app only
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="delivery"
              checked={delivery === "email"}
              onChange={() => setDelivery("email")}
              className="accent-zinc-900"
            />
            Also email me the report when triage completes
          </label>
          <span className="text-[11px] text-zinc-400">
            Transactional send via Resend or SMTP, configured server-side.
          </span>
        </div>
      </SectionCard>

      <button type="submit" disabled={saving} className={`px-5 py-2 ${primaryButton}`}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;
  const router = useRouter();
  const toast = useToast();
  const token = useBackendToken();
  const [triggering, setTriggering] = useState(false);
  const { data: project, error, loading, refresh } = useApi<Project>(
    projectId ? `/projects/${projectId}` : null,
  );

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  async function triggerIncident() {
    setTriggering(true);
    try {
      const incident = await apiFetch<{ id: string }>(`/projects/${projectId}/incidents`, token, {
        method: "POST",
        body: JSON.stringify({ trigger: "manual" }),
      });
      toast("Triage started — investigating now", "success");
      router.push(`/incidents/${incident.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to trigger incident", "error");
      setTriggering(false);
    }
  }

  if (loading && !project) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Project not found —{" "}
        <Link href="/projects" className="underline">
          back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
            {project.name}
            {project.settings?.demo ? (
              <span className="rounded-full border border-edge bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                demo
              </span>
            ) : null}
          </h1>
          {project.repo_full_name ? (
            <p className="mt-0.5 font-mono text-xs text-zinc-500">{project.repo_full_name}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerIncident}
            disabled={triggering}
            className={`px-4 py-2 ${primaryButton}`}
          >
            {triggering ? "Starting…" : "Trigger incident"}
          </button>
          <Link href="/projects" className={`px-3 py-2 text-sm ${secondaryButton}`}>
            ← Projects
          </Link>
        </div>
      </div>

      {projectId ? <IncidentList projectId={projectId} /> : null}
      <ProjectSettingsForm project={project} onSaved={refresh} />
      {projectId ? <ApiKeysSection projectId={projectId} /> : null}
    </div>
  );
}
