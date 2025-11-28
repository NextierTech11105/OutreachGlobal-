import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import { MessagesQuery, MessagesQueryVariables } from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const MESSAGES_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "messages",
};

export const MESSAGES_QUERY: TypedDocumentNode<
  MessagesQuery,
  MessagesQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query Messages(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $teamId: ID!
    $direction: String
  ) {
    messages(
      first: $first
      last: $last
      after: $after
      before: $before
      teamId: $teamId
      direction: $direction
    ) {
      edges {
        node {
          id
          status
          fromAddress
          fromName
          toAddress
          toName
          subject
          body
          direction
          type
          createdAt
          updatedAt
        }
      }
      pageInfo {
        ...PageInfo
      }
    }
  }
`;
