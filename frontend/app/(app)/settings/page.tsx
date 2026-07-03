"use client";

import { useEffect, useState } from "react";

import { CardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import { primaryButton } from "@/lib/format";
import type { UserProfile } from "@/lib/types";
import { useApi, useBackendToken } from "@/lib/useApi";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-edge bg-surface-raised p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-800">{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const token = useBackendToken();
  const { data: me, error, loading, refresh } = useApi<UserProfile>("/me");

  const [name, setName] = useState("");
  const [delivery, setDelivery] = useState<"in_app" | "email">("in_app");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    setName(me.name);
    setDelivery(me.preferences?.delivery ?? "in_app");
  }, [me]);

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/me", token, {
        method: "PATCH",
        body: JSON.stringify({ name, preferences: { delivery } }),
      });
      toast("Settings saved", "success");
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !me) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!me) return null;

  const isDevAccount = me.github_login.startsWith("dev:");

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-500">Account-level profile and defaults</p>
      </div>

      <form onSubmit={save} className="space-y-5">
        <SectionCard title="Profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 rounded-md border border-edge bg-white px-3 text-sm text-zinc-800 outline-none focus:border-beacon"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              {isDevAccount ? "Account (dev sign-in)" : "GitHub account"}
              <input
                readOnly
                value={isDevAccount ? me.github_login.slice(4) : me.github_login}
                className="h-9 cursor-default rounded-md border border-edge bg-surface px-3 font-mono text-sm text-zinc-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2">
              Email
              <input
                readOnly
                value={me.email}
                className="h-9 cursor-default rounded-md border border-edge bg-surface px-3 text-sm text-zinc-500"
              />
              <span className="text-[11px] text-zinc-400">
                Synced from your sign-in provider; reports are delivered here.
              </span>
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Default report delivery">
          <p className="mb-3 text-sm text-zinc-500">
            Applied to newly created projects. Each project can override it in its own settings.
          </p>
          <div className="flex flex-col gap-2 text-sm text-zinc-700">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="default-delivery"
                checked={delivery === "in_app"}
                onChange={() => setDelivery("in_app")}
                className="accent-zinc-900"
              />
              View in app only
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="default-delivery"
                checked={delivery === "email"}
                onChange={() => setDelivery("email")}
                className="accent-zinc-900"
              />
              Also email me reports when triage completes
            </label>
          </div>
        </SectionCard>

        <button type="submit" disabled={saving} className={`px-5 py-2 ${primaryButton}`}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>

      <section className="rounded-lg border border-red-200 bg-red-50/50 p-5">
        <h2 className="mb-2 text-sm font-semibold text-red-800">Danger zone</h2>
        <p className="mb-4 text-sm text-red-700/80">
          Deleting your account removes all projects, incidents, reports, and API keys. This is
          not yet self-serve.
        </p>
        <button
          type="button"
          onClick={() =>
            toast("Account deletion isn't self-serve yet — contact the maintainer.", "info")
          }
          className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-700 transition-colors hover:border-red-500"
        >
          Delete account
        </button>
      </section>
    </div>
  );
}
