"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

import { NewProjectTile } from "@/components/app/NewProjectTile";
import { ProjectHealthPanel } from "@/components/app/ProjectHealthPanel";
import { RecentIncidents } from "@/components/app/RecentIncidents";
import { StatRow } from "@/components/app/StatRow";
import { useApi } from "@/lib/useApi";
import type { ProjectHealth } from "@/lib/types";

export default function HomePage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const { data: projects } = useApi<ProjectHealth[]>("/projects");

  // First-run: no projects yet. Point at Install.
  if (projects && projects.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-edge bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">Welcome to Beacon</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Create your first project and Beacon starts reporting on failures as they happen.
        </p>
        <Link
          href="/install"
          className="mt-6 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black"
        >
          Set up a project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <header className="mb-2 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#ff8f2b] to-[#ee6d00] text-xl text-white shadow-md">
          ⌁
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
            Welcome back, {firstName}
          </h1>
          <p className="text-[12.5px] text-zinc-500">
            Every break in production, already being worked.
          </p>
        </div>
      </header>
      <StatRow />
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjectHealthPanel />
        </div>
        <NewProjectTile />
      </div>
      <RecentIncidents />
    </div>
  );
}
