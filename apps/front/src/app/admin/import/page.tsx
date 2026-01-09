"use client";

import { redirect } from "next/navigation";

// Redirect to data/import which is the actual import page
export default function ImportRedirectPage() {
  redirect("/admin/data/import");
}
