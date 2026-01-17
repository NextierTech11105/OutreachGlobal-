"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TRIAL BANNER COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════
 * Shows a banner at the top of the app during trial period.
 * Becomes more urgent as trial expiration approaches.
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface TrialBannerProps {
  daysRemaining: number;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function TrialBanner({
  daysRemaining,
  onUpgrade,
  onDismiss,
  className,
}: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Determine urgency level
  const isUrgent = daysRemaining <= 3;
  const isCritical = daysRemaining <= 1;

  // Don't show if dismissed (per session)
  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = "/upgrade";
    }
  };

  return (
    <div
      className={cn(
        "w-full px-4 py-2 flex items-center justify-between text-sm",
        isCritical
          ? "bg-red-500 text-white"
          : isUrgent
          ? "bg-orange-500 text-white"
          : "bg-blue-500 text-white",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isCritical ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
        <span>
          {daysRemaining === 0 ? (
            <>Your trial expires today!</>
          ) : daysRemaining === 1 ? (
            <>Your trial expires tomorrow!</>
          ) : (
            <>
              <strong>{daysRemaining} days</strong> left in your trial
            </>
          )}
        </span>
        <Badge
          variant="secondary"
          className={cn(
            "ml-2",
            isCritical
              ? "bg-red-100 text-red-700"
              : isUrgent
              ? "bg-orange-100 text-orange-700"
              : "bg-blue-100 text-blue-700"
          )}
        >
          Free Trial
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isCritical ? "destructive" : "secondary"}
          onClick={handleUpgrade}
          className={cn(
            isCritical
              ? "bg-white text-red-600 hover:bg-red-50"
              : isUrgent
              ? "bg-white text-orange-600 hover:bg-orange-50"
              : "bg-white text-blue-600 hover:bg-blue-50"
          )}
        >
          <Zap className="mr-1 h-3 w-3" />
          Upgrade Now
        </Button>
        {!isCritical && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to fetch and manage trial status
 */
export function useTrialStatus() {
  const [status, setStatus] = useState<{
    loading: boolean;
    hasSubscription: boolean;
    isTrialing: boolean;
    isExpired: boolean;
    isActive: boolean;
    daysRemaining: number;
    canAccessFeatures: boolean;
    needsUpgrade: boolean;
    plan: { id: string; slug: string; name: string } | null;
  }>({
    loading: true,
    hasSubscription: false,
    isTrialing: false,
    isExpired: false,
    isActive: false,
    daysRemaining: 0,
    canAccessFeatures: true, // Default to true to prevent flash
    needsUpgrade: false,
    plan: null,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        const response = await fetch("/api/subscription/status");
        if (response.ok) {
          const data = await response.json();
          if (mounted) {
            setStatus({
              loading: false,
              ...data,
            });
          }
        } else {
          if (mounted) {
            setStatus((prev) => ({ ...prev, loading: false }));
          }
        }
      } catch (error) {
        console.error("[useTrialStatus] Error:", error);
        if (mounted) {
          setStatus((prev) => ({ ...prev, loading: false }));
        }
      }
    }

    fetchStatus();

    return () => {
      mounted = false;
    };
  }, []);

  return status;
}
