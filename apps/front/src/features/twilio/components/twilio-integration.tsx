"use client";

import { useQuery } from "@apollo/client";
import { useCurrentTeam } from "@/features/team/team.context";
import { TWILIO_SETTINGS_QUERY } from "../queries/twilio.queries";
import { TwilioIntegrationContent } from "./twilio-integration-content";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import { Card, CardContent } from "@/components/ui/card";

/**
 * TwilioIntegration - Wrapper component that fetches settings and renders the form
 * This connects to GraphQL and properly persists Twilio configuration
 */
export function TwilioIntegration() {
  const { teamId, isTeamReady } = useCurrentTeam();

  const { data, loading, error } = useQuery(TWILIO_SETTINGS_QUERY, {
    variables: { teamId },
    skip: !isTeamReady,
  });

  if (!isTeamReady) {
    return null;
  }

  if (loading) {
    return (
      <Card className="relative min-h-[400px]">
        <LoadingOverlay />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">
            Failed to load Twilio settings: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TwilioIntegrationContent
      defaultValues={data?.twilioSettings || undefined}
    />
  );
}
