import type {
  UpsertBusinessListSettingsMutation,
  UpsertBusinessListSettingsMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const UPSERT_BUSINESS_LIST_SETTINGS: TypedDocumentNode<
  UpsertBusinessListSettingsMutation,
  UpsertBusinessListSettingsMutationVariables
> = gql`
  mutation UpsertBusinessListSettings(
    $teamId: ID!
    $input: BusinessListSettingsInput!
  ) {
    upsertBusinessListSettings(teamId: $teamId, input: $input) {
      settings {
        teamId
        businessListApiToken
      }
    }
  }
`;
