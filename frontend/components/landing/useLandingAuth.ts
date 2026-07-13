"use client";

import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

export interface LandingAuth {
  /** null while the provider list is loading. */
  github: boolean | null;
  dev: boolean;
  /** All landing CTAs route to the login page, where the 30-day choice lives. */
  signInPrimary: () => void;
  signInDev: (email: string) => void;
}

export function useLandingAuth(): LandingAuth {
  const [providers, setProviders] = useState<Record<string, { id: string }> | null>(null);

  useEffect(() => {
    getProviders().then((p) => setProviders(p as Record<string, { id: string }> | null));
  }, []);

  const github = providers === null ? null : Boolean(providers.github);
  const dev = Boolean(providers?.dev);

  return {
    github,
    dev,
    signInPrimary: () => {
      window.location.assign("/login");
    },
    // The hero's quick dev form has no checkbox: session-length sign-in.
    signInDev: (email: string) =>
      signIn("dev", { email, remember: "0", callbackUrl: "/home" }),
  };
}
