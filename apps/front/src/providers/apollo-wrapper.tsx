"use client";

import { ReactNode, useState, useEffect } from "react";

interface ApolloWrapperProps {
  children: ReactNode;
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const [ApolloProvider, setApolloProvider] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically import Apollo only on client side
    Promise.all([
      import("@apollo/client").then((mod) => mod.ApolloProvider),
      import("@/lib/apollo-client").then((mod) => mod.default),
    ])
      .then(([Provider, apolloClient]) => {
        setApolloProvider(() => Provider);
        setClient(apolloClient);
        setMounted(true);
      })
      .catch((err) => {
        console.error("[ApolloWrapper] Failed to load Apollo client:", err);
        setError(err.message || "Failed to initialize");
        setMounted(true); // Still mark as mounted so we show error UI
      });
  }, []);

  // Show error UI if Apollo failed to load
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 text-lg font-semibold mb-2">
          Connection Error
        </div>
        <div className="text-gray-600 text-sm mb-4 text-center max-w-md">
          Unable to connect to the server. Please check your internet connection
          and try again.
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Retry
        </button>
        <div className="text-xs text-gray-400 mt-4">{error}</div>
      </div>
    );
  }

  // Show loading spinner while Apollo loads
  if (!mounted || !ApolloProvider || !client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
