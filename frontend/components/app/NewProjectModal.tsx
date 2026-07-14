"use client";

import { useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";
import type { Project } from "@/lib/types";
import { useBackendToken } from "@/lib/useApi";

export function NewProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const token = useBackendToken();
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    setError(null);
    try {
      const created = await apiFetch<Project>("/projects", token, {
        method: "POST",
        body: JSON.stringify({ name, repo_full_name: repo }),
      });
      onCreated?.(created.id);
      onClose();
      setName("");
      setRepo("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">New project</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 rounded-lg border border-edge px-3 text-sm text-zinc-800 outline-none focus:border-beacon"
              placeholder="checkout-api"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Repo (owner/name)
            <input
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
              className="h-10 rounded-lg border border-edge px-3 text-sm text-zinc-800 outline-none focus:border-beacon"
              placeholder="org/repo"
            />
          </label>

          {error ? <p className="text-[13px] text-danger-ink">{error}</p> : null}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-edge bg-surface px-3.5 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Creating" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
