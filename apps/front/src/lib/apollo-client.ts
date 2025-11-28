import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

const graphqlUrl =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  (process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/graphql`
    : "https://monkfish-app-mb7h3.ondigitalocean.app/api/graphql");

const httpLink = createHttpLink({
  uri: graphqlUrl,
});

const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth-token") : null;

  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const errorLink = onError(
  ({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) => {
        console.error(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        );
      });
    }

    if (networkError) {
      console.error(`[Network error]: ${networkError}`);

      // Handle 401 errors by clearing auth token
      if ("statusCode" in networkError && networkError.statusCode === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth-token");
          window.location.href = "/login";
        }
      }
    }
  },
);

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
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
