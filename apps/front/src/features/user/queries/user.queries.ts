import type { MeQuery } from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const ME_QUERY: TypedDocumentNode<MeQuery> = gql`
  query Me {
    me {
      id
      email
      name
      role
    }
    firstTeam {
      id
      slug
    }
  }
`;
