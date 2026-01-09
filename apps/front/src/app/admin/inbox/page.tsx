"use client";

import { redirect } from "next/navigation";

// Redirect to inbound-processing which is the actual inbox
export default function InboxRedirectPage() {
  redirect("/admin/inbound-processing");
}
