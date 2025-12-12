"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoibmV4dGllcjExMTA1IiwiYSI6ImNtaXVrbmRodTFrY3YzanEwamFoZG44dWQifQ.EGNVQPofUwZm60KP6iID_g";

interface MapboxPropertyViewProps {
  latitude: number;
  longitude: number;
  address?: string;
  className?: string;
  mapStyle?: "satellite" | "streets" | "standard";
  zoom?: number;
  showMarker?: boolean;
}

export function MapboxPropertyView({
  latitude,
  longitude,
  address,
  className = "w-full h-64 rounded-lg",
  mapStyle = "satellite",
  zoom = 17,
  showMarker = true,
}: MapboxPropertyViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (!latitude || !longitude) {
      setError("No coordinates available");
      return;
    }

    try {
      // Set access token
      mapboxgl.accessToken = MAPBOX_TOKEN;

      // Get style URL
      let styleUrl: string;
      switch (mapStyle) {
        case "satellite":
          styleUrl = "mapbox://styles/mapbox/satellite-streets-v12";
          break;
        case "streets":
          styleUrl = "mapbox://styles/mapbox/streets-v12";
          break;
        case "standard":
        default:
          styleUrl = "mapbox://styles/mapbox/standard";
          break;
      }

      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: styleUrl,
        center: [longitude, latitude],
        zoom: zoom,
        attributionControl: false,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right",
      );

      // Add marker with popup
      if (showMarker) {
        marker.current = new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat([longitude, latitude])
          .addTo(map.current);

        if (address) {
          const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
          }).setHTML(
            `<div style="padding:4px;font-size:12px;"><strong>${address}</strong></div>`,
          );
          marker.current.setPopup(popup);
        }
      }

      map.current.on("load", () => {
        setMapLoaded(true);
        setError(null);
      });

      map.current.on("error", (e) => {
        console.error("Mapbox error:", e);
        setError("Map failed to load");
      });
    } catch (err) {
      console.error("Map initialization error:", err);
      setError("Failed to initialize map");
    }

    // Cleanup
    return () => {
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [latitude, longitude, mapStyle, zoom, showMarker, address]);

  if (error || !latitude || !longitude) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <p className="text-muted-foreground text-sm">
          {error || "No location data available"}
        </p>
      </div>
    );
  }

  return <div ref={mapContainer} className={className} />;
}

// Combined satellite + street view
interface DualMapViewProps {
  latitude: number;
  longitude: number;
  address?: string;
}

export function DualMapView({
  latitude,
  longitude,
  address,
}: DualMapViewProps) {
  if (!latitude || !longitude) {
    return (
      <div className="space-y-4">
        <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">No location data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MapboxPropertyView
        latitude={latitude}
        longitude={longitude}
        address={address}
        mapStyle="satellite"
        zoom={18}
        className="w-full h-64 rounded-lg border"
      />
      <MapboxPropertyView
        latitude={latitude}
        longitude={longitude}
        address={address}
        mapStyle="streets"
        zoom={15}
        className="w-full h-40 rounded-lg border"
      />
    </div>
  );
}
