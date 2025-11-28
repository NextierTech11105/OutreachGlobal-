import { gql } from "@apollo/client";

export const PAGE_INFO_FRAGMENT = gql`
  fragment PageInfo on PageInfo {
    startCursor
    endCursor
    hasNextPage
    hasPrevPage
    total
    totalPerPage
  }
`;
