import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import {
  CallHistoriesQuery,
  CallHistoriesQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const CALL_HISTORIES_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "callHistories",
};

export const CALL_HISTORIES_QUERY: TypedDocumentNode<
  CallHistoriesQuery,
  CallHistoriesQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query CallHistories(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $teamId: ID!
    $powerDialerId: ID
  ) {
    callHistories(
      first: $first
      last: $last
      after: $after
      before: $before
      teamId: $teamId
      powerDialerId: $powerDialerId
    ) {
      edges {
        node {
          id
          duration
          dialerMode
          disposition
          createdAt
          contact {
            lead {
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
      pageInfo {
        ...PageInfo
      }
    }
  }
`;
