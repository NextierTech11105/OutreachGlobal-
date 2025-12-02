"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PropertyMarker {
  id: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  estimatedValue?: number;
  equity?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  ownerName?: string;
}

interface PropertyMapProps {
  properties: PropertyMarker[];
  onSearchArea?: (bounds: { lat: number; lng: number; radius: number }) => void;
  onPropertyClick?: (property: PropertyMarker) => void;
  loading?: boolean;
  center?: { lat: number; lng: number };
  zoom?: number;
}

export function PropertyMap({
  properties,
  onSearchArea,
  onPropertyClick,
  loading = false,
  center = { lat: 39.8283, lng: -98.5795 }, // US center
  zoom = 4,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already loaded
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    // Check for API key
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps API key not configured");
      return;
    }

    // Load script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setError("Failed to load Google Maps");
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || googleMapRef.current) return;

    try {
      // Make sure google.maps.Map exists
      if (!window.google?.maps?.Map) {
        setError("Google Maps not available");
        return;
      }

      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });
    } catch (err) {
      console.error("Map init error:", err);
      setError("Failed to initialize map");
    }
  }, [mapLoaded, center, zoom]);

  // Update markers when properties change
  useEffect(() => {
    if (!googleMapRef.current || !window.google?.maps?.Marker) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    properties.forEach((property) => {
      if (!property.lat || !property.lng) return;

      const marker = new window.google.maps.Marker({
        position: { lat: property.lat, lng: property.lng },
        map: googleMapRef.current,
        title: property.address,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: property.equity && property.equity > 100000 ? "#22c55e" : "#3b82f6",
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      // Info window
      const infoContent = `
        <div style="padding: 8px; max-width: 250px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${property.address}</div>
          <div style="color: #666; font-size: 12px;">${property.city}, ${property.state} ${property.zip}</div>
          <div style="margin-top: 8px; font-size: 12px;">
            <div><strong>Type:</strong> ${property.propertyType}</div>
            ${property.beds ? `<div><strong>Beds/Baths:</strong> ${property.beds}/${property.baths || "-"}</div>` : ""}
            ${property.estimatedValue ? `<div><strong>Value:</strong> $${property.estimatedValue.toLocaleString()}</div>` : ""}
            ${property.equity ? `<div style="color: #22c55e;"><strong>Equity:</strong> $${property.equity.toLocaleString()}</div>` : ""}
            ${property.ownerName ? `<div><strong>Owner:</strong> ${property.ownerName}</div>` : ""}
          </div>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({ content: infoContent });

      marker.addListener("click", () => {
        infoWindow.open(googleMapRef.current, marker);
        onPropertyClick?.(property);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have properties
    if (properties.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      properties.forEach((p) => {
        if (p.lat && p.lng) {
          bounds.extend({ lat: p.lat, lng: p.lng });
        }
      });
      googleMapRef.current.fitBounds(bounds, 50);
    }
  }, [properties, onPropertyClick]);

  // Handle search area
  const handleSearchArea = useCallback(() => {
    if (!googleMapRef.current || !onSearchArea) return;

    const mapCenter = googleMapRef.current.getCenter();
    const bounds = googleMapRef.current.getBounds();

    if (!mapCenter || !bounds) return;

    // Calculate radius from bounds
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latDiff = Math.abs(ne.lat() - sw.lat());
    const lngDiff = Math.abs(ne.lng() - sw.lng());
    const avgDiff = (latDiff + lngDiff) / 2;
    const radiusMiles = avgDiff * 69 / 2; // Rough conversion

    onSearchArea({
      lat: mapCenter.lat(),
      lng: mapCenter.lng(),
      radius: Math.min(Math.max(radiusMiles, 1), 100),
    });
  }, [onSearchArea]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/50">
        <div className="text-center p-8">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Use the table view to see properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      {/* Loading overlay */}
      {(loading || !mapLoaded) && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Search this area button */}
      {onSearchArea && mapLoaded && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <Button
            onClick={handleSearchArea}
            size="sm"
            className="shadow-lg"
            disabled={loading}
          >
            <Search className="h-4 w-4 mr-1" />
            Search this area
          </Button>
        </div>
      )}

      {/* Property count badge */}
      <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur px-3 py-1 rounded-full text-sm shadow">
        {properties.length} properties
      </div>
    </div>
  );
}
