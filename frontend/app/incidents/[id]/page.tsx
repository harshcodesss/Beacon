"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

import { HypothesesSection } from "@/components/HypothesesSection";
import { ReportView } from "@/components/ReportView";
import { ReportSkeleton } from "@/components/Skeleton";
import { StatusChip } from "@/components/StatusChip";
import { useToast } from "@/components/Toast";
import { VerdictsSection } from "@/components/VerdictsSection";
import type { IncidentDetail } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const POLL_MS = 2500;

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-sm font-semibold text-zinc-200">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

function RunningPanel({ status }: { status: "queued" | "running" }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-edge bg-surface-raised px-6 py-16 text-center">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute h-full w-full animate-ping rounded-full bg-beacon/20" />
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-beacon/15 text-lg text-beacon">
          ⌁
        </span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-zinc-200">
          {status === "queued" ? "Waiting for a worker…" : "Investigation in progress"}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Collecting telemetry, generating hypotheses, and verifying evidence with tool calls.
          This page updates live.
        </p>
      </div>
      <ReportSkeleton />
    </div>
  );
}

export default function IncidentPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { data: incident, error, loading } = useApi<IncidentDetail>(
    params?.id ? `/incidents/${params.id}` : null,
    { pollMs: POLL_MS },
  );

  const isActive = incident?.status === "queued" || incident?.status === "running";

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  useEffect(() => {
    if (incident?.status === "done") document.title = "Report ready — Beacon";
  }, [incident?.status]);

  if (loading && !incident) {
    return (
      <div className="mx-auto max-w-3xl">
        <ReportSkeleton />
      </div>
    );
  }

  if (error && !incident) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-200">
        {error} —{" "}
        <Link href="/dashboard" className="underline">
          back to dashboard
        </Link>
      </div>
    );
  }

  if (!incident) return null;

  const report = incident.report;
  const durationSeconds =
    incident.finished_at != null
      ? Math.max(
          1,
          Math.round(
            (new Date(incident.finished_at).getTime() -
              new Date(incident.created_at).getTime()) /
              1000,
          ),
        )
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-zinc-50">Incident</h1>
            <StatusChip status={incident.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {incident.id}
            {incident.project_name ? ` · ${incident.project_name}` : ""} · trigger:{" "}
            {incident.trigger}
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Dashboard
        </Link>
      </div>

      {report && incident.status === "done" ? (
        <div className="flex gap-8 rounded-lg border border-edge bg-surface-raised px-5 py-3">
          <StatBlock label="tool calls" value={`${report.tool_calls_used}`} />
          <StatBlock label="tokens" value={report.tokens_used.toLocaleString()} />
          {durationSeconds ? <StatBlock label="wall clock" value={`${durationSeconds}s`} /> : null}
        </div>
      ) : null}

      {isActive ? <RunningPanel status={incident.status as "queued" | "running"} /> : null}

      {incident.status === "failed" ? (
        <div className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/5 p-5">
          <h3 className="text-sm font-semibold text-red-200">Triage failed</h3>
          <p className="text-sm text-red-200/80">
            The agent run raised an exception. The error is stored below — re-trigger the incident
            from the dashboard after fixing the cause.
          </p>
          {report?.accuracy_meta?.error ? (
            <pre className="max-h-64 overflow-auto rounded-md border border-red-500/20 bg-surface p-3 font-mono text-xs text-red-200/90">
              {String(report.accuracy_meta.error)}
            </pre>
          ) : null}
        </div>
      ) : null}

      {incident.status === "done" && report ? (
        <>
          <div className="rounded-lg border border-edge bg-surface-raised p-6">
            <ReportView markdown={report.report_md} />
          </div>
          {Array.isArray(report.verdicts) && report.verdicts.length ? (
            <VerdictsSection verdicts={report.verdicts} />
          ) : null}
          {Array.isArray(report.hypotheses) && report.hypotheses.length ? (
            <HypothesesSection hypotheses={report.hypotheses} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
