"use client";

import { useCurrentTeam } from "@/features/team/team.context";
import { SendgridIntegrationContent } from "./sendgrid-integration-content";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import { SENDGRID_SETTINGS_QUERY } from "../queries/sendgrid.queries";
import { Loading } from "@/components/ui/loading";

export const SendgridIntegration = () => {
  const { team } = useCurrentTeam();
  const [settings, { loading }] = useSingleQuery(SENDGRID_SETTINGS_QUERY, {
    pick: "sendgridSettings",
    variables: { teamId: team.id },
  });

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
    <SendgridIntegrationContent
      defaultValues={{
        ...settings,
        sendgridEventTypes: settings.sendgridEventTypes || [],
        sendgridDailyLimit: settings.sendgridDailyLimit || 0,
        sendgridBatchSize: settings.sendgridBatchSize || 0,
        sendgridIpPool: settings.sendgridIpPool || "",
        sendgridEmailCategory: settings.sendgridEmailCategory || "",
        sendgridDefaultFooter: settings.sendgridDefaultFooter || "",
        sendgridEnableClickTracking:
          settings.sendgridEnableClickTracking || false,
        sendgridEnableOpenTracking:
          settings.sendgridEnableOpenTracking || false,
        sendgridEnableSubscriptionTracking:
          settings.sendgridEnableSubscriptionTracking || false,
      }}
    />
  );
};
