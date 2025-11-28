import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import type { PromptsQuery, PromptsQueryVariables } from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const PROMPTS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "prompts",
};

export const PROMPTS_QUERY: TypedDocumentNode<
  PromptsQuery,
  PromptsQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query Prompts(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $teamId: ID!
    $type: String
  ) {
    prompts(
      first: $first
      last: $last
      after: $after
      before: $before
      teamId: $teamId
      type: $type
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        cursor
        node {
          id
          name
          description
          content
          type
          category
          tags
          createdAt
          updatedAt
        }
      }
    }
  }
`;
