"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

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
      <Suspense fallback={
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
        <PropertyTerminal />
      </Suspense>
    </div>
  );
}
