"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { Sidebar } from "@/components/Sidebar";
import { CardSkeleton } from "@/components/Skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

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
      <Sidebar />
      <main className="pl-14 md:pl-56">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">{children}</div>
      </main>
    </>
  );
}
