"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

/**
 * REDIRECT: Instant Outreach is now at workspaces/initial-message
 * The GIANNA workspace handles all outreach functionality.
 */
export default function InstantOutreachRedirect() {
  const router = useRouter();
  const params = useParams();
  const team = params.team as string;

  useEffect(() => {
    router.replace(`/t/${team}/workspaces/initial-message`);
  }, [router, team]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-zinc-400">Redirecting to Workspaces...</p>
      </div>
    </div>
  );
}
