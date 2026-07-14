"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, FolderGit2, Home, LogOut, Settings, TriangleAlert, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/incidents", label: "Incidents", icon: TriangleAlert },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/install", label: "Install", icon: Download },
];

function isActive(pathname: string | null, href: string) {
  return href === "/home" ? pathname === href : pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
}

export function Sidebar({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  return (
    <motion.aside
      initial={false}
      animate={{ width: expanded ? 240 : 72 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-edge bg-white"
    >
      <div className={`flex items-center gap-2.5 px-3 pb-3 pt-5 ${expanded ? "" : "justify-center"}`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-beacon">⌁</span>
        {expanded ? <span className="text-base font-semibold tracking-tight text-zinc-900">Beacon</span> : null}
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${expanded ? "" : "justify-center"} ${
                active ? "bg-beacon text-white" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2 : 1.5} />
              {expanded ? <span className={`text-[13px] ${active ? "font-medium" : ""}`}>{label}</span> : null}
              {!expanded ? <Tooltip label={label} /> : null}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 ${expanded ? "" : "justify-center"}`}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? <ChevronLeft className="h-5 w-5" strokeWidth={1.5} /> : <ChevronRight className="h-5 w-5" strokeWidth={1.5} />}
          {expanded ? <span className="text-[13px]">Collapse</span> : null}
        </button>
      </div>
      <div className="border-t border-edge px-3 py-3">
        {expanded ? <div className="truncate px-1 pb-2 text-xs text-zinc-400">{session?.user?.email}</div> : null}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 ${expanded ? "" : "justify-center"}`}
        >
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.5} />
          {expanded ? <span className="text-[13px] font-medium">Sign out</span> : null}
          {!expanded ? <Tooltip label="Sign out" /> : null}
        </button>
      </div>
    </motion.aside>
  );
}

function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      {label}
    </span>
  );
}
