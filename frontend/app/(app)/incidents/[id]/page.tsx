"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EvidenceQuote } from "@/components/app/report/EvidenceQuote";
import { HypothesisRow } from "@/components/app/report/HypothesisRow";
import { RunFooter } from "@/components/app/report/RunFooter";
import { VerdictHeader } from "@/components/app/report/VerdictHeader";
import { ReportView } from "@/components/ReportView";
import { ReportSkeleton } from "@/components/Skeleton";
import { StatusChip } from "@/components/StatusChip";
import { useToast } from "@/components/Toast";
import { ApiError, apiFetch } from "@/lib/api";
import type { IncidentDetail, IncidentStatus, Report, VerdictItem } from "@/lib/types";
import { useApi, useBackendToken } from "@/lib/useApi";

const POLL_MS = 4000;
const EVIDENCE_VISIBLE = 2;
const FLASH_CLASSES = ["ring-2", "ring-beacon", "ring-offset-2"];

// Matches a leading "path.ext:line" ref so an evidence string can be shown
// with its source file, falling back to a generic "evidence" label.
const FILE_LINE_RE = /^([\w./-]+\.[a-zA-Z]{1,4}:\d+)/;

function evidenceSource(text: string): string {
  const match = text.match(FILE_LINE_RE);
  return match ? match[1] : "evidence";
}

function collectEvidence(verdicts: VerdictItem[] | null): string[] {
  if (!verdicts) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const verdict of verdicts) {
    for (const item of verdict.evidence ?? []) {
      if (!seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    }
  }
  return out;
}

function pickBestVerdict(verdicts: VerdictItem[] | null): VerdictItem | null {
  if (!verdicts || verdicts.length === 0) return null;
  const accepted = verdicts.filter((v) => v.verdict === "accept");
  const pool = accepted.length ? accepted : verdicts;
  return pool.reduce((best, v) => (v.confidence > best.confidence ? v : best), pool[0]);
}

// Confidence is stored 0..1 in the seeded data; tolerate a 0..100 scale too.
function scaleConfidence(value: number): number {
  return value > 1 ? value : value * 100;
}

function firstMarkdownLine(md: string): string {
  const line = md
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("#"));
  if (!line) return "Investigation complete.";
  return line.replace(/\*\*/g, "").replace(/^Root cause \(one line\):\s*/i, "");
}

function deriveHeadline(report: Report, best: VerdictItem | null): string {
  if (best) {
    const reasoning = best.reasoning?.trim();
    if (reasoning && reasoning.length >= 40) return reasoning;
    const hypothesis = report.hypotheses?.find((h) => h.id === best.hypothesis_id);
    if (hypothesis?.statement) return hypothesis.statement;
    if (reasoning) return reasoning;
  }
  return firstMarkdownLine(report.report_md);
}

function formatDuration(startIso: string, endIso: string | null): string | undefined {
  if (!endIso) return undefined;
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return undefined;
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function DocCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-edge bg-white px-8 py-7">{children}</div>
  );
}

