"use client";

import Link from "next/link";

import { useToast } from "@/components/Toast";
import { secondaryButton } from "@/lib/format";

const WORKFLOW_YAML = `name: Beacon triage

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

      # Fetch the logs you want triaged into the workspace here, e.g. from
      # your log shipper, a deploy artifact, or the failed run's artifacts.

      - name: Triage the failure
        uses: harshcodesss/Beacon/action@main
        with:
          beacon_api_key: \${{ secrets.BEACON_API_KEY }}
          log_path: ./logs/app.log
          window_minutes: 30`;

const INPUTS: Array<{ name: string; required: string; def: string; description: string }> = [
  {
    name: "beacon_api_key",
    required: "yes",
    def: "—",
    description: "Project API key from the project's settings",
  },
  {
    name: "log_path",
    required: "no",
    def: "./logs/app.log",
    description: "Log file to triage, relative to the workspace",
  },
  {
    name: "window_minutes",
    required: "no",
    def: "30",
    description: "Trailing minutes of logs handed to the agent",
  },
  {
    name: "api_url",
    required: "no",
    def: "https://api.beacon.dev",
    description: "Beacon API base URL (point at your own deployment)",
  },
  {
    name: "github_token",
    required: "no",
    def: "workflow token",
    description: "Token used to comment; pass \"\" to disable commenting",
  },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-edge bg-surface-raised font-mono text-xs font-semibold text-zinc-700">
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-zinc-600">{children}</div>
      </div>
    </li>
  );
}

export default function InstallPage() {
  const toast = useToast();

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Install the GitHub Action</h1>
        <p className="text-sm text-zinc-500">
          Beacon triages every failed deploy, posts the report here, and comments it on the
          pull request that caused it.
        </p>
      </div>

      <ol className="space-y-6">
        <Step n={1} title="Generate a project API key">
          Open your project under{" "}
          <Link href="/projects" className="text-zinc-900 underline">
            Projects
          </Link>{" "}
          and use <span className="font-medium">Generate API key</span>. Copy the{" "}
          <code className="rounded border border-edge bg-surface px-1 py-0.5 font-mono text-xs">
            beacon_sk_…
          </code>{" "}
          value immediately — it is stored hashed and shown only once.
        </Step>

        <Step n={2} title="Add it as a repository secret">
          In your repository: <span className="font-medium">Settings → Secrets and variables →
          Actions → New repository secret</span>. Name it{" "}
          <code className="rounded border border-edge bg-surface px-1 py-0.5 font-mono text-xs">
            BEACON_API_KEY
          </code>{" "}
          and paste the key.
        </Step>

        <Step n={3} title="Add the workflow">
          <p className="mb-3">
            Create{" "}
            <code className="rounded border border-edge bg-surface px-1 py-0.5 font-mono text-xs">
              .github/workflows/beacon-triage.yml
            </code>{" "}
            triggered by your deploy workflow&apos;s failures:
          </p>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(WORKFLOW_YAML);
                toast("Workflow YAML copied to clipboard", "success");
              }}
              className={`absolute right-2 top-2 px-2.5 py-1 text-xs ${secondaryButton}`}
            >
              Copy
            </button>
            <pre className="overflow-x-auto rounded-lg border border-edge bg-surface-raised p-4 font-mono text-[11px] leading-relaxed text-zinc-700">
              {WORKFLOW_YAML}
            </pre>
          </div>
        </Step>
      </ol>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">Inputs</h2>
        <div className="overflow-x-auto rounded-lg border border-edge bg-surface-raised">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2.5 font-medium">Input</th>
                <th className="px-4 py-2.5 font-medium">Required</th>
                <th className="px-4 py-2.5 font-medium">Default</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {INPUTS.map((input) => (
                <tr key={input.name}>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-800">{input.name}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-600">{input.required}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{input.def}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-600">{input.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-sm text-zinc-500">
        Full guide with outputs, self-hosting notes, and the raw webhook contract:{" "}
        <a
          href="https://github.com/harshcodesss/Beacon/blob/main/INSTALL.md"
          target="_blank"
          rel="noreferrer"
          className="text-zinc-900 underline"
        >
          INSTALL.md
        </a>
        .
      </p>
    </div>
  );
}
