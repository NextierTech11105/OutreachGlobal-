"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

/**
 * REDIRECT: This page has been consolidated into /t/[team]/import
 * All import functionality is now in one place.
 */
export default function LuciImportRedirect() {
  const router = useRouter();
  const params = useParams();
  const team = params.team as string;

  useEffect(() => {
    // Redirect to unified import page
    router.replace(`/t/${team}/import`);
  }, [router, team]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-zinc-400">Redirecting to Import...</p>
      </div>
    </div>
  );
}
