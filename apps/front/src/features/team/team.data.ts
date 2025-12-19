import "server-only";
import { getApolloClient } from "@/graphql/apollo-client";
import { notFound } from "next/navigation";
import { cache } from "react";
import { apolloAuthContext } from "@/graphql/apollo-context";
import { TEAM_QUERY } from "./queries/team.queries";

export const getTeam = cache(async (id: string) => {
  try {
    const { data } = await getApolloClient().query({
      query: TEAM_QUERY,
      variables: { id },
      context: await apolloAuthContext(),
    });

    if (!data?.team) {
      console.warn(`[getTeam] Team not found for ID: ${id}`);
      notFound();
    }

    return data.team;
  } catch (error) {
    console.error(`[getTeam] Error fetching team ${id}:`, error);
    // If it's a 404 from the API, then notFound() is appropriate
    // But if it's a network error or 500, we might want to show an error page instead
    // For now, we'll keep notFound() but add logging so we can see WHY it's failing
    notFound();
  }
});
