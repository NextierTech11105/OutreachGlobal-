import type {
  IntegrationDetailsQuery,
  IntegrationDetailsQueryVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const INTEGRATION_DETAILS_QUERY: TypedDocumentNode<
  IntegrationDetailsQuery,
  IntegrationDetailsQueryVariables
> = gql`
  query IntegrationDetails($teamId: ID!, $id: String!) {
    integration(teamId: $teamId, id: $id) {
      id
      name
      enabled
      isExpired
    }
  }
`;
