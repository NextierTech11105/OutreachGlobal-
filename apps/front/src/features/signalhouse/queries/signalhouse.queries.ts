import { gql, type TypedDocumentNode } from "@apollo/client";

export interface SignalHouseSettings {
  subGroupId: string | null;
  brandId: string | null;
  campaignIds: string[] | null;
  phonePool: string[] | null;
}

export interface SignalHouseSettingsQuery {
  signalHouseSettings: SignalHouseSettings;
}

export interface SignalHouseSettingsQueryVariables {
  teamId: string;
}

export const SIGNALHOUSE_SETTINGS_QUERY: TypedDocumentNode<
  SignalHouseSettingsQuery,
  SignalHouseSettingsQueryVariables
> = gql`
  query SignalHouseSettings($teamId: ID!) {
    signalHouseSettings(teamId: $teamId) {
      subGroupId
      brandId
      campaignIds
      phonePool
    }
  }
`;
