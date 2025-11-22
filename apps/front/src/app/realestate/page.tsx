"use client";

import { RealEstateAPIExplorer } from "@/features/property/components/realestate-api-explorer";
import { redirect } from "next/navigation";

export default function RealEstatePage() {
  // Redirect to team-based route
  redirect("/t/test/realestate-api");
}
