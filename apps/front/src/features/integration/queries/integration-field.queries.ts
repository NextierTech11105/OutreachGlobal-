import type {
  IntegrationFieldsQuery,
  IntegrationFieldsQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const INTEGRATION_FIELDS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "integrationFields",
};

export const INTEGRATION_FIELDS_QUERY: TypedDocumentNode<
  IntegrationFieldsQuery,
  IntegrationFieldsQueryVariables
> = gql`
  query IntegrationFields(
    $teamId: ID!
    $integrationId: ID!
    $moduleName: String!
  ) {
    integrationFields(
      teamId: $teamId
      integrationId: $integrationId
      moduleName: $moduleName
    ) {
      id
      sourceField
      targetField
      subField
    }
  }
`;
