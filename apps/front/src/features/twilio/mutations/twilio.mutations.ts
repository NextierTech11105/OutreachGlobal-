import type {
  DeleteTwilioPhoneMutation,
  DeleteTwilioPhoneMutationVariables,
  PurchaseTwilioPhoneMutation,
  PurchaseTwilioPhoneMutationVariables,
  TestTwilioSendSmsMutation,
  TestTwilioSendSmsMutationVariables,
  UpdateTwilioSettingsMutation,
  UpdateTwilioSettingsMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const UPDATE_TWILIO_SETTINGS_MUTATION: TypedDocumentNode<
  UpdateTwilioSettingsMutation,
  UpdateTwilioSettingsMutationVariables
> = gql`
  mutation UpdateTwilioSettings($teamId: ID!, $input: TwilioSettingsInput!) {
    updateTwilioSettings(teamId: $teamId, input: $input) {
      settings {
        twilioAccountSid
        twilioAuthToken
        twilioApiKey
        twilioApiSecret
        twilioDefaultPhoneNumber
        twiMLAppSid
        twilioEnableVoiceCalls
        twilioEnableRecordCalls
        twilioTranscribeVoicemail
        twilioCallTimeout
        twilioDefaultVoiceMessage
        twilioEnableSms
      }
    }
  }
`;

export const TEST_TWILIO_SEND_SMS_MUTATION: TypedDocumentNode<
  TestTwilioSendSmsMutation,
  TestTwilioSendSmsMutationVariables
> = gql`
  mutation TestTwilioSendSms($teamId: ID!) {
    testTwilioSendSms(teamId: $teamId)
  }
`;

export const PURCHASE_TWILIO_PHONE_MUTATION: TypedDocumentNode<
  PurchaseTwilioPhoneMutation,
  PurchaseTwilioPhoneMutationVariables
> = gql`
  mutation PurchaseTwilioPhone(
    $teamId: ID!
    $areaCode: String!
    $friendlyName: String!
  ) {
    purchaseTwilioPhone(
      teamId: $teamId
      areaCode: $areaCode
      friendlyName: $friendlyName
    ) {
      phone {
        sid
        phoneNumber
        capabilities {
          voice
          sms
          mms
        }
        friendlyName
        status
      }
    }
  }
`;

export const DELETE_TWILIO_PHONE_MUTATION: TypedDocumentNode<
  DeleteTwilioPhoneMutation,
  DeleteTwilioPhoneMutationVariables
> = gql`
  mutation DeleteTwilioPhone($teamId: ID!, $sid: ID!) {
    deleteTwilioPhone(teamId: $teamId, sid: $sid) {
      deletedSid
    }
  }
`;
