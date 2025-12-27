"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Building2, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface ImpersonationContext {
  targetUserId: string;
  targetUserName: string;
  targetUserEmail: string;
  targetTeamId: string;
  targetTeamName: string;
  targetTeamSlug: string;
  adminUserId: string;
  startedAt: string;
}

export function ImpersonationBanner() {
  const router = useRouter();
  const [impersonation, setImpersonation] =
    useState<ImpersonationContext | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Check for impersonation cookie
    const checkImpersonation = () => {
      try {
        const cookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("nextier_impersonation="));

        if (cookie) {
          const value = decodeURIComponent(cookie.split("=")[1]);
          const parsed = JSON.parse(value) as ImpersonationContext;
          setImpersonation(parsed);
        } else {
          setImpersonation(null);
        }
      } catch (error) {
        console.error("Failed to parse impersonation cookie:", error);
        setImpersonation(null);
      }
    };

    checkImpersonation();

    // Re-check periodically in case it changes
    const interval = setInterval(checkImpersonation, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleExit = async () => {
    setIsExiting(true);
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        // Clear cookie client-side as well
        document.cookie = "nextier_impersonation=; path=/; max-age=0";
        setImpersonation(null);

        // Redirect to admin
        window.location.href = data.redirectTo || "/admin/companies";
      } else {
        alert(data.error || "Failed to exit impersonation");
      }
    } catch (error) {
      console.error("Failed to exit impersonation:", error);
      alert("Failed to exit impersonation");
    } finally {
      setIsExiting(false);
    }
  };

  if (!impersonation) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-400 text-yellow-900 py-2 px-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-medium">
          <Building2 className="h-4 w-4" />
          <span>Viewing as:</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold">{impersonation.targetTeamName}</span>
          <span className="text-yellow-700">•</span>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{impersonation.targetUserName}</span>
            <span className="text-yellow-700 text-sm">
              ({impersonation.targetUserEmail})
            </span>
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExit}
        disabled={isExiting}
        className="bg-yellow-900 text-yellow-100 border-yellow-900 hover:bg-yellow-800 hover:text-yellow-50"
      >
        <LogOut className="h-4 w-4 mr-2" />
        {isExiting ? "Exiting..." : "Exit Impersonation"}
      </Button>
    </div>
  );
}

/**
 * Hook to check if currently impersonating
 */
export function useImpersonation() {
  const [impersonation, setImpersonation] =
    useState<ImpersonationContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkImpersonation = async () => {
      try {
        const response = await fetch("/api/admin/impersonate");
        const data = await response.json();

        if (data.isImpersonating) {
          setImpersonation(data.impersonation);
        } else {
          setImpersonation(null);
        }
      } catch (error) {
        console.error("Failed to check impersonation:", error);
        setImpersonation(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkImpersonation();
  }, []);

  return {
    isImpersonating: !!impersonation,
    impersonation,
    isLoading,
  };
}
