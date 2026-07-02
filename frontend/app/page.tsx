import { ReportView } from "@/components/ReportView";
import { SignInButtons } from "@/components/SignInButtons";
import { VerdictBadge } from "@/components/VerdictsSection";
import { EXAMPLE_REPORT_MD } from "@/lib/fixtures";

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
      - uses: harshcodesss/beacon-action@v1
        with:
          beacon_api_key: \${{ secrets.BEACON_API_KEY }}
          log_path: ./logs/app.log`;

const STEPS = [
  {
    title: "Collect",
    body: "Clusters the last 30 minutes of logs, flags brand-new error templates, and pulls recent deploy diffs — 50K lines compressed to signal.",
  },
  {
    title: "Investigate",
    body: "Generates competing root-cause hypotheses, then verifies each with real tool calls (search_logs, read_diff, get_metric) under a hard budget.",
  },
  {
    title: "Report",
    body: "Delivers an evidence-cited report — root cause, confidence, what was ruled out and why — with every citation deterministically verified.",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-20 pb-16">
      <section className="pt-12 text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-beacon/30 bg-beacon/10 px-3 py-1 text-xs font-medium text-beacon">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-beacon" />
          AI incident triage for on-call engineers
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
          Beacon lights the way to <span className="text-beacon">root cause</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400">
          When a deploy fails at 3 AM, Beacon reads the logs, metrics, and recent commits,
          investigates competing hypotheses with real tool calls, and hands you an
          evidence-cited root-cause report — before you have opened a terminal.
        </p>
        <div className="mt-8 flex justify-center">
          <SignInButtons />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="rounded-lg border border-edge bg-surface-raised p-5">
            <div className="mb-2 font-mono text-xs text-beacon">0{index + 1}</div>
            <h3 className="text-sm font-semibold text-zinc-100">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-1 text-center text-xl font-semibold text-zinc-100">
          What lands in your dashboard
        </h2>
        <p className="mb-6 text-center text-sm text-zinc-500">
          A real report from a fault-injection run — every citation verified against collected
          telemetry.
        </p>
        <div className="mx-auto max-w-3xl overflow-hidden rounded-lg border border-edge bg-surface-raised">
          <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
            <span className="font-mono text-xs text-zinc-500">
              incident 629f64bd · meetpilot-api
            </span>
            <VerdictBadge verdict="accept" />
          </div>
          <div className="max-h-[28rem] overflow-y-auto p-6">
            <ReportView markdown={EXAMPLE_REPORT_MD} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl">
        <h2 className="mb-1 text-center text-xl font-semibold text-zinc-100">
          Install in any repository
        </h2>
        <p className="mb-6 text-center text-sm text-zinc-500">
          Add the GitHub Action, drop in your API key, and Beacon triages every failed deploy.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-edge bg-surface-raised p-5 font-mono text-xs leading-relaxed text-zinc-300">
          {ACTION_SNIPPET}
        </pre>
      </section>
    </div>
  );
}
