"use client";

import { HttpLink, ApolloLink, from } from "@apollo/client";
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { $cookie } from "@/lib/cookie/client-cookie";
import { ReactNode } from "react";

// Client factory function for browser-side hydration
function makeClient() {
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

  // Auth link with cookie-based token
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
    link: from([authLink, errorLink, httpLink]),
  });
}

interface ApolloWrapperProps {
  children: ReactNode;
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  return (
    <ApolloProvider makeClient={makeClient}>
      {children}
    </ApolloProvider>
  );
}
