import "server-only";
import { getApolloClient } from "@/graphql/apollo-client";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LEAD_DETAILS_QUERY, LEAD_FORM_QUERY } from "./queries/lead.queries";
import { apolloAuthContext } from "@/graphql/apollo-context";

export const getLeadForm = cache(
  async (id: string, teamId: string, key = "lead-form") => {
    try {
      const { data } = await getApolloClient().query({
        query: LEAD_FORM_QUERY,
        variables: { id, teamId },
        context: await apolloAuthContext(),
      });

      return data.lead;
    } catch (error) {
      notFound();
    }
  },
);

export const getLeadDetails = cache(
  async (id: string, teamId: string, key = "lead-details") => {
    try {
      const { data } = await getApolloClient().query({
        query: LEAD_DETAILS_QUERY,
        variables: { id, teamId },
        context: await apolloAuthContext(),
      });

      return data.lead;
    } catch (error) {
      notFound();
    }
  },
);
