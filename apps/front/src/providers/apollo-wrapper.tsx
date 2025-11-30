"use client";

import { ApolloProvider } from "@apollo/client";
import client from "@/lib/apollo-client";
import { ReactNode } from "react";

interface ApolloWrapperProps {
  children: ReactNode;
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
}
