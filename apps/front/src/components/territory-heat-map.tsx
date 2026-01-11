"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoibmV4dGllcjExMTA1IiwiYSI6ImNtaXVrbmRodTFrY3YzanEwamFoZG44dWQifQ.EGNVQPofUwZm60KP6iID_g";

// State abbreviation to FIPS code mapping for Mapbox state boundaries
const STATE_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
  DE: "10", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18",
  IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24", MA: "25",
  MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31", NV: "32",
  NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38", OH: "39",
  OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46", TN: "47",
  TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54", WI: "55",
  WY: "56", DC: "11"
};

interface StateData {
  state: string;
  companyCount: number;
  smsReadyCount: number;
  avgScore: number;
}

interface TerritoryHeatMapProps {
  stateData: StateData[];
  className?: string;
}

export function TerritoryHeatMap({
  stateData,
  className = "w-full h-[400px] rounded-lg"
}: TerritoryHeatMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Calculate max for color scale
  const maxCount = Math.max(...stateData.map(s => s.companyCount), 1);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-98.5795, 39.8283], // Center of US
      zoom: 3.5,
      attributionControl: false,
      maxBounds: [[-180, 10], [-50, 75]], // Limit to North America
    });

    map.current.on("load", () => {
      if (!map.current) return;

      // Create a lookup object for state data
      const stateDataLookup: Record<string, StateData> = {};
      stateData.forEach(s => {
        const fips = STATE_FIPS[s.state.toUpperCase()];
        if (fips) {
          stateDataLookup[fips] = s;
        }
      });

      // Add US states source from Mapbox
      map.current.addSource("states", {
        type: "vector",
        url: "mapbox://mapbox.boundaries-adm1-v4"
      });

      // Build the fill color expression based on company count
      const colorStops: [number, string][] = [
        [0, "#f0f9ff"],      // Very light blue - no data
        [1, "#bae6fd"],      // Light blue
        [10, "#7dd3fc"],     // Sky blue
        [50, "#38bdf8"],     // Bright blue
        [100, "#0ea5e9"],    // Ocean blue
        [500, "#0284c7"],    // Deep blue
        [1000, "#0369a1"],   // Darker blue
      ];

      // Create match expression for state colors
      const matchExpression: mapboxgl.Expression = ["match", ["get", "iso_3166_2"]];

      stateData.forEach(s => {
        const stateCode = `US-${s.state.toUpperCase()}`;
        // Calculate color based on company count
        let color = "#f0f9ff";
        for (const [threshold, c] of colorStops) {
          if (s.companyCount >= threshold) {
            color = c;
          }
        }
        matchExpression.push(stateCode, color);
      });

      // Default color for states with no data
      matchExpression.push("#f8fafc");

      // Add the fill layer for states
      map.current.addLayer({
        id: "state-fills",
        type: "fill",
        source: "states",
        "source-layer": "boundaries_admin_1",
        filter: ["==", ["get", "iso_3166_1"], "US"],
        paint: {
          "fill-color": matchExpression,
          "fill-opacity": 0.8
        }
      });

      // Add state borders
      map.current.addLayer({
        id: "state-borders",
        type: "line",
        source: "states",
        "source-layer": "boundaries_admin_1",
        filter: ["==", ["get", "iso_3166_1"], "US"],
        paint: {
          "line-color": "#64748b",
          "line-width": 0.5
        }
      });

      // Add hover effect
      map.current.addLayer({
        id: "state-fills-hover",
        type: "fill",
        source: "states",
        "source-layer": "boundaries_admin_1",
        filter: ["==", ["get", "iso_3166_1"], "US"],
        paint: {
          "fill-color": "#fbbf24",
          "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.3, 0]
        }
      });

      let hoveredStateId: string | null = null;

      // Popup for state info
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 15
      });

      map.current.on("mousemove", "state-fills", (e) => {
        if (!map.current || !e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const stateCode = feature.properties?.iso_3166_2?.replace("US-", "");

        if (!stateCode) return;

        // Find state data
        const data = stateData.find(s => s.state.toUpperCase() === stateCode);

        if (data) {
          popup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="padding: 8px; font-size: 14px;">
                <strong style="font-size: 16px;">${stateCode}</strong>
                <div style="margin-top: 4px;">
                  <div><strong>${data.companyCount.toLocaleString()}</strong> companies</div>
                  <div style="color: #22c55e;"><strong>${data.smsReadyCount.toLocaleString()}</strong> SMS ready</div>
                  ${data.avgScore > 0 ? `<div>Avg Score: <strong>${data.avgScore}</strong></div>` : ""}
                </div>
              </div>
            `)
            .addTo(map.current!);
        }

        map.current.getCanvas().style.cursor = "pointer";
      });

      map.current.on("mouseleave", "state-fills", () => {
        if (!map.current) return;
        popup.remove();
        map.current.getCanvas().style.cursor = "";
      });

      setMapLoaded(true);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [stateData, maxCount]);

  if (stateData.length === 0) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center border`}>
        <p className="text-muted-foreground text-sm">
          Import companies to see territory heat map
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapContainer} className={`${className} border`} />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg text-xs">
        <div className="font-medium mb-2">Company Density</div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: "#bae6fd" }} />
          <span>1-10</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: "#38bdf8" }} />
          <span>10-100</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: "#0284c7" }} />
          <span>100-1000</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: "#0369a1" }} />
          <span>1000+</span>
        </div>
      </div>
    </div>
  );
}
