"use client";

import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

export interface LandingAuth {
  /** null while the provider list is loading. */
  github: boolean | null;
  dev: boolean;
  /** Best available sign-in: GitHub when configured, dev demo otherwise. */
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
      if (providers?.github) signIn("github", { callbackUrl: "/home" });
      else if (providers?.dev) signIn("dev", { email: "demo@beacon.dev", callbackUrl: "/home" });
      else signIn(undefined, { callbackUrl: "/home" });
    },
    signInDev: (email: string) => signIn("dev", { email, callbackUrl: "/home" }),
  };
}
