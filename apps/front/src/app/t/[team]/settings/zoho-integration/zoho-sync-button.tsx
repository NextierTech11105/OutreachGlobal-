"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function ZohoSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // TODO: Implement actual Zoho sync API call
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulated delay
      toast.success("Zoho sync completed successfully");
    } catch (error) {
      toast.error("Zoho sync failed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
      <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
    </Button>
  );
}
