"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * REDIRECT: This page has been consolidated.
 * Redirects to /t/default/import - users will be redirected to their team.
 */
export default function DataImportRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to team selector or default import
    router.replace("/t");
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-zinc-400">Redirecting...</p>
      </div>
    </div>
  );
}
