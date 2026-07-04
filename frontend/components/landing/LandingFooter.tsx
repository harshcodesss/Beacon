"use client";

import { useEffect, useState } from "react";

import { apiUrl } from "@/lib/api";

type HealthState =
  | { kind: "loading" }
  | { kind: "ok"; agentCore: string }
  | { kind: "unavailable" };

function StatusPill() {
  const [health, setHealth] = useState<HealthState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiUrl()}/healthz`, { cache: "no-store" })
      .then((resp) => (resp.ok ? resp.json() : Promise.reject(new Error("bad status"))))
      .then((body: { status?: string; agent_core?: string }) => {
        if (cancelled) return;
        if (body.status === "ok") {
          setHealth({ kind: "ok", agentCore: body.agent_core ?? "unknown" });
        } else {
          setHealth({ kind: "unavailable" });
        }
      })
      .catch(() => {
        if (!cancelled) setHealth({ kind: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-edge bg-white px-3 py-1.5 font-mono text-[11px] text-zinc-600">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          health.kind === "ok"
            ? "bg-emerald-500"
            : health.kind === "loading"
              ? "animate-pulse bg-zinc-300"
              : "bg-zinc-400"
        }`}
        aria-hidden
      />
      {health.kind === "ok"
        ? `All systems operational · agent core: ${health.agentCore}`
        : health.kind === "loading"
          ? "Checking status…"
          : "Status unavailable"}
    </span>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-edge bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-10 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-beacon/15 text-sm text-beacon">
            ⌁
          </span>
          <span className="text-sm font-semibold text-zinc-900">Beacon</span>
          <span className="text-sm text-zinc-400">·</span>
          <a
            href="https://github.com/harshcodesss"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
          >
            Built by Harsh Rathi
          </a>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/harshcodesss/Beacon"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
          >
            GitHub
          </a>
          <StatusPill />
        </div>
      </div>
    </footer>
  );
}
