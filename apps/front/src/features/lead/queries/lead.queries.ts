import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import type {
  LeadDetailsQuery,
  LeadDetailsQueryVariables,
  LeadFormQuery,
  LeadFormQueryVariables,
  LeadsCountQuery,
  LeadsCountQueryVariables,
  LeadsQuery,
  LeadsQueryVariables,
  LeadStatusesQuery,
  LeadStatusesQueryVariables,
  LeadTagsQuery,
  LeadTagsQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const LEADS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "leads",
};

export const LEADS_QUERY: TypedDocumentNode<LeadsQuery, LeadsQueryVariables> =
  gql`
    ${PAGE_INFO_FRAGMENT}
    query Leads(
      $first: Int
      $last: Int
      $after: String
      $before: String
      $teamId: ID!
      $searchQuery: String
      $hasPhone: Boolean
      $tags: [String!]
    ) {
      leads(
        first: $first
        last: $last
        after: $after
        before: $before
        teamId: $teamId
        searchQuery: $searchQuery
        hasPhone: $hasPhone
        tags: $tags
      ) {
        pageInfo {
          ...PageInfo
        }
        edges {
          node {
            id
            name
            email
            phone
            status
            address
            score
            tags
            company
            createdAt
            updatedAt
          }
        }
      }
    }
  `;

export const LEAD_TAGS_QUERY: TypedDocumentNode<
  LeadTagsQuery,
  LeadTagsQueryVariables
> = gql`
  query LeadTags($teamId: ID!) {
    leadTags(teamId: $teamId)
  }
`;

export const LEAD_STATUSES_QUERY: TypedDocumentNode<
  LeadStatusesQuery,
  LeadStatusesQueryVariables
> = gql`
  query LeadStatuses($teamId: ID!) {
    leadStatuses(teamId: $teamId) {
      id
    }
  }
`;

export const LEADS_COUNT_QUERY: TypedDocumentNode<
  LeadsCountQuery,
  LeadsCountQueryVariables
> = gql`
  query LeadsCount($teamId: ID!, $minScore: Int, $maxScore: Int) {
    leadsCount(teamId: $teamId, minScore: $minScore, maxScore: $maxScore)
  }
`;

export const LEAD_DETAILS_QUERY: TypedDocumentNode<
  LeadDetailsQuery,
  LeadDetailsQueryVariables
> = gql`
  query LeadDetails($teamId: ID!, $id: ID!) {
    lead(teamId: $teamId, id: $id) {
      id
      name
      email
      phone
      status
      tags
      source
      createdAt
      phoneNumbers {
        id
        phone
        label
      }
      property {
        id
        address
        type
        assessedValue
        estimatedValue
        buildingSquareFeet
        lotSquareFeet
        yearBuilt
        ownerOccupied
        ownerFirstName
        ownerLastName
        useCode
      }
    }
  }
`;

export const LEAD_FORM_QUERY: TypedDocumentNode<
  LeadFormQuery,
  LeadFormQueryVariables
> = gql`
  query LeadForm($teamId: ID!, $id: ID!) {
    lead(teamId: $teamId, id: $id) {
      id
      firstName
      lastName
      email
      phone
      title
      company
      zipCode
      country
      state
      city
      address
      source
      notes
      status
      tags
      score
    }
  }
`;
