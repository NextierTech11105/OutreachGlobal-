import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import type {
  CampaignLeadsQuery,
  CampaignLeadsQueryVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const CAMPAIGN_LEADS_QUERY: TypedDocumentNode<
  CampaignLeadsQuery,
  CampaignLeadsQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query CampaignLeads(
    $first: Int
    $last: Int
    $before: String
    $after: String
    $teamId: ID!
    $id: ID!
  ) {
    campaign(teamId: $teamId, id: $id) {
      id
      campaignLeads(
        first: $first
        last: $last
        before: $before
        after: $after
      ) {
        edges {
          node {
            lastSequenceExecutedAt
            lead {
              id
              name
              email
              phone
              status
              address
              score
              createdAt
              updatedAt
              tags
            }
          }
        }
        pageInfo {
          ...PageInfo
        }
      }
    }
  }
`;
