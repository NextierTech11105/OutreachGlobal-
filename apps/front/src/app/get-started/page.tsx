"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * REDIRECT: Get Started is now at /onboarding
 * New users are directed to the unified onboarding flow.
 */
export default function GetStartedRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-zinc-400">Redirecting to Onboarding...</p>
      </div>
    </div>
  );
}
