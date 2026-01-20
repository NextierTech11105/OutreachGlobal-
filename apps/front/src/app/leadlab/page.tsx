"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * REDIRECT: /leadlab is now consolidated to /lead-lab
 * Both provide the same Lead Lab assessment functionality.
 */
export default function LeadLabRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/lead-lab");
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-zinc-400">Redirecting to Lead Lab...</p>
      </div>
    </div>
  );
}
