"use client";

import dynamic from "next/dynamic";
import { MapPin, AlertCircle } from "lucide-react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Fallback component when map fails to load
function MapFallback({ properties = [] }: { properties?: { id: string }[] }) {
  return (
    <div className="h-full w-full min-h-[500px] bg-zinc-900 rounded-lg flex flex-col items-center justify-center text-zinc-400">
      <AlertCircle className="h-12 w-12 mb-4 text-yellow-500" />
      <h3 className="text-lg font-semibold mb-2">Map Loading Failed</h3>
      <p className="text-sm text-zinc-500 mb-4">Using list view instead</p>
      <div className="flex items-center gap-2 text-green-500">
        <MapPin className="h-5 w-5" />
        <span className="text-xl font-bold">{properties.length.toLocaleString()} Properties</span>
      </div>
    </div>
  );
}

// Use Leaflet by default if no Google Maps API key, or if Google blocks
// Dynamic import with SSR disabled to prevent errors during server-side rendering
export const PropertyMap = dynamic(
  async () => {
    try {
      // If no Google Maps API key, use Leaflet directly
      if (!GOOGLE_MAPS_API_KEY) {
        const { LeafletMap } = await import("./leaflet-map");
        return LeafletMap;
      }

      // Try Google Maps first
      try {
        const { PropertyMap: GooglePropertyMap } = await import("./property-map");
        return GooglePropertyMap;
      } catch {
        // Fallback to Leaflet if Google fails
        const { LeafletMap } = await import("./leaflet-map");
        return LeafletMap;
      }
    } catch (error) {
      console.error("Failed to load map component:", error);
      return MapFallback;
    }
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full min-h-[500px] bg-zinc-900 rounded-lg flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading map...</div>
      </div>
    ),
  }
);

// Also export Leaflet directly for explicit use
export const LeafletPropertyMap = dynamic(
  () => import("./leaflet-map").then((mod) => mod.LeafletMap).catch(() => MapFallback),
  { ssr: false }
);

export type { PropertyMarker } from "./property-map";
