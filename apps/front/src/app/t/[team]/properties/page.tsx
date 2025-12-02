"use client";

import dynamic from "next/dynamic";
import { Suspense, Component, ReactNode } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Error Boundary to catch crashes
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
          <AlertTriangle className="h-12 w-12 text-yellow-500" />
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground text-center max-w-md">
            {this.state.error?.message || "Failed to load the Property Terminal"}
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Dynamic import to avoid SSR issues with Google Maps
const PropertyTerminal = dynamic(
  () => import("@/components/property-terminal/property-terminal").then((mod) => mod.PropertyTerminal),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Property Terminal...</span>
      </div>
    )
  }
);

export default function PropertiesPage() {
  return (
    <div className="h-[calc(100vh-64px)]">
      <ErrorBoundary>
        <Suspense fallback={
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }>
          <PropertyTerminal />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
