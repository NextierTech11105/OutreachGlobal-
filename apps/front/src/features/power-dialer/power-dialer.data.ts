import "server-only";
import { getApolloClient } from "@/graphql/apollo-client";
import { notFound } from "next/navigation";
import { cache } from "react";
import { POWER_DIALER_DETAILS_QUERY } from "./queries/power-dialer.queries";
import { apolloAuthContext } from "@/graphql/apollo-context";

export const getPowerDialerDetails = cache(
  async (id: string, teamId: string) => {
    try {
      const { data } = await getApolloClient().query({
        query: POWER_DIALER_DETAILS_QUERY,
        variables: { teamId, id },
        context: await apolloAuthContext(),
      });

      return data.powerDialer;
    } catch (error) {
      notFound();
    }
  },
);
