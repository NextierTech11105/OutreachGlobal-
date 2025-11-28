import type {
  ConnectIntegrationMutation,
  ConnectIntegrationMutationVariables,
  SyncIntegrationLeadMutation,
  SyncIntegrationLeadMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const CONNECT_INTEGRATION_MUTATION: TypedDocumentNode<
  ConnectIntegrationMutation,
  ConnectIntegrationMutationVariables
> = gql`
  mutation ConnectIntegration($teamId: ID!, $provider: String!) {
    connectIntegration(teamId: $teamId, provider: $provider) {
      uri
    }
  }
`;

export const SYNC_INTEGRATION_LEAD_MUTATION: TypedDocumentNode<
  SyncIntegrationLeadMutation,
  SyncIntegrationLeadMutationVariables
> = gql`
  mutation SyncIntegrationLead($teamId: ID!, $id: ID!, $moduleName: String!) {
    syncIntegrationLead(teamId: $teamId, id: $id, moduleName: $moduleName) {
      task {
        id
        status
      }
    }
  }
`;
