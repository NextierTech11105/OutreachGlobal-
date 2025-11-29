"use client";

import { ApolloLink, HttpLink, from } from "@apollo/client";
import {
  ApolloNextAppProvider,
  InMemoryCache,
  ApolloClient,
} from "@apollo/experimental-nextjs-app-support";
import { $cookie } from "@/lib/cookie/client-cookie";
import { ReactNode } from "react";

// Make client factory for SSR-safe Apollo
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
  });
}

interface ApolloWrapperProps {
  children: ReactNode;
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
