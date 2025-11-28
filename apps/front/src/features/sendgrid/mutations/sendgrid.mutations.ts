import type {
  TestSendgridSendEmailMutation,
  TestSendgridSendEmailMutationVariables,
  UpdateSendgridSettingsMutation,
  UpdateSendgridSettingsMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const UPDATE_SENDGRID_SETTINGS_MUTATION: TypedDocumentNode<
  UpdateSendgridSettingsMutation,
  UpdateSendgridSettingsMutationVariables
> = gql`
  mutation UpdateSendgridSettings(
    $teamId: ID!
    $input: SendgridSettingsInput!
  ) {
    updateSendgridSettings(teamId: $teamId, input: $input) {
      settings {
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
  }
`;

export const TEST_SENDGRID_SEND_EMAIL_MUTATION: TypedDocumentNode<
  TestSendgridSendEmailMutation,
  TestSendgridSendEmailMutationVariables
> = gql`
  mutation TestSendgridSendEmail($teamId: ID!, $email: String!) {
    testSendgridSendEmail(teamId: $teamId, email: $email)
  }
`;
