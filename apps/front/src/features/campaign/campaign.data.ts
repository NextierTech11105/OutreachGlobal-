import "server-only";
import { getApolloClient } from "@/graphql/apollo-client";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  CAMPAIGN_DETAILS_QUERY,
  CAMPAIGN_FORM_QUERY,
} from "./queries/campaign.queries";
import { apolloAuthContext } from "@/graphql/apollo-context";

export const getCampaignForm = cache(async (id: string, teamId: string) => {
  try {
    const { data } = await getApolloClient().query({
      query: CAMPAIGN_FORM_QUERY,
      variables: {
        teamId,
        id,
      },
      context: await apolloAuthContext(),
    });

    return data.campaign;
  } catch (error) {
    notFound();
  }
});

export const getCampaignDetails = cache(
  async (id: string, teamId: string, key = "campaign-details") => {
    try {
      const { data } = await getApolloClient().query({
        query: CAMPAIGN_DETAILS_QUERY,
        variables: {
          teamId,
          id,
        },
        context: await apolloAuthContext(),
      });

      return data.campaign;
    } catch (error) {
      notFound();
    }
  },
);
