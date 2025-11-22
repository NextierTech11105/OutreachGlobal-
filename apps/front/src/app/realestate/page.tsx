"use client";

import { RealEstateAPIExplorer } from "@/features/property/components/realestate-api-explorer";

export default function RealEstatePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container max-w-7xl py-4">
          <h1 className="text-2xl font-bold">RealEstate API Explorer</h1>
        </div>
      </div>
      <div className="container max-w-7xl py-6">
        <RealEstateAPIExplorer />
      </div>
    </div>
  );
}
