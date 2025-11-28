import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import type {
  DialerContactsQuery,
  DialerContactsQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const DIALER_CONTACTS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "dialerContacts",
};

export const DIALER_CONTACTS_QUERY: TypedDocumentNode<
  DialerContactsQuery,
  DialerContactsQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query DialerContacts(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $teamId: ID!
    $powerDialerId: ID!
  ) {
    dialerContacts(
      first: $first
      last: $last
      after: $after
      before: $before
      teamId: $teamId
      powerDialerId: $powerDialerId
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          id
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
  }
`;
