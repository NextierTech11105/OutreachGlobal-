import type {
  CampaignExecutionsQuery,
  CampaignExecutionsQueryVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const CAMPAIGN_EXECUTIONS_QUERY: TypedDocumentNode<
  CampaignExecutionsQuery,
  CampaignExecutionsQueryVariables
> = gql`
  query CampaignExecutions($teamId: ID!, $id: ID!) {
    campaign(teamId: $teamId, id: $id) {
      id
      executions {
        edges {
          node {
            id
            status
            failedReason
            createdAt
          }
        }
      }
    }
  }
`;
