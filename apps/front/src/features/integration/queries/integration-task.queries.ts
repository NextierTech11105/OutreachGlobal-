import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import type {
  IntegrationTasksQuery,
  IntegrationTasksQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const INTEGRATION_TASKS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "integrationTasks",
};

export const INTEGRATION_TASKS_QUERY: TypedDocumentNode<
  IntegrationTasksQuery,
  IntegrationTasksQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query IntegrationTasks(
    $teamId: ID!
    $integrationId: ID!
    $moduleName: String
  ) {
    integrationTasks(
      teamId: $teamId
      integrationId: $integrationId
      moduleName: $moduleName
    ) {
      edges {
        node {
          id
          moduleName
          status
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
