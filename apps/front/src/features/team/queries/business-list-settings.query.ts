import type {
  BusinessListSettingsQuery,
  BusinessListSettingsQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const BUSINESS_LIST_SETTINGS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "businessListSettings",
};

export const BUSINESS_LIST_SETTINGS_QUERY: TypedDocumentNode<
  BusinessListSettingsQuery,
  BusinessListSettingsQueryVariables
> = gql`
  query BusinessListSettings($teamId: ID!) {
    businessListSettings(teamId: $teamId) {
      teamId
      businessListApiToken
    }
  }
`;
