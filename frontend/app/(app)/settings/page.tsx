"use client";

import { useEffect, useState } from "react";

import { SessionList } from "@/components/app/SessionList";
import { CardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import { primaryButton } from "@/lib/format";
import type { UserProfile } from "@/lib/types";
import { useApi, useBackendToken } from "@/lib/useApi";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-beacon" : "bg-zinc-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const token = useBackendToken();
  const { data: me, error, loading, refresh } = useApi<UserProfile>("/me");

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [failuresOnly, setFailuresOnly] = useState(false);

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? "");
    setDelivery(me.preferences?.delivery === "email");
    setFailuresOnly(me.preferences?.failures_only === true);
  }, [me]);

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/me", token, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      toast("Saved", "success");
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDelivery(next: boolean) {
    const previous = delivery;
    setDelivery(next);
    try {
      await apiFetch("/me", token, {
        method: "PATCH",
        body: JSON.stringify({ preferences: { delivery: next ? "email" : "in_app" } }),
      });
    } catch (err) {
      setDelivery(previous);
      toast(err instanceof Error ? err.message : "Failed to save preference", "error");
    }
  }

  async function toggleFailuresOnly(next: boolean) {
    const previous = failuresOnly;
    setFailuresOnly(next);
    try {
      await apiFetch("/me", token, {
        method: "PATCH",
        body: JSON.stringify({ preferences: { failures_only: next } }),
      });
    } catch (err) {
      setFailuresOnly(previous);
      toast(err instanceof Error ? err.message : "Failed to save preference", "error");
    }
  }

  if (loading && !me) {
    return (
      <div className="mx-auto max-w-[640px] space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!me) return null;

  const initial = (me.name || me.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-500">Your account, your sessions, your inbox.</p>
      </div>

      <section className="rounded-2xl border border-edge bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-800">Profile</h2>
        <form onSubmit={saveProfile} className="mt-4 flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff8f2b] to-[#ee6d00] text-lg font-semibold text-white">
            {initial}
          </span>
          <div className="flex-1 space-y-3">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-lg border border-edge px-3 text-sm text-zinc-800 outline-none focus:border-beacon"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Email
              <input
                disabled
                value={me.email}
                className="h-10 rounded-lg border border-edge px-3 text-sm text-zinc-500"
              />
            </label>
            <button type="submit" disabled={saving} className={`px-4 py-2 text-sm ${primaryButton}`}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-edge bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-800">Report delivery</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-800">Email me each finished report</p>
              <p className="text-[11px] text-zinc-400">
                Applied to projects you create from now on.
              </p>
            </div>
            <Toggle checked={delivery} onChange={toggleDelivery} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-800">Only when the run fails</p>
              <p className="text-[11px] text-zinc-400">Skip the email when a run finishes clean.</p>
            </div>
            <Toggle checked={failuresOnly} onChange={toggleFailuresOnly} />
          </div>
        </div>
      </section>

      <SessionList />
    </div>
  );
}
