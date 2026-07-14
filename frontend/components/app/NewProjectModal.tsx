"use client";

import { useEffect, useMemo, useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";
import type { Project } from "@/lib/types";
import { useBackendToken } from "@/lib/useApi";

type RepoOption = {
  full_name: string;
  private: boolean;
  description: string | null;
  pushed_at: string | null;
};

/** New project = connect one of your GitHub repositories. The picker lists the
 *  signed-in user's repos (fetched server-side; the GitHub token never reaches
 *  the browser). Dev sign-in has no GitHub token, so it falls back to typing
 *  the repo by hand; a manual toggle is always available. */
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

  const [repos, setRepos] = useState<RepoOption[] | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReposLoading(true);
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((data: { repos: RepoOption[] | null }) => {
        if (cancelled) return;
        setRepos(data.repos);
        if (data.repos === null) setManual(true); // no GitHub token: type it
      })
      .catch(() => {
        if (cancelled) return;
        setRepos(null);
        setManual(true);
      })
      .finally(() => {
        if (!cancelled) setReposLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!repos) return [];
    const q = query.trim().toLowerCase();
    const list = q ? repos.filter((r) => r.full_name.toLowerCase().includes(q)) : repos;
    return list.slice(0, 30);
  }, [repos, query]);

  if (!open) return null;

  function pickRepo(fullName: string) {
    setRepo(fullName);
    // sensible default: project named after the repo, still editable
    if (!name.trim()) setName(fullName.split("/")[1] ?? fullName);
  }

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
      setQuery("");
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
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
          Connect a GitHub repository. Beacon triages its failed deploys and comments the
          report on the failing pull request.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          {/* ------------------------------------------------ repo picker */}
          {!manual ? (
            <div className="flex flex-col gap-1 text-xs text-zinc-500">
              Repository
              {reposLoading ? (
                <div className="flex h-24 items-center justify-center rounded-lg border border-edge text-[13px] text-zinc-400">
                  Loading your repositories…
                </div>
              ) : (
                <>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-9 rounded-lg border border-edge px-3 text-sm text-zinc-800 outline-none focus:border-beacon"
                    placeholder="Search repositories"
                  />
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-edge">
                    {filtered.length === 0 ? (
                      <p className="px-3 py-4 text-center text-[13px] text-zinc-400">
                        No repositories matched
                      </p>
                    ) : (
                      filtered.map((r) => (
                        <button
                          key={r.full_name}
                          type="button"
                          onClick={() => pickRepo(r.full_name)}
                          className={`flex w-full items-baseline gap-2 border-b border-edge px-3 py-2 text-left last:border-b-0 hover:bg-surface ${
                            repo === r.full_name ? "bg-beacon/10" : ""
                          }`}
                        >
                          <span className="truncate font-mono text-[13px] text-zinc-800">
                            {r.full_name}
                          </span>
                          {repo === r.full_name && (
                            <span className="ml-auto shrink-0 text-[11px] font-semibold text-beacon">
                              selected
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => setManual(true)}
                className="self-start text-[12px] text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline"
              >
                or type it manually
              </button>
            </div>
          ) : (
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Repo (owner/name)
              <input
                value={repo}
                onChange={(event) => setRepo(event.target.value)}
                className="h-10 rounded-lg border border-edge px-3 text-sm text-zinc-800 outline-none focus:border-beacon"
                placeholder="owner/repo"
              />
              {repos !== null && (
                <button
                  type="button"
                  onClick={() => setManual(false)}
                  className="self-start text-[12px] text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline"
                >
                  back to my repositories
                </button>
              )}
            </label>
          )}

          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Project name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 rounded-lg border border-edge px-3 text-sm text-zinc-800 outline-none focus:border-beacon"
              placeholder="checkout-api"
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
