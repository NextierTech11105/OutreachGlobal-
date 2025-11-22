"use client";

import { RealEstateAPIExplorer } from "@/features/property/components/realestate-api-explorer";

export default function RealEstateAPIPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">RealEstate API Explorer</h1>
      </div>
      <RealEstateAPIExplorer />
    </div>
  );
}
