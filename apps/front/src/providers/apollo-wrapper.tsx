"use client";

import { ReactNode, useState, useEffect } from "react";

interface ApolloWrapperProps {
  children: ReactNode;
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const [ApolloProvider, setApolloProvider] = useState<any>(null);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    // Dynamically import Apollo only on client side
    Promise.all([
      import("@apollo/client").then((mod) => mod.ApolloProvider),
      import("@/lib/apollo-client").then((mod) => mod.default),
    ]).then(([Provider, apolloClient]) => {
      setApolloProvider(() => Provider);
      setClient(apolloClient);
      setMounted(true);
    });
  }, []);

  // Show loading spinner while Apollo loads - don't render children without provider
  if (!mounted || !ApolloProvider || !client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
