"use client";

import { redirect } from "next/navigation";
import { useTeamSlug } from "@/hooks/use-team-slug";
import { useEffect } from "react";

/**
 * Admin Campaign Builder Route
 * Redirects to the team-based campaign builder
 */
export default function AdminCampaignBuilderPage() {
  const teamSlug = useTeamSlug();

  useEffect(() => {
    if (teamSlug) {
      window.location.href = `/t/${teamSlug}/campaign-builder`;
    }
  }, [teamSlug]);

  // Fallback redirect for default team
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-lg">Loading Campaign Builder...</div>
    </div>
  );
}
