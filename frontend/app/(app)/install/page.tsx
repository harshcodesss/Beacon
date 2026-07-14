"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { InstallSteps } from "@/components/app/InstallSteps";
import { useToast } from "@/components/Toast";
import { apiFetch, ApiError } from "@/lib/api";
import type { ProjectHealth } from "@/lib/types";
import { useApi, useBackendToken } from "@/lib/useApi";

export default function InstallPage() {
  const toast = useToast();
  const router = useRouter();
  const token = useBackendToken();
  const { data: projects } = useApi<ProjectHealth[]>("/projects");
  const project = projects?.[0] ?? null;
  const [triggering, setTriggering] = useState(false);

  async function triggerTestIncident() {
    if (!project) return;
    setTriggering(true);
    try {
      const created = await apiFetch<{ id: string }>(`/projects/${project.id}/incidents`, token, {
        method: "POST",
        body: JSON.stringify({ trigger: "manual" }),
      });
      toast("Test incident triggered", "success");
      router.push(`/incidents/${created.id}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed to trigger incident", "error");
      setTriggering(false);
    }
  }

  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Install</h1>
        <p className="text-sm text-zinc-500">
          From zero to your first report in three steps.
        </p>
      </div>

      <InstallSteps />

      <div className="rounded-2xl border border-beacon-tint bg-[#fffdfa] p-5">
        <h2 className="text-[12.5px] font-semibold text-zinc-800">Verify it works</h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          Fires a synthetic failure through the whole pipeline and links the resulting report.
        </p>
        <button
          type="button"
          onClick={triggerTestIncident}
          disabled={!project || triggering}
          className="mt-3 rounded-lg bg-beacon px-4 py-2 text-[12.5px] font-semibold text-black transition-colors hover:bg-beacon-dim hover:text-white disabled:opacity-50"
        >
          {triggering ? "Triggering…" : "⚡ Trigger a test incident"}
        </button>
      </div>
    </div>
  );
}
