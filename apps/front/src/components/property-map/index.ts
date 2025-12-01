"use client";

import dynamic from "next/dynamic";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Use Leaflet by default if no Google Maps API key, or if Google blocks
// Dynamic import with SSR disabled to prevent errors during server-side rendering
export const PropertyMap = dynamic(
  async () => {
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
  },
  { ssr: false }
);

// Also export Leaflet directly for explicit use
export const LeafletPropertyMap = dynamic(
  () => import("./leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false }
);

export type { PropertyMarker } from "./property-map";
