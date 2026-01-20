"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

/**
 * REDIRECT: GIANNA campaigns are now at workspaces/initial-message
 * The Initial Message Workspace handles all GIANNA AI functionality.
 */
export default function GiannaCampaignRedirect() {
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
        <p className="text-zinc-400">Redirecting to GIANNA Workspace...</p>
      </div>
    </div>
  );
}
