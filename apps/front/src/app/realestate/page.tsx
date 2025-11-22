"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function RealEstatePage() {
  useEffect(() => {
    // Redirect to home page to select team
    window.location.href = "/";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Redirecting...</h1>
        <p className="text-muted-foreground mt-2">Please select your team</p>
      </div>
    </div>
  );
}
