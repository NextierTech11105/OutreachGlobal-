import "server-only";
import { getApolloClient } from "@/graphql/apollo-client";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AI_SDR_AVATAR_DETAILS_QUERY } from "./queries/sdr.queries";
import { apolloAuthContext } from "@/graphql/apollo-context";

export const getAiSdrAvatarDetails = cache(
  async (id: string, teamId: string) => {
    try {
      const { data } = await getApolloClient().query({
        query: AI_SDR_AVATAR_DETAILS_QUERY,
        variables: { teamId, id },
        context: await apolloAuthContext(),
      });

      return data.aiSdrAvatar;
    } catch (error) {
      notFound();
    }
  },
);
