import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import type {
  ExtractNode,
  MessageTemplatesQuery,
  MessageTemplatesQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export type MessageTemplateNode = ExtractNode<
  MessageTemplatesQuery["messageTemplates"]
>;

export const MESSAGE_TEMPLATES_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "messageTemplates",
};

export const MESSAGE_TEMPLATES_QUERY: TypedDocumentNode<
  MessageTemplatesQuery,
  MessageTemplatesQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query MessageTemplates(
    $teamId: ID!
    $first: Int
    $after: String
    $last: Int
    $before: String
    $types: [MessageTemplateType!]
  ) {
    messageTemplates(
      teamId: $teamId
      first: $first
      after: $after
      last: $last
      before: $before
      types: $types
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        cursor
        node {
          id
          type
          name
          data
          createdAt
          updatedAt
        }
      }
    }
  }
`;
