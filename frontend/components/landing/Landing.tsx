"use client";

import { BeatInvestigate } from "@/components/landing/BeatInvestigate";
import { BeatNoise } from "@/components/landing/BeatNoise";
import { BeatProof } from "@/components/landing/BeatProof";
import { Hero } from "@/components/landing/Hero";
import { HowItRuns } from "@/components/landing/HowItRuns";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { useLandingAuth } from "@/components/landing/useLandingAuth";

export function Landing() {
  const auth = useLandingAuth();

  return (
    <div className="bg-surface">
      <LandingNav onSignIn={auth.signInPrimary} />
      <main>
        <Hero auth={auth} />
        <BeatNoise />
        <BeatInvestigate />
        <BeatProof />
        <HowItRuns />
      </main>
      <LandingFooter />
    </div>
  );
}
