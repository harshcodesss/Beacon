"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { href: "#story", label: "How it works" },
  { href: "#install", label: "Install" },
  { href: "#agents", label: "Agents" },
  { href: "#workflow", label: "Workflow" },
  { href: "https://github.com/harshcodesss/Beacon", label: "GitHub", external: true },
];

export function LandingNav({ onSignIn }: { onSignIn: () => void }) {
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    // Stay transparent over the orange hero; dock into a compact pill as the
    // white story section scrolls into view.
    const onScroll = () => setDocked(window.scrollY > window.innerHeight * 0.72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={`flex w-full items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          docked
            ? "h-14 max-w-3xl rounded-2xl border border-edge bg-white/85 pl-4 pr-2 shadow-md backdrop-blur"
            : "h-16 max-w-6xl rounded-2xl border border-transparent bg-transparent px-2"
        }`}
        aria-label="Landing"
      >
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-semibold text-beacon shadow-[0_6px_16px_-4px_rgba(0,0,0,0.4)]">
            ⌁
          </span>
          <span
            className={`text-base font-semibold tracking-tight transition-colors duration-500 ${
              docked ? "text-zinc-900" : "text-ink"
            }`}
          >
            Beacon
          </span>
        </a>
        <div className="hidden items-center gap-7 sm:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
              className={`text-sm font-medium transition-colors duration-500 ${
                docked ? "text-zinc-500 hover:text-zinc-900" : "text-ink/70 hover:text-ink"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
        <button
          type="button"
          onClick={onSignIn}
          className="h-9 rounded-md bg-ink px-4 text-sm font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Sign in
        </button>
      </nav>
    </header>
  );
}
