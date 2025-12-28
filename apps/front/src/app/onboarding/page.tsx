"use client";

import { useRouter } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

/**
 * ONBOARDING PAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 * "Build Your Machine" wizard for new users
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export default function OnboardingPage() {
  const router = useRouter();

  const handleComplete = () => {
    router.push("/dashboard?onboarding=complete");
  };

  const handleSkip = () => {
    router.push("/dashboard?onboarding=skipped");
  };

  return <OnboardingWizard onComplete={handleComplete} onSkip={handleSkip} />;
}
