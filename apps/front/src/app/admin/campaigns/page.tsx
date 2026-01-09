"use client";

import { redirect } from "next/navigation";

// Redirect to campaign-builder which is the main campaigns interface
export default function CampaignsRedirectPage() {
  redirect("/admin/campaign-builder");
}
