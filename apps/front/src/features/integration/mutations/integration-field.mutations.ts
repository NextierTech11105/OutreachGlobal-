import type {
  UpsertIntegrationFieldsMutation,
  UpsertIntegrationFieldsMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const UPSERT_INTEGRATION_FIELDS_MUTATION: TypedDocumentNode<
  UpsertIntegrationFieldsMutation,
  UpsertIntegrationFieldsMutationVariables
> = gql`
  mutation UpsertIntegrationFields(
    $teamId: ID!
    $integrationId: ID!
    $moduleName: String!
    $fields: [IntegrationFieldInput!]!
  ) {
    upsertIntegrationFields(
      teamId: $teamId
      integrationId: $integrationId
      moduleName: $moduleName
      fields: $fields
    ) {
      fields {
        id
        sourceField
        targetField
      }
    }
  }
`;
