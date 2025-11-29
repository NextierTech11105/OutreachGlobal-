"use client";

import { getApolloClient } from "@/graphql/apollo-client";
import { ApolloProvider } from "@apollo/client";
import { ReactNode } from "react";

const client = getApolloClient();

interface ApolloWrapperProps {
  children: ReactNode;
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
