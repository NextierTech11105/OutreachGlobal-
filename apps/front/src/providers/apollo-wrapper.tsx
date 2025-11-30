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

  // Show children without Apollo during SSR and initial load
  if (!mounted || !ApolloProvider || !client) {
    return <>{children}</>;
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
