import { gql, type TypedDocumentNode } from "@apollo/client";
import type { SignalHouseSettings } from "../queries/signalhouse.queries";

export interface SignalHouseSettingsInput {
  subGroupId?: string | null;
  brandId?: string | null;
  campaignIds?: string[];
  phonePool?: string[];
}

export interface UpdateSignalHouseSettingsMutation {
  updateSignalHouseSettings: {
    settings: SignalHouseSettings;
  };
}

export interface UpdateSignalHouseSettingsMutationVariables {
  teamId: string;
  input: SignalHouseSettingsInput;
}

export const UPDATE_SIGNALHOUSE_SETTINGS_MUTATION: TypedDocumentNode<
  UpdateSignalHouseSettingsMutation,
  UpdateSignalHouseSettingsMutationVariables
> = gql`
  mutation UpdateSignalHouseSettings(
    $teamId: ID!
    $input: SignalHouseSettingsInput!
  ) {
    updateSignalHouseSettings(teamId: $teamId, input: $input) {
      settings {
        subGroupId
        brandId
        campaignIds
        phonePool
      }
    }
  }
`;
