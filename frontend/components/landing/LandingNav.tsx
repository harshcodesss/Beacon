"use client";

import { useEffect, useState } from "react";

import { primaryButton } from "@/lib/format";

const LINKS = [
  { href: "#story", label: "How it works" },
  { href: "#install", label: "Install" },
  { href: "https://github.com/harshcodesss/Beacon", label: "GitHub", external: true },
];

export function LandingNav({ onSignIn }: { onSignIn: () => void }) {
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    const onScroll = () => setDocked(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={`flex w-full max-w-3xl items-center justify-between rounded-full border border-edge bg-white/85 pl-4 pr-1.5 backdrop-blur transition-all duration-300 ${
          docked ? "h-11 shadow-md" : "h-[52px] shadow-sm"
        }`}
        aria-label="Landing"
      >
        <a href="#top" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-beacon/15 text-sm text-beacon">
            ⌁
          </span>
          <span className="text-sm font-semibold tracking-wide text-zinc-900">Beacon</span>
        </a>
        <div className="hidden items-center gap-6 sm:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
              className="text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
            >
              {link.label}
            </a>
          ))}
        </div>
        <button
          type="button"
          onClick={onSignIn}
          className={`h-8 rounded-full px-4 ${primaryButton}`}
        >
          Sign in
        </button>
      </nav>
    </header>
  );
}
