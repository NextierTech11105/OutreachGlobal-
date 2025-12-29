"use client";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useParams, useRouter } from "next/navigation";

export default function OnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.team as string;

  const handleComplete = () => {
    // Redirect to command center after onboarding completes
    router.push(`/t/${teamId}/command-center`);
  };

  return (
    <OnboardingWizard
      teamId={teamId}
      onComplete={handleComplete}
    />
  );
}
