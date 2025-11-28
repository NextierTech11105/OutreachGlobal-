import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import type {
  CampaignDetailsQuery,
  CampaignDetailsQueryVariables,
  CampaignFormQuery,
  CampaignFormQueryVariables,
  CampaignsQuery,
  CampaignsQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const CAMPAIGNS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "campaigns",
};

export const CAMPAIGNS_QUERY: TypedDocumentNode<
  CampaignsQuery,
  CampaignsQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query Campaigns(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $teamId: ID!
    $searchQuery: String
  ) {
    campaigns(
      first: $first
      last: $last
      after: $after
      before: $before
      teamId: $teamId
      searchQuery: $searchQuery
    ) {
      edges {
        node {
          id
          name
          status
          estimatedLeadsCount
          createdAt
          updatedAt

          aiSdrAvatar {
            id
            name
          }
        }
      }
      pageInfo {
        ...PageInfo
      }
    }
  }
`;

export const CAMPAIGN_FORM_QUERY: TypedDocumentNode<
  CampaignFormQuery,
  CampaignFormQueryVariables
> = gql`
  query CampaignForm($teamId: ID!, $id: ID!) {
    campaign(teamId: $teamId, id: $id) {
      id
      name
      description
      status
      minScore
      maxScore
      aiSdrAvatar {
        id
        name
      }
      sequences {
        id
        name
        type
        content
        position
        subject
        voiceType
        delayDays
        delayHours
      }
    }
  }
`;

export const CAMPAIGN_DETAILS_QUERY: TypedDocumentNode<
  CampaignDetailsQuery,
  CampaignDetailsQueryVariables
> = gql`
  query CampaignDetails($teamId: ID!, $id: ID!) {
    campaign(teamId: $teamId, id: $id) {
      id
      estimatedLeadsCount
      name
      description
      status
      minScore
      maxScore
      aiSdrAvatar {
        id
        name
      }
      sequences {
        id
        name
        type
        content
        position
        subject
        voiceType
        delayDays
        delayHours
      }
    }
  }
`;
