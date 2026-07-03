import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { ReportView } from "@/components/ReportView";
import { SignInButtons } from "@/components/SignInButtons";
import { VerdictBadge } from "@/components/VerdictsSection";
import { authOptions } from "@/lib/auth";
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
      - uses: harshcodesss/Beacon/action@main
        with:
          beacon_api_key: \${{ secrets.BEACON_API_KEY }}
          log_path: ./logs/app.log`;

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/home");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-edge bg-surface-raised">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2.5 px-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-beacon/15 text-beacon">
            ⌁
          </span>
          <span className="text-sm font-semibold tracking-wide text-zinc-900">Beacon</span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <section className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface-raised px-3 py-1 text-xs font-medium text-zinc-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-beacon" />
            AI incident triage for on-call engineers
          </p>
          <h1 className="max-w-xl text-4xl font-bold tracking-tight text-zinc-900">
            Beacon lights the way to root cause
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-zinc-600">
            When a deploy fails at 3 AM, Beacon reads the logs, metrics, and recent commits,
            investigates competing hypotheses with real tool calls, and hands you an
            evidence-cited root-cause report — before you have opened a terminal.
          </p>
          <SignInButtons />
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Or install the Action — Beacon triages every failed deploy
            </div>
            <pre className="overflow-x-auto rounded-lg border border-edge bg-surface-raised p-4 font-mono text-[11px] leading-relaxed text-zinc-600">
              {ACTION_SNIPPET}
            </pre>
          </div>
        </section>

        <section className="hidden lg:block">
          <div className="overflow-hidden rounded-lg border border-edge bg-surface-raised shadow-sm">
            <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
              <span className="font-mono text-xs text-zinc-500">
                incident 629f64bd · meetpilot-api
              </span>
              <VerdictBadge verdict="accept" />
            </div>
            <div className="max-h-[34rem] overflow-y-auto p-6">
              <ReportView markdown={EXAMPLE_REPORT_MD} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
