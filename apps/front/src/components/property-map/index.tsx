"use client";

import { sf, sfd } from "@/lib/utils/safe-format";
import dynamic from "next/dynamic";
import { MapPin, AlertCircle } from "lucide-react";

// Fallback component when map fails to load
function MapFallback({ properties = [] }: { properties?: { id: string }[] }) {
  return (
    <div className="h-full w-full min-h-[500px] bg-zinc-900 rounded-lg flex flex-col items-center justify-center text-zinc-400">
      <AlertCircle className="h-12 w-12 mb-4 text-yellow-500" />
      <h3 className="text-lg font-semibold mb-2">Map Loading Failed</h3>
      <p className="text-sm text-zinc-500 mb-4">Using list view instead</p>
      <div className="flex items-center gap-2 text-green-500">
        <MapPin className="h-5 w-5" />
        <span className="text-xl font-bold">
          {sf(properties.length)} Properties
        </span>
      </div>
    </div>
  );
}

export const PropertyMap = dynamic(
  () =>
    import("./property-map")
      .then((mod) => mod.PropertyMap)
      .catch((error) => {
        console.error("Failed to load PropertyMap:", error);
        return MapFallback;
      }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full min-h-[500px] bg-zinc-900 rounded-lg flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading map...</div>
      </div>
    ),
  },
);

export type { PropertyMarker } from "./property-map";
