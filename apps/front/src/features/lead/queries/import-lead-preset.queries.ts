import { Cache, gql, TypedDocumentNode } from "@apollo/client";
import type {
  ImportLeadPresetsQuery,
  ImportLeadPresetsQueryVariables,
} from "@/graphql/types";

export const IMPORT_LEAD_PRESETS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "importLeadPresets",
};

export const IMPORT_LEAD_PRESETS_QUERY: TypedDocumentNode<
  ImportLeadPresetsQuery,
  ImportLeadPresetsQueryVariables
> = gql`
  query ImportLeadPresets($teamId: ID!) {
    importLeadPresets(teamId: $teamId) {
      id
      name
      config
    }
  }
`;
