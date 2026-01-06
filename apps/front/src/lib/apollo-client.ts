import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import Cookies from "js-cookie";

// GraphQL endpoint - requires NEXT_PUBLIC_GRAPHQL_URL or NEXT_PUBLIC_API_URL to be set
const graphqlUrl =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  (process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/graphql`
    : "/graphql"); // Fallback to relative path for same-origin requests

const httpLink = createHttpLink({
  uri: graphqlUrl,
});

// Auth link using setContext helper - reads from cookie (nextier_session) or API key
const authLink = setContext((_, { headers }) => {
  if (typeof window === "undefined") {
    return { headers };
  }

  // Check for JWT token first
  const token = Cookies.get("nextier_session");
  if (token) {
    return {
      headers: {
        ...headers,
        authorization: `Bearer ${token}`,
      },
    };
  }

  // Fall back to API key (stored in localStorage or cookie)
  const apiKey =
    localStorage.getItem("og_api_key") || Cookies.get("og_api_key");
  if (apiKey) {
    return {
      headers: {
        ...headers,
        "x-api-key": apiKey,
      },
    };
  }

  return { headers };
});

// Error link using onError helper
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, path }) => {
      // Don't spam console with auth errors - these are expected when not logged in
      if (message === "Unauthorized") return;
      console.error(`[GraphQL error]: Message: ${message}, Path: ${path}`);
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

const client = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
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
  defaultOptions: {
    watchQuery: {
      errorPolicy: "all",
    },
    query: {
      errorPolicy: "all",
    },
  },
});

export default client;
