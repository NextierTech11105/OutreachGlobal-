"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Trash2, Layers } from "lucide-react";
import type { PropertyMarker } from "./property-map";

interface LeafletMapProps {
  properties?: PropertyMarker[];
  onSearchArea?: (bounds: { lat: number; lng: number; radius: number }) => void;
  onPropertyClick?: (property: PropertyMarker) => void;
  loading?: boolean;
}

export function LeafletMap({
  properties = [],
  onSearchArea,
  onPropertyClick,
  loading = false,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circleRef = useRef<L.Circle | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapType, setMapType] = useState<"street" | "satellite">("street");

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Dynamic import of Leaflet
    import("leaflet").then((L) => {
      // Fix for default marker icons - comprehensive safety
      try {
        // Only run in browser
        if (typeof window === "undefined") return;

        // Check if Leaflet loaded properly
        if (!L || !L.map) {
          console.error("Leaflet not loaded properly");
          return;
        }

        // Fix marker icons
        if (L.Icon?.Default?.prototype) {
          const proto = L.Icon.Default.prototype as Record<string, unknown>;
          if (proto._getIconUrl) {
            delete proto._getIconUrl;
          }
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          });
        }
      } catch (e) {
        console.warn("Leaflet icon fix failed:", e);
      }

      if (!mapRef.current) return;

      try {
        const map = L.map(mapRef.current, {
          center: [39.8283, -98.5795], // Center of US
          zoom: 4,
          zoomControl: true,
        });

        // Add tile layer (OpenStreetMap)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        leafletMapRef.current = map;
        setIsMapReady(true);

        // Add click handler for drawing circles
        map.on("click", (e: L.LeafletMouseEvent) => {
          if (circleRef.current) {
            map.removeLayer(circleRef.current);
          }

          const circle = L.circle(e.latlng, {
            radius: 16093, // ~10 miles in meters
            color: "#22c55e",
            fillColor: "#22c55e",
            fillOpacity: 0.15,
            weight: 2,
          }).addTo(map);

          circleRef.current = circle;

          onSearchArea?.({
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            radius: 10, // miles
          });
        });
      } catch (mapError) {
        console.error("Failed to initialize Leaflet map:", mapError);
      }
    }).catch((importError) => {
      console.error("Failed to import Leaflet:", importError);
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [onSearchArea]);

  // Update markers when properties change
  useEffect(() => {
    if (!leafletMapRef.current || !isMapReady) return;

    import("leaflet").then((L) => {
      const map = leafletMapRef.current!;

      // Clear existing markers
      markersRef.current.forEach((marker) => map.removeLayer(marker));
      markersRef.current = [];

      // Add new markers
      properties.forEach((property) => {
        const marker = L.marker([property.lat, property.lng])
          .addTo(map)
          .bindPopup(`
            <div class="p-2">
              <strong>${property.address}</strong><br/>
              ${property.city}, ${property.state} ${property.zip}<br/>
              ${property.propertyType}<br/>
              ${property.estimatedValue ? `Value: $${property.estimatedValue.toLocaleString()}<br/>` : ""}
              ${property.equity ? `<span style="color: #22c55e; font-weight: bold;">Equity: $${property.equity.toLocaleString()}</span>` : ""}
            </div>
          `);

        marker.on("click", () => onPropertyClick?.(property));
        markersRef.current.push(marker);
      });

      // Fit bounds if there are properties
      if (properties.length > 0) {
        const bounds = L.latLngBounds(properties.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    });
  }, [properties, isMapReady, onPropertyClick]);

  const clearSearch = () => {
    if (circleRef.current && leafletMapRef.current) {
      leafletMapRef.current.removeLayer(circleRef.current);
      circleRef.current = null;
    }
  };

  const toggleMapType = () => {
    if (!leafletMapRef.current) return;

    import("leaflet").then((L) => {
      const map = leafletMapRef.current!;

      // Remove existing tile layer
      map.eachLayer((layer) => {
        if ((layer as L.TileLayer).getAttribution?.()?.includes("OpenStreetMap") ||
            (layer as L.TileLayer).getAttribution?.()?.includes("Esri")) {
          map.removeLayer(layer);
        }
      });

      if (mapType === "street") {
        // Switch to satellite (Esri)
        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          attribution: "Tiles &copy; Esri",
          maxZoom: 19,
        }).addTo(map);
        setMapType("satellite");
      } else {
        // Switch to street
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);
        setMapType("street");
      }
    });
  };

  return (
    <div className="relative h-full w-full" style={{ minHeight: "500px" }}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={toggleMapType}
          className="bg-background/90 backdrop-blur"
        >
          <Layers className="h-4 w-4 mr-2" />
          {mapType === "street" ? "Satellite" : "Street"}
        </Button>

        {circleRef.current && (
          <Button
            size="sm"
            variant="destructive"
            onClick={clearSearch}
            className="bg-background/90 backdrop-blur"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Area
          </Button>
        )}
      </div>

      {/* Property Count Badge */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Badge variant="secondary" className="bg-background/90 backdrop-blur text-lg px-4 py-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <MapPin className="h-4 w-4 mr-2" />
          )}
          {properties.length.toLocaleString()} Properties
        </Badge>
      </div>

      {/* Click Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
        <Badge className="bg-primary text-primary-foreground px-4 py-2">
          Click on the map to search properties in that area
        </Badge>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="h-full w-full rounded-lg" style={{ minHeight: "500px" }} />
    </div>
  );
}
