import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import type {
  PowerDialersQuery,
  PowerDialersQueryVariables,
  PowerDialerDetailsQuery,
  PowerDialerDetailsQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const POWER_DIALERS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "powerDialers",
};

export const POWER_DIALERS_QUERY: TypedDocumentNode<
  PowerDialersQuery,
  PowerDialersQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query PowerDialers(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $teamId: ID!
  ) {
    powerDialers(
      first: $first
      last: $last
      after: $after
      before: $before
      teamId: $teamId
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          id
          title
          successRate
          totalDuration
        }
      }
    }
  }
`;

export const POWER_DIALER_DETAILS_QUERY: TypedDocumentNode<
  PowerDialerDetailsQuery,
  PowerDialerDetailsQueryVariables
> = gql`
  query PowerDialerDetails($id: ID!, $teamId: ID!) {
    powerDialer(id: $id, teamId: $teamId) {
      id
      title
      successRate
      totalDuration
    }
  }
`;
