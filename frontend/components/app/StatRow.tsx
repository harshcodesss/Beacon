"use client";

import { StatTile, Histogram, SemiGauge, DualMeter } from "@/components/app/StatTile";
import type { ActivitySeries, StatsOverview } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const TOKEN_CAP = 60000;
const TOOLCALL_CAP = 15;

export function StatRow() {
  const { data: stats } = useApi<StatsOverview>("/stats/overview");
  const { data: activity } = useApi<ActivitySeries>("/stats/activity?days=14");
  const days = activity?.days ?? [];
  const last7 = days.slice(-7).map((d) => d.total);
  const prev7 = days.slice(-14, -7).map((d) => d.total);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const delta = sum(last7) - sum(prev7);
  const trendWord =
    delta > 0 ? "Increased from last week" : delta < 0 ? "Decreased from last week" : "No change from last week";
  const acc = stats?.accuracy;

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        variant="orange"
        href="/incidents"
        label="Triages · 7 days"
        value={sum(last7)}
        trend={`${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} · ${trendWord}`}
        graph={<Histogram data={last7.length ? last7 : [0]} light />}
      />
      <StatTile
        variant="ink"
        href="/incidents?status=done"
        label="Top-1 accuracy"
        value={acc ? `${Math.round(acc.top1_rate * 100)}%` : "··"}
        trend={acc ? `top-3 ${Math.round(acc.top3_rate * 100)}% · all verified runs` : "no verified runs yet"}
        graph={<SemiGauge pct={acc ? acc.top1_rate * 100 : 0} light />}
      />
      <StatTile
        variant="white"
        href="/settings"
        label="Avg tokens / run"
        value={stats?.avg_tokens ? `${(stats.avg_tokens / 1000).toFixed(1)}k` : "··"}
        trend={stats?.avg_tokens ? `${Math.round((stats.avg_tokens / TOKEN_CAP) * 100)}% of the 60k budget` : undefined}
        graph={<Histogram data={last7.length ? last7 : [0]} />}
      />
      <StatTile
        variant="white"
        href="/settings"
        label="Avg tool calls"
        value={stats?.avg_tool_calls ?? "··"}
        trend={stats?.avg_tool_calls ? `${Math.round((stats.avg_tool_calls / TOOLCALL_CAP) * 100)}% of 15 call cap` : undefined}
        graph={<DualMeter used={stats?.avg_tool_calls ?? 0} cap={TOOLCALL_CAP} />}
      />
    </div>
  );
}
