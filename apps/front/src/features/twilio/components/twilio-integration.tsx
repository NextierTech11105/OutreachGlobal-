"use client";

import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import { TwilioIntegrationContent } from "./twilio-integration-content";
import { TWILIO_SETTINGS_QUERY } from "../queries/twilio.queries";
import { useCurrentTeam } from "@/features/team/team.context";
import { Loading } from "@/components/ui/loading";

export function TwilioIntegration() {
  const { teamId, isTeamReady } = useCurrentTeam();
  const [settings, { loading }] = useSingleQuery(TWILIO_SETTINGS_QUERY, {
    pick: "twilioSettings",
    variables: { teamId },
    skip: !isTeamReady,
  });

  if (!isTeamReady) return null;

  if (!settings) {
    return loading ? (
      <Loading />
    ) : (
      <div>
        <p>Something went wrong</p>
      </div>
    );
  }

  return (
    <TwilioIntegrationContent
      defaultValues={{
        twilioAccountSid: settings.twilioAccountSid,
        twilioAuthToken: settings.twilioAuthToken,
        twilioApiKey: settings.twilioApiKey,
        twilioApiSecret: settings.twilioApiSecret,
        twilioDefaultPhoneNumber: settings.twilioDefaultPhoneNumber,
        twiMLAppSid: settings.twiMLAppSid,
        twilioEnableVoiceCalls: settings.twilioEnableVoiceCalls ?? true,
        twilioEnableRecordCalls: settings.twilioEnableRecordCalls ?? true,
        twilioTranscribeVoicemail: settings.twilioTranscribeVoicemail ?? true,
        twilioCallTimeout: settings.twilioCallTimeout ?? 30,
        twilioDefaultVoiceMessage: settings.twilioDefaultVoiceMessage,
        twilioEnableSms: settings.twilioEnableSms ?? true,
      }}
    />
  );
}
