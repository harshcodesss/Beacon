"use client";

import { Monitor } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

import { CardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import { formatWhen, secondaryButton } from "@/lib/format";
import type { SessionRow } from "@/lib/types";
import { useApi, useBackendToken } from "@/lib/useApi";

export function SessionList() {
  const toast = useToast();
  const token = useBackendToken();
  const { data: sessions, error, loading, refresh } = useApi<SessionRow[]>("/auth/sessions");
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);

  async function revoke(id: string) {
    setRevokingId(id);
    try {
      await apiFetch(`/auth/sessions/${id}`, token, { method: "DELETE" });
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to revoke session", "error");
    } finally {
      setRevokingId(null);
    }
  }

  async function signOutEverywhere() {
    setSigningOutAll(true);
    try {
      await apiFetch("/auth/logout-all", token, { method: "POST" });
      signOut({ callbackUrl: "/login" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to sign out everywhere", "error");
      setSigningOutAll(false);
    }
  }

  return (
    <section className="rounded-2xl border border-edge bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-800">Active sessions</h2>
      <p className="text-xs text-zinc-500">Everywhere you are signed in.</p>

      {error && <p className="mt-3 text-xs text-danger-ink">{error}</p>}

      {loading && !sessions ? (
        <div className="mt-3">
          <CardSkeleton />
        </div>
      ) : (
        <div className="mt-2">
          {(sessions ?? []).map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 border-t border-zinc-100 py-2.5 first:border-t-0"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
                <Monitor className="h-4 w-4 text-zinc-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-800">
                  {row.current ? "This browser" : "Signed-in session"}
                </p>
                <p className="truncate font-mono text-[10.5px] text-zinc-400">
                  created {formatWhen(row.created_at)} ·{" "}
                  {row.remember ? "remembered 30 days" : "expires on idle"} · last used{" "}
                  {formatWhen(row.last_used_at)}
                </p>
              </div>
              {row.current ? (
                <span className="whitespace-nowrap text-[10.5px] font-semibold text-ok-ink">
                  ● current
                </span>
              ) : (
                <button
                  type="button"
                  disabled={revokingId === row.id}
                  onClick={() => revoke(row.id)}
                  className="whitespace-nowrap text-[11px] font-medium text-danger-ink transition-opacity hover:opacity-70 disabled:opacity-50"
                >
                  {revokingId === row.id ? "Revoking…" : "Revoke"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={signingOutAll}
        onClick={signOutEverywhere}
        className={`mt-4 h-9 px-4 text-sm ${secondaryButton}`}
      >
        {signingOutAll ? "Signing out…" : "Sign out everywhere"}
      </button>
    </section>
  );
}
