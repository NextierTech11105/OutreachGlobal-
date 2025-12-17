import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  FirstTeamQuery,
  TeamQuery,
  TeamQueryVariables,
} from "@/graphql/types";

export const FIRST_TEAM_QUERY: TypedDocumentNode<FirstTeamQuery> = gql`
  query FirstTeam {
    firstTeam {
      id
      slug
    }
  }
`;

export const TEAM_QUERY: TypedDocumentNode<TeamQuery, TeamQueryVariables> = gql`
  query Team($id: ID!) {
    team(id: $id) {
      id
      name
      slug
    }
  }
`;
