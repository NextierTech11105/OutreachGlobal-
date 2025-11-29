"use client";

import { useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  MarkerClusterer,
  Circle,
  DrawingManager,
  InfoWindow,
} from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Trash2, Search, Layers } from "lucide-react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const libraries: ("drawing" | "places" | "geometry")[] = ["drawing", "places", "geometry"];

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "500px",
};

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795, // Center of US
};

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

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
  properties?: PropertyMarker[];
  onSearchArea?: (bounds: { lat: number; lng: number; radius: number }) => void;
  onPropertyClick?: (property: PropertyMarker) => void;
  onPropertiesInBounds?: (propertyIds: string[]) => void;
  loading?: boolean;
}

export function PropertyMap({
  properties = [],
  onSearchArea,
  onPropertyClick,
  onPropertiesInBounds,
  loading = false,
}: PropertyMapProps) {
  const [selectedProperty, setSelectedProperty] = useState<PropertyMarker | null>(null);
  const [searchCircle, setSearchCircle] = useState<{ center: google.maps.LatLng; radius: number } | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid">("roadmap");
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleCircleComplete = useCallback(
    (circle: google.maps.Circle) => {
      // Clear previous circle
      if (searchCircle) {
        circle.setMap(null);
      }

      const center = circle.getCenter();
      const radius = circle.getRadius();

      if (center && radius) {
        setSearchCircle({ center, radius });

        // Convert radius from meters to miles
        const radiusMiles = radius / 1609.34;

        onSearchArea?.({
          lat: center.lat(),
          lng: center.lng(),
          radius: radiusMiles,
        });
      }

      // Remove the drawn circle (we'll render our own controlled one)
      circle.setMap(null);
    },
    [searchCircle, onSearchArea]
  );

  const clearSearch = useCallback(() => {
    setSearchCircle(null);
  }, []);

  const handleMarkerClick = useCallback(
    (property: PropertyMarker) => {
      setSelectedProperty(property);
      onPropertyClick?.(property);
    },
    [onPropertyClick]
  );

  const toggleMapType = useCallback(() => {
    setMapType((prev) => {
      if (prev === "roadmap") return "satellite";
      if (prev === "satellite") return "hybrid";
      return "roadmap";
    });
  }, []);

  if (loadError) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <CardContent>
          <p className="text-destructive">Error loading Google Maps</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your API key configuration
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <CardContent className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading map...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={toggleMapType}
          className="bg-background/90 backdrop-blur"
        >
          <Layers className="h-4 w-4 mr-2" />
          {mapType === "roadmap" ? "Satellite" : mapType === "satellite" ? "Hybrid" : "Map"}
        </Button>

        {searchCircle && (
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
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="secondary" className="bg-background/90 backdrop-blur text-lg px-4 py-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <MapPin className="h-4 w-4 mr-2" />
          )}
          {properties.length.toLocaleString()} Properties
        </Badge>
      </div>

      {/* Draw Instructions */}
      {!searchCircle && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-primary text-primary-foreground px-4 py-2">
            <Search className="h-4 w-4 mr-2" />
            Draw a circle on the map to search properties in that area
          </Badge>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={4}
        onLoad={onMapLoad}
        mapTypeId={mapType}
        options={{
          styles: darkMapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: true,
          fullscreenControl: true,
        }}
      >
        {/* Drawing Manager for Circle */}
        {typeof google !== "undefined" && (
          <DrawingManager
            onCircleComplete={handleCircleComplete}
            options={{
              drawingControl: true,
              drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.CIRCLE],
              },
              circleOptions: {
                fillColor: "#22c55e",
                fillOpacity: 0.2,
                strokeColor: "#22c55e",
                strokeWeight: 2,
                editable: true,
                draggable: true,
              },
            }}
          />
        )}

        {/* Search Circle */}
        {searchCircle && (
          <Circle
            center={searchCircle.center}
            radius={searchCircle.radius}
            options={{
              fillColor: "#22c55e",
              fillOpacity: 0.15,
              strokeColor: "#22c55e",
              strokeWeight: 2,
            }}
          />
        )}

        {/* Property Markers with Clustering */}
        <MarkerClusterer
          options={{
            imagePath: "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
            maxZoom: 15,
            minimumClusterSize: 5,
          }}
        >
          {(clusterer) => (
            <>
              {properties.map((property) => (
                <Marker
                  key={property.id}
                  position={{ lat: property.lat, lng: property.lng }}
                  clusterer={clusterer}
                  onClick={() => handleMarkerClick(property)}
                  icon={typeof google !== "undefined" ? {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: property.equity && property.equity > 100000 ? "#22c55e" : "#3b82f6",
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 2,
                  } : undefined}
                />
              ))}
            </>
          )}
        </MarkerClusterer>

        {/* Info Window for Selected Property */}
        {selectedProperty && (
          <InfoWindow
            position={{ lat: selectedProperty.lat, lng: selectedProperty.lng }}
            onCloseClick={() => setSelectedProperty(null)}
          >
            <div className="p-2 min-w-[200px] text-black">
              <h3 className="font-bold text-sm">{selectedProperty.address}</h3>
              <p className="text-xs text-gray-600">
                {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                <span className="font-medium">Type:</span>
                <span>{selectedProperty.propertyType}</span>
                {selectedProperty.beds && (
                  <>
                    <span className="font-medium">Beds/Baths:</span>
                    <span>
                      {selectedProperty.beds}/{selectedProperty.baths}
                    </span>
                  </>
                )}
                {selectedProperty.sqft && (
                  <>
                    <span className="font-medium">Sqft:</span>
                    <span>{selectedProperty.sqft.toLocaleString()}</span>
                  </>
                )}
                {selectedProperty.estimatedValue && (
                  <>
                    <span className="font-medium">Value:</span>
                    <span>${selectedProperty.estimatedValue.toLocaleString()}</span>
                  </>
                )}
                {selectedProperty.equity && (
                  <>
                    <span className="font-medium">Equity:</span>
                    <span className="text-green-600 font-bold">
                      ${selectedProperty.equity.toLocaleString()}
                    </span>
                  </>
                )}
                {selectedProperty.ownerName && (
                  <>
                    <span className="font-medium">Owner:</span>
                    <span>{selectedProperty.ownerName}</span>
                  </>
                )}
              </div>
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={() => onPropertyClick?.(selectedProperty)}
              >
                View Details
              </Button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
