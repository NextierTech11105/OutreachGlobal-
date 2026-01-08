"use client";

import { gql, useQuery } from "@apollo/client";

const FIRST_TEAM_QUERY = gql`
  query FirstTeam {
    firstTeam {
      id
      slug
    }
  }
`;

/**
 * Hook to get the current user's first team slug
 * Used for redirecting from /admin routes to /t/[team] routes
 */
export function useTeamSlug(): string | null {
  const { data } = useQuery(FIRST_TEAM_QUERY);
  return data?.firstTeam?.slug || null;
}
