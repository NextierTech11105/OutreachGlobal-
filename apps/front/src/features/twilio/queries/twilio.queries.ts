import type {
  TwilioPhonesQuery,
  TwilioPhonesQueryVariables,
  TwilioSettingsQuery,
  TwilioSettingsQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const TWILIO_PHONES_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "twilioPhones",
};

export const TWILIO_SETTINGS_QUERY: TypedDocumentNode<
  TwilioSettingsQuery,
  TwilioSettingsQueryVariables
> = gql`
  query TwilioSettings($teamId: ID!) {
    twilioSettings(teamId: $teamId) {
      teamId
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
`;

export const TWILIO_PHONES_QUERY: TypedDocumentNode<
  TwilioPhonesQuery,
  TwilioPhonesQueryVariables
> = gql`
  query TwilioPhones($teamId: ID!) {
    twilioPhones(teamId: $teamId) {
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
`;
