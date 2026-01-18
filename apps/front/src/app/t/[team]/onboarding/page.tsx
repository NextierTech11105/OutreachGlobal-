"use client";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useParams, useRouter } from "next/navigation";

export default function OnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const teamParam = params?.team;
  const teamId = Array.isArray(teamParam)
    ? (teamParam[0] ?? "")
    : ((teamParam as string) ?? "");

  if (!teamId) {
    return null;
  }

  const handleComplete = () => {
    // Redirect to success page after onboarding completes
    router.push(`/t/${teamId}/success`);
  };

  return <OnboardingWizard teamId={teamId} onComplete={handleComplete} />;
}
