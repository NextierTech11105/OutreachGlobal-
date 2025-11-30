import { HttpLink, ApolloLink, from } from "@apollo/client";
import {
  registerApolloClient,
  ApolloClient,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";

const graphqlUrl =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  (process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/graphql`
    : "https://monkfish-app-mb7h3.ondigitalocean.app/graphql");

// Server-side Apollo Client for RSC using the new integration
export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
  const httpLink = new HttpLink({
    uri: graphqlUrl,
    fetchOptions: { cache: "no-store" },
  });

  // Error link
  const errorLink = new ApolloLink((operation, forward) => {
    return forward(operation).map((response) => {
      if (response.errors) {
        response.errors.forEach((error) => {
          console.error(
            `[GraphQL error]: Message: ${error.message}, Path: ${error.path}`
          );
        });
      }
      return response;
    });
  });

  return new ApolloClient({
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            leads: {
              keyArgs: ["organizationId", "filters"],
              merge(existing = { items: [], total: 0 }, incoming) {
                return {
                  ...incoming,
                  items: [...(existing.items || []), ...(incoming.items || [])],
                };
              },
            },
            campaigns: {
              keyArgs: ["organizationId", "filters"],
              merge(existing = { items: [], total: 0 }, incoming) {
                return {
                  ...incoming,
                  items: [...(existing.items || []), ...(incoming.items || [])],
                };
              },
            },
          },
        },
      },
    }),
    link: from([errorLink, httpLink]),
    defaultOptions: {
      watchQuery: {
        errorPolicy: "all",
      },
      query: {
        errorPolicy: "all",
      },
    },
  });
});

// Legacy export for backward compatibility
export default getClient();
