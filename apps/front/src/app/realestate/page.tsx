"use client";

import { RealEstateAPIExplorer } from "@/features/property/components/realestate-api-explorer";

export default function RealEstatePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-white">
        <div className="container max-w-7xl py-4">
          <h1 className="text-3xl font-bold">RealEstate API Explorer</h1>
          <p className="text-muted-foreground mt-1">Search properties, save searches, and track signals over time</p>
        </div>
      </div>
      <div className="container max-w-7xl py-6">
        <RealEstateAPIExplorer />
      </div>
    </div>
  );
}