function DoneBody({ incident, report }: { incident: IncidentDetail; report: Report }) {
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const evidence = collectEvidence(report.verdicts);
  const best = pickBestVerdict(report.verdicts);
  const headline = deriveHeadline(report, best);
  const confidencePct = best ? Math.round(scaleConfidence(best.confidence)) : undefined;
  const citations = report.verdicts?.reduce((n, v) => n + (v.evidence?.length ?? 0), 0);
  const duration = formatDuration(incident.created_at, incident.finished_at);

  const handleJump = useCallback(
    (target: string) => {
      const idx = evidence.findIndex((item) => item.includes(target));
      if (idx === -1) {
        document
          .getElementById("evidence-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (idx >= EVIDENCE_VISIBLE) setShowAllEvidence(true);
      requestAnimationFrame(() => {
        const el = document.getElementById(`ev-${idx}`);
        if (!el) {
          document
            .getElementById("evidence-section")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add(...FLASH_CLASSES);
        setTimeout(() => el.classList.remove(...FLASH_CLASSES), 1200);
      });
    },
    [evidence],
  );

  const visibleEvidence = evidence.slice(0, showAllEvidence ? evidence.length : EVIDENCE_VISIBLE);
  const hiddenCount = evidence.length - visibleEvidence.length;

  return (
    <DocCard>
      <VerdictHeader
        kicker="ROOT CAUSE · VERIFIED"
        headline={headline}
        confidencePct={confidencePct}
        citations={citations}
        duration={duration}
        onJump={handleJump}
      />

      <section className="mt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          What happened
        </h2>
        <div className="mt-2">
          <ReportView markdown={report.report_md} />
        </div>
      </section>

      {evidence.length ? (
        <section id="evidence-section" className="mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Evidence
          </h2>
          <div className="mt-2 space-y-2">
            {visibleEvidence.map((item, i) => (
              <EvidenceQuote key={i} id={`ev-${i}`} source={evidenceSource(item)} lines={item} />
            ))}
          </div>
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllEvidence(true)}
              className="mt-2 text-[12px] font-medium text-beacon-dim"
            >
              + {hiddenCount} more
            </button>
          ) : null}
        </section>
      ) : null}

      {report.hypotheses && report.hypotheses.length ? (
        <section className="mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Hypotheses checked
          </h2>
          <div className="mt-2 space-y-2">
            {report.hypotheses.map((hypothesis) => {
              const verdict = report.verdicts?.find((v) => v.hypothesis_id === hypothesis.id);
              const checks = [
                ...(hypothesis.evidence_to_confirm ?? []).map((text) => ({
                  pass: true,
                  text,
                })),
                ...(hypothesis.evidence_to_refute ?? []).map((text) => ({
                  pass: false,
                  text,
                })),
              ];
              return (
                <HypothesisRow
                  key={hypothesis.id}
                  statement={hypothesis.statement}
                  confirmed={verdict?.verdict === "accept"}
                  confidencePct={
                    verdict ? Math.round(scaleConfidence(verdict.confidence)) : undefined
                  }
                  checks={checks}
                  reason={verdict?.reasoning}
                  onJump={handleJump}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <RunFooter
        toolCalls={`${report.tool_calls_used} / 15`}
        tokens={`${(report.tokens_used / 1000).toFixed(1)}k / 60k`}
        elapsed={duration}
      />
    </DocCard>
  );
}

function InvestigatingBody({ report }: { report: Report | null }) {
  return (
    <DocCard>
      <VerdictHeader
        kicker="INVESTIGATING"
        headline="Beacon is investigating this incident."
        onJump={() => {}}
      />
      <p className="mt-4 font-mono text-[12px] text-zinc-500">
        {report?.tool_calls_used ?? 0} tool calls used
      </p>
    </DocCard>
  );
}

function FailedBody({ report }: { report: Report | null }) {
  const headline =
    (report?.report_md ? firstMarkdownLine(report.report_md) : null) ||
    "This triage run did not finish.";
  return (
    <DocCard>
      <VerdictHeader kicker="RUN FAILED" headline={headline} onJump={() => {}} />
      <p className="mt-4 text-[12.5px] text-zinc-500">
        Use Re-run above to trigger a new triage attempt.
      </p>
    </DocCard>
  );
}

function PendingReportBody() {
  return (
    <DocCard>
      <p className="text-[12.5px] text-zinc-500">Report is being finalized.</p>
    </DocCard>
  );
}

function MetaStrip({
  incident,
  onCopy,
  onRerun,
  rerunning,
}: {
  incident: IncidentDetail;
  onCopy: () => void;
  onRerun: () => void;
  rerunning: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 pb-4 text-[12px] text-zinc-500">
      <Link href="/incidents" className="hover:text-ink">
        ← Incidents
      </Link>
      <StatusChip status={incident.status} />
      <span className="font-medium text-ink">{incident.project_name ?? "Unknown project"}</span>
      <span className="font-mono">
        {incident.id.slice(0, 8)} · {incident.trigger} · {formatDate(incident.created_at)}
      </span>
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onCopy}
          disabled={!incident.report}
          className="font-medium text-zinc-500 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Copy markdown
        </button>
        <button
          type="button"
          onClick={onRerun}
          disabled={rerunning}
          className="font-medium text-beacon-dim hover:text-beacon disabled:cursor-not-allowed disabled:opacity-60"
        >
          {rerunning ? "Starting…" : "Re-run"}
        </button>
      </div>
    </div>
  );
}

export default function IncidentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const token = useBackendToken();
  const [rerunning, setRerunning] = useState(false);
  // Poll until we know the status; the effect below turns polling off once a
  // terminal state (done/failed) is observed, so we never poll forever.
  const [pollMs, setPollMs] = useState<number | undefined>(POLL_MS);

  const { data: incident, error, loading } = useApi<IncidentDetail>(
    params?.id ? `/incidents/${params.id}` : null,
    { pollMs },
  );

  const isActive = incident?.status === "queued" || incident?.status === "running";

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  useEffect(() => {
    if (!incident) return;
    setPollMs(isActive ? POLL_MS : undefined);
  }, [incident, isActive]);

  const copyMarkdown = useCallback(async () => {
    if (!incident?.report) return;
    try {
      await navigator.clipboard.writeText(incident.report.report_md);
      toast("Copied", "success");
    } catch {
      toast("Could not copy", "error");
    }
  }, [incident, toast]);

  const rerun = useCallback(async () => {
    if (!incident) return;
    setRerunning(true);
    try {
      const created = await apiFetch<{ id: string }>(
        `/projects/${incident.project_id}/incidents`,
        token,
        { method: "POST", body: JSON.stringify({ trigger: "manual" }) },
      );
      toast("Triage started", "success");
      router.push(`/incidents/${created.id}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed to start re-run", "error");
      setRerunning(false);
    }
  }, [incident, token, toast, router]);

  if (loading && !incident) {
    return (
      <div className="mx-auto max-w-[760px]">
        <DocCard>
          <ReportSkeleton />
        </DocCard>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="mx-auto max-w-[760px]">
        <DocCard>
          <p className="text-sm text-zinc-600">
            Incident not found.{" "}
            <Link href="/incidents" className="text-beacon-dim underline">
              Back to incidents
            </Link>
          </p>
        </DocCard>
      </div>
    );
  }

  const status: IncidentStatus = incident.status;

  return (
    <div className="mx-auto max-w-[760px] space-y-4">
      <MetaStrip incident={incident} onCopy={copyMarkdown} onRerun={rerun} rerunning={rerunning} />

      {status === "done" && incident.report ? (
        <DoneBody incident={incident} report={incident.report} />
      ) : null}
      {status === "done" && !incident.report ? <PendingReportBody /> : null}
      {isActive ? <InvestigatingBody report={incident.report} /> : null}
      {status === "failed" ? <FailedBody report={incident.report} /> : null}
    </div>
  );
}
