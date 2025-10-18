import "server-only";
import { cache } from "react";
import { getApolloClient } from "@/graphql/apollo-client";
import { apolloAuthContext } from "@/graphql/apollo-context";
import { getAccessTokenCookie } from "@/lib/cookie/server-cookie";
import { ME_QUERY } from "../user/queries/user.queries";

export const getAuthUser = cache(async (key = "auth") => {
  const token = await getAccessTokenCookie();
  if (!token) {
    return {
      user: null,
      team: null,
    };
  }

  try {
    const { data } = await getApolloClient().query({
      query: ME_QUERY,
      context: await apolloAuthContext(),
    });

    return {
      user: data.me,
      team: data.firstTeam,
    };
  } catch (error) {
    return {
      user: null,
      team: null,
    };
  }
});
