"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/home", icon: <Icon path="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" /> },
  {
    label: "Projects",
    href: "/projects",
    icon: <Icon path="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  },
  {
    label: "Incidents",
    href: "/incidents",
    icon: <Icon path="M12 3 2 21h20L12 3Zm0 7v5m0 3v.5" />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <Icon path="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5-3a7.5 7.5 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.5 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 2 1.2l.5 2.6h5l.5-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.06-.4.1-.8.1-1.2Z" />
    ),
  },
  {
    label: "Install",
    href: "/install",
    icon: <Icon path="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-14 flex-col border-r border-edge bg-surface-raised md:w-56">
      <Link
        href="/home"
        className="flex h-14 items-center gap-2.5 border-b border-edge px-4"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-beacon/15 text-beacon">
          ⌁
        </span>
        <span className="hidden text-sm font-semibold tracking-wide text-zinc-900 md:inline">
          Beacon
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors ${
                active
                  ? "bg-surface-overlay font-medium text-zinc-900"
                  : "text-zinc-500 hover:bg-surface-overlay hover:text-zinc-900"
              }`}
            >
              <span className={active ? "text-beacon-dim" : ""}>{item.icon}</span>
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-edge p-3">
        <div className="hidden truncate px-1 pb-2 text-xs text-zinc-400 md:block">
          {session?.user?.email}
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full rounded-md border border-edge bg-white px-2 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900"
        >
          <span className="hidden md:inline">Sign out</span>
          <span className="md:hidden">⎋</span>
        </button>
      </div>
    </aside>
  );
}
