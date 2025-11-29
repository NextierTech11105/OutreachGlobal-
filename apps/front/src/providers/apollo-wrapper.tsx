"use client";

import { ApolloClient, ApolloProvider, InMemoryCache, ApolloLink, HttpLink, from } from "@apollo/client";
import { $cookie } from "@/lib/cookie/client-cookie";
import { ReactNode, useMemo } from "react";

// Create Apollo Client instance
function createApolloClient() {
  const uri = process.env.NEXT_PUBLIC_API_URL + "/graphql";

  // Error logging link
  const errorLink = new ApolloLink((operation, forward) => {
    return forward(operation).map((response) => {
      if (response.errors) {
        response.errors.forEach((error) => {
          console.log(
            `[GraphQL client error]: Message: ${error.message}, Path: ${error.path}`
          );
        });
      }
      return response;
    });
  });

  // Auth link
  const authLink = new ApolloLink((operation, forward) => {
    const operationName = operation.operationName;
    let operationUri = uri;
    const headers: Record<string, string> = {};

    if (typeof window !== "undefined") {
      const token = $cookie.get("session");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    if (operationName) {
      operationUri = `${uri}?operation=${operationName}`;
    }

    operation.setContext(({ headers: existingHeaders = {} }) => ({
      headers: {
        ...existingHeaders,
        ...headers,
      },
      uri: operationUri,
    }));

    return forward(operation);
  });

  const httpLink = new HttpLink({
    uri,
    credentials: "same-origin",
  });

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: from([authLink, errorLink, httpLink]),
    ssrMode: typeof window === "undefined",
  });
}

// Singleton client for client-side
let apolloClient: ApolloClient<unknown> | null = null;

function getApolloClient() {
  // Create new client for SSR
  if (typeof window === "undefined") {
    return createApolloClient();
  }

  // Reuse client on client-side
  if (!apolloClient) {
    apolloClient = createApolloClient();
  }

  return apolloClient;
}

interface ApolloWrapperProps {
  children: ReactNode;
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  const client = useMemo(() => getApolloClient(), []);

  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
}
