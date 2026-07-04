"use client";

import { useState } from "react";

import { secondaryButton } from "@/lib/format";

const ACTION_SNIPPET = `on:
  workflow_run:
    workflows: ["Deploy"]
    types: [completed]

jobs:
  triage:
    if: \${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: harshcodesss/Beacon/action@main
        with:
          beacon_api_key: \${{ secrets.BEACON_API_KEY }}
          log_path: ./logs/app.log`;

const STEPS = [
  {
    kicker: "01 collect",
    title: "The failing run reports itself",
    body: "The Action grabs the trailing log window, recent commits, and run metadata the moment a deploy concludes in failure.",
  },
  {
    kicker: "02 investigate",
    title: "Hypotheses meet evidence",
    body: "The agent ranks competing root causes, then verifies each one with real tool calls under a hard token and tool-call budget.",
  },
  {
    kicker: "03 report",
    title: "The answer finds you",
    body: "An evidence-cited report lands in the dashboard, your inbox, and as a comment on the failing pull request.",
  },
];

export function HowItRuns() {
  const [copied, setCopied] = useState(false);

  return (
    <section id="install" className="border-t border-edge bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl space-y-14 px-5 sm:px-8">
        <div className="space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            How it runs
          </p>
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            One workflow file. Every failed deploy triaged.
          </h2>
        </div>

        <div className="grid gap-10 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.kicker} className="space-y-2.5">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-400">
                {step.kicker}
              </p>
              <h3 className="text-base font-semibold text-zinc-900">{step.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-600">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-edge">
          <div className="flex items-center justify-between border-b border-edge bg-surface px-4 py-2.5">
            <span className="font-mono text-xs text-zinc-500">.github/workflows/beacon.yml</span>
            <button
              type="button"
              className={`h-8 px-3 text-xs ${secondaryButton}`}
              onClick={() => {
                navigator.clipboard.writeText(ACTION_SNIPPET).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto bg-white p-5 font-mono text-xs leading-relaxed text-zinc-600">
            {ACTION_SNIPPET}
          </pre>
        </div>
      </div>
    </section>
  );
}
