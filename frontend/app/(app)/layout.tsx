"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/Sidebar";
import { CardSkeleton } from "@/components/Skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  // Owned here so the main pane's left padding tracks the sidebar width and the
  // content recentres when it collapses (no dead gap on the left).
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <>
      <Sidebar expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      <main
        className={`pl-14 transition-[padding] duration-[250ms] ease-in-out ${
          expanded ? "md:pl-60" : "md:pl-[72px]"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">{children}</div>
      </main>
    </>
  );
}
