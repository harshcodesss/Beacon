"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import type { ApiKeyCreated, ApiKeyMeta, Project } from "@/lib/types";
import { useApi, useBackendToken } from "@/lib/useApi";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-edge bg-surface-raised p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-100">{title}</h2>
      {children}
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
        <div className="mb-4 space-y-2 rounded-md border border-beacon/40 bg-beacon/5 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-beacon">
            Copy this key now — it won&apos;t be shown again
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded border border-edge bg-surface px-2 py-1.5 font-mono text-xs text-zinc-200">
              {newKey}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                toast("API key copied to clipboard", "success");
              }}
              className="rounded-md border border-edge px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
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
              <span className="font-mono text-zinc-400">beacon_sk_••••••••</span>
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
        <p className="mb-4 text-sm text-zinc-600">No keys yet.</p>
      )}
      <button
        type="button"
        onClick={generate}
        disabled={generating}
        className="rounded-md bg-beacon px-4 py-2 text-sm font-semibold text-black hover:bg-beacon/90 disabled:opacity-50"
      >
        {generating ? "Generating…" : "Generate API key"}
      </button>
    </SectionCard>
  );
}

export default function SettingsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const toast = useToast();
  const token = useBackendToken();
  const { data: project, error, loading } = useApi<Project>(
    projectId ? `/projects/${projectId}` : null,
  );

  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [logPath, setLogPath] = useState("");
  const [maxToolCalls, setMaxToolCalls] = useState(15);
  const [maxTokens, setMaxTokens] = useState(60000);
  const [delivery, setDelivery] = useState<"in_app" | "email">("in_app");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setRepo(project.repo_full_name);
    setLogPath(project.log_source_config?.path ?? "./logs/app.log");
    setMaxToolCalls(project.log_source_config?.budget?.max_tool_calls ?? 15);
    setMaxTokens(project.log_source_config?.budget?.max_tokens ?? 60000);
    setDelivery(project.log_source_config?.delivery ?? "in_app");
  }, [project]);

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    try {
      await apiFetch(`/projects/${project.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          repo_full_name: repo,
          log_source_type: "file",
          log_source_config: {
            ...project.log_source_config,
            path: logPath,
            budget: { max_tool_calls: maxToolCalls, max_tokens: maxTokens },
            delivery,
          },
        }),
      });
      toast("Settings saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !project) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-200">
        Project not found —{" "}
        <Link href="/dashboard" className="underline">
          back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">Project settings</h1>
          <p className="mt-0.5 font-mono text-xs text-zinc-500">{project.name}</p>
        </div>
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Dashboard
        </Link>
      </div>

      <form onSubmit={save} className="space-y-5">
        <SectionCard title="Log source">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Project name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 rounded-md border border-edge bg-surface px-3 text-sm text-zinc-200 outline-none focus:border-beacon/60"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Repository (org/repo)
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="h-9 rounded-md border border-edge bg-surface px-3 text-sm text-zinc-200 outline-none focus:border-beacon/60"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-400 sm:col-span-2">
              Log file path
              <input
                value={logPath}
                onChange={(e) => setLogPath(e.target.value)}
                className="h-9 rounded-md border border-edge bg-surface px-3 font-mono text-xs text-zinc-200 outline-none focus:border-beacon/60"
              />
              <span className="text-[11px] text-zinc-600">
                v1 supports the file adapter; Loki/CloudWatch adapters are on the roadmap.
              </span>
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Budget">
          <div className="space-y-5">
            <label className="block text-xs text-zinc-400">
              <div className="mb-2 flex items-center justify-between">
                <span>Max tool calls per incident</span>
                <span className="font-mono text-sm text-zinc-200">{maxToolCalls}</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={maxToolCalls}
                onChange={(e) => setMaxToolCalls(Number(e.target.value))}
              />
              <span className="text-[11px] text-zinc-600">
                Hard cap enforced in code — keeps the investigator from spiraling.
              </span>
            </label>
            <label className="block text-xs text-zinc-400">
              <div className="mb-2 flex items-center justify-between">
                <span>Max tokens per incident</span>
                <span className="font-mono text-sm text-zinc-200">
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
          <div className="flex flex-col gap-2 text-sm text-zinc-300">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="delivery"
                checked={delivery === "in_app"}
                onChange={() => setDelivery("in_app")}
                className="accent-[#f5a623]"
              />
              View in app only
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="delivery"
                checked={delivery === "email"}
                onChange={() => setDelivery("email")}
                className="accent-[#f5a623]"
              />
              Also email me the report when triage completes
            </label>
            <span className="text-[11px] text-zinc-600">
              Transactional send via Resend or SMTP, configured server-side.
            </span>
          </div>
        </SectionCard>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-beacon px-5 py-2 text-sm font-semibold text-black hover:bg-beacon/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>

      {projectId ? <ApiKeysSection projectId={projectId} /> : null}
    </div>
  );
}
