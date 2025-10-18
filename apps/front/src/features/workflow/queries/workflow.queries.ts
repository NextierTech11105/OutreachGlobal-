import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import type { WorkflowsQuery, WorkflowsQueryVariables } from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const WORKFLOWS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "workflows",
};

export const WORKFLOWS_QUERY: TypedDocumentNode<
  WorkflowsQuery,
  WorkflowsQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query Workflows($teamId: ID!, $active: Boolean) {
    workflows(teamId: $teamId, active: $active) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          id
          name
          trigger {
            id
            label
          }
        }
      }
    }
  }
`;
