import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import { PropertiesQuery, PropertiesQueryVariables } from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const PROPERTIES_QUERY: TypedDocumentNode<
  PropertiesQuery,
  PropertiesQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query Properties(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $teamId: ID!
  ) {
    properties(
      teamId: $teamId
      first: $first
      last: $last
      before: $before
      after: $after
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          id
          address
          useCode
          lotSquareFeet
          buildingSquareFeet
          auctionDate
          assessedValue
          estimatedValue
          ownerName
          ownerOccupied
          assessedValue
          estimatedValue
          yearBuilt
        }
      }
    }
  }
`;
