"use client";

/* Closing call to action: an orange vortex panel with black ink particles
 * drifting through it. One primary action (sign in), one quiet escape hatch
 * (the repo). */

import { Vortex } from "@/components/ui/vortex";

export function LandingCTA({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section className="border-t border-edge bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="h-[26rem] overflow-hidden rounded-2xl">
          <Vortex
            backgroundColor="#ff7f11"
            rangeY={220}
            baseRadius={0.8}
            rangeRadius={1.4}
            className="flex h-full w-full flex-col items-center justify-center px-6 py-10 text-center md:px-10"
          >
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              The next failed deploy triages itself.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/90 md:text-lg">
              Sign in, point Beacon at a repo, and the next red deploy arrives with hypotheses
              tested, citations verified, and a report waiting.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={onSignIn}
                className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-[0px_2px_0px_0px_#FFFFFF40_inset] transition-colors duration-200 hover:bg-zinc-800"
              >
                Sign in with GitHub
              </button>
              <a
                href="https://github.com/harshcodesss/Beacon"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
              >
                View on GitHub →
              </a>
            </div>
          </Vortex>
        </div>
      </div>
    </section>
  );
}
