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

    return data.team;
  } catch (error) {
    notFound();
  }
});
