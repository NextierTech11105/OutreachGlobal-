"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * REDIRECT: /assess is now consolidated to /lead-lab
 * Lead assessment functionality is available at Lead Lab.
 */
export default function AssessRedirect() {
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
