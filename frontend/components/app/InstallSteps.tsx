"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import type { ApiKeyCreated, ApiKeyMeta, ProjectHealth } from "@/lib/types";
import { useApi, useBackendToken } from "@/lib/useApi";

const GITHUB_ACTION_YAML = `name: Beacon triage

on:
  workflow_run:
    workflows: ["Deploy"]        # name of your deploy workflow
    types: [completed]

permissions:
  contents: read
  issues: write                  # comment on the triggering PR/issue
  pull-requests: write

jobs:
  triage:
    if: \${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Triage the failure
        uses: harshcodesss/Beacon/action@main
        with:
          beacon_api_key: \${{ secrets.BEACON_API_KEY }}
          log_path: ./logs/app.log
          window_minutes: 30`;

const GITLAB_CI_YAML = `beacon_triage:
  stage: .post
  when: on_failure
  script:
    - >
      curl -X POST https://api.beacon.dev/webhook/github
      -H "x-beacon-key: $BEACON_API_KEY"
      -H "Content-Type: application/json"
      -d '{}'`;

const CURL_SNIPPET = `curl -X POST https://api.beacon.dev/webhook/github \\
  -H "x-beacon-key: $BEACON_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{}'`;

const BEACON_YAML = `service: my-api

logs:
  adapter: file
  path: ./logs/app.log

repo:
  path: .
  diff_window: 5      # recent commits to inspect as evidence

budget:
  max_tool_calls: 15
  max_tokens: 60000`;

type CiTab = "github" | "gitlab" | "curl";

const CI_TABS: Array<{ id: CiTab; label: string; code: string }> = [
  { id: "github", label: "GitHub Action", code: GITHUB_ACTION_YAML },
  { id: "gitlab", label: "GitLab", code: GITLAB_CI_YAML },
  { id: "curl", label: "curl", code: CURL_SNIPPET },
];

function CopyButton({
  text,
  variant = "absolute",
}: {
  text: string;
  variant?: "absolute" | "inline";
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast("Copied to clipboard", "success");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Could not copy", "error");
    }
  }

  const base =
    "flex items-center gap-1 rounded-md border border-edge bg-white px-2 py-1 text-[11px] " +
    "font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900";

  return (
    <button
      type="button"
      onClick={copy}
      className={variant === "absolute" ? `absolute right-2 top-2 ${base}` : base}
    >
      {copied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative mt-2">
      <CopyButton text={code} />
      <pre className="overflow-x-auto rounded-lg border border-edge bg-surface-raised p-3 pr-16 font-mono text-[11px] leading-relaxed text-zinc-700">
        {code}
      </pre>
    </div>
  );
}

function StepCircle({ done, n }: { done: boolean; n: number }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
        done ? "bg-beacon text-white" : "bg-zinc-100 text-zinc-500"
      }`}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : n}
    </span>
  );
}

function Connector() {
  return <div className="ml-3.5 h-3 border-l-2 border-zinc-100" />;
}

export function InstallSteps() {
  const toast = useToast();
  const token = useBackendToken();
  const { data: projects } = useApi<ProjectHealth[]>("/projects");
  const project = projects?.[0] ?? null;
  const { data: keys, refresh: refreshKeys } = useApi<ApiKeyMeta[]>(
    project ? `/projects/${project.id}/api-keys` : null,
  );
  const [newKey, setNewKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [ciTab, setCiTab] = useState<CiTab>("github");

  const hasKey = Boolean(project) && ((keys?.length ?? 0) > 0 || newKey !== null);
  const activeSnippet = CI_TABS.find((t) => t.id === ciTab) ?? CI_TABS[0];

  async function generate() {
    if (!project) return;
    setGenerating(true);
    try {
      const created = await apiFetch<ApiKeyCreated>(`/projects/${project.id}/api-keys`, token, {
        method: "POST",
      });
      setNewKey(created.api_key);
      refreshKeys();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to generate key", "error");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-edge bg-white p-5">
      {/* Step 1 */}
      <div className="flex gap-3">
        <StepCircle done={hasKey} n={1} />
        <div className="min-w-0 flex-1 pb-1">
          <h3 className="text-[12.5px] font-semibold text-zinc-800">
            Create a project and grab its key
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Each project gets one API key, shown once.
          </p>
          <div className="mt-2.5">
            {!project ? (
              <Link
                href="/projects?new=1"
                className="inline-block rounded-lg border border-edge bg-surface px-3 py-1.5 text-[11.5px] font-medium text-zinc-600 hover:border-beacon hover:bg-beacon-tint hover:text-beacon-dim"
              >
                Create a project →
              </Link>
            ) : newKey ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-md border border-edge bg-surface px-2 py-1.5 font-mono text-[11px] text-zinc-800">
                  {newKey}
                </code>
                <CopyButton text={newKey} variant="inline" />
              </div>
            ) : hasKey ? (
              <div className="flex items-center justify-between rounded-md border border-edge bg-surface px-3 py-2 text-[11px] text-zinc-500">
                <span className="font-mono">beacon_sk_••••••••</span>
                <span>key active</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-beacon hover:text-black disabled:opacity-50"
              >
                {generating ? "Generating…" : "Generate API key"}
              </button>
            )}
          </div>
        </div>
      </div>
      <Connector />

      {/* Step 2 */}
      <div className="flex gap-3">
        <StepCircle done={false} n={2} />
        <div className="min-w-0 flex-1 pb-1">
          <h3 className="text-[12.5px] font-semibold text-zinc-800">
            Add the failure webhook to CI
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            GitHub Action or plain curl on any failed deploy step.
          </p>
          <div className="mt-2.5 flex gap-1 rounded-lg bg-surface p-1 text-[11px] font-medium">
            {CI_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCiTab(t.id)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  ciTab === t.id
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <CodeBlock code={activeSnippet.code} />
        </div>
      </div>
      <Connector />

      {/* Step 3 */}
      <div className="flex gap-3">
        <StepCircle done={false} n={3} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[12.5px] font-semibold text-zinc-800">
            Point beacon.yml at your logs
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Tell the agent where logs, diffs, and metrics live.
          </p>
          <CodeBlock code={BEACON_YAML} />
        </div>
      </div>
    </div>
  );
}
