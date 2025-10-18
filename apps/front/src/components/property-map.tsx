"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

interface PropertyMapProps {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType?: string | null;
  compact?: boolean;
  fullscreen?: boolean;
}

export function PropertyMap({
  address,
  city,
  state,
  zipCode,
  propertyType,
  compact = false,
  fullscreen = false,
}: PropertyMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;

  useEffect(() => {
    const fetchMapImage = async () => {
      try {
        setIsLoading(true);

        // Use our secure server-side API to get a map image
        const response = await fetch(
          `/api/map-image?address=${encodeURIComponent(fullAddress)}&type=${propertyType || "Residential"}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load map image");
        }

        const data = await response.json();
        setMapImageUrl(data.imageUrl);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading map:", err);
        setError("Unable to load property map");
        setIsLoading(false);
      }
    };

    fetchMapImage();
  }, [fullAddress, propertyType]);

  if (fullscreen) {
    return (
      <div className="relative h-full w-full">
        {error ? (
          <div className="flex items-center justify-center h-full bg-muted/50 p-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                Unable to load the map for this address.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Please check the address or try again later.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="h-full w-full">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <div className="h-full w-full relative">
            <img
              src={
                mapImageUrl ||
                `/placeholder.svg?height=600&width=800&query=map of ${encodeURIComponent(fullAddress)}`
              }
              alt={`Map of ${fullAddress}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md">
              <h3 className="font-medium text-sm">{fullAddress}</h3>
              <p className="text-xs text-muted-foreground">
                {propertyType} Property
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="h-full w-full">
        {error ? (
          <div className="flex items-center justify-center h-full bg-muted/50 p-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                Unable to load the map for this address.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Please check the address or try again later.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="h-full w-full">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <img
            src={
              mapImageUrl ||
              `/placeholder.svg?height=300&width=400&query=map of ${encodeURIComponent(fullAddress)}`
            }
            alt={`Map of ${fullAddress}`}
            className="h-full w-full object-cover"
          />
        )}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Property Location
        </CardTitle>
        <CardDescription>{fullAddress}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <div className="flex items-center justify-center h-[300px] bg-muted/50 p-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                Unable to load the map for this address.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Please check the address or try again later.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="h-[300px] w-full">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <img
            src={
              mapImageUrl ||
              `/placeholder.svg?height=300&width=600&query=map of ${encodeURIComponent(fullAddress)}`
            }
            alt={`Map of ${fullAddress}`}
            className="h-[300px] w-full object-cover"
          />
        )}
      </CardContent>
    </Card>
  );
}
