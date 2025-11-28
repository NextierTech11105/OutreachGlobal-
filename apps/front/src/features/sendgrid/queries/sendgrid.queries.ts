import type {
  SendgridSettingsQuery,
  SendgridSettingsQueryVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const SENDGRID_SETTINGS_QUERY: TypedDocumentNode<
  SendgridSettingsQuery,
  SendgridSettingsQueryVariables
> = gql`
  query SendgridSettings($teamId: ID!) {
    sendgridSettings(teamId: $teamId) {
      teamId
      sendgridApiKey
      sendgridFromName
      sendgridFromEmail
      sendgridReplyToEmail
      sendgridEventTypes
      sendgridDailyLimit
      sendgridBatchSize
      sendgridIpPool
      sendgridEmailCategory
      sendgridEnableClickTracking
      sendgridEnableOpenTracking
      sendgridEnableSubscriptionTracking
      sendgridDefaultFooter
    }
  }
`;
