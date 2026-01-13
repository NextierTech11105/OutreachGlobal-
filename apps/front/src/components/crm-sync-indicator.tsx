"use client";

import {
  CheckCircle,
  XCircle,
  Loader2,
  Link2,
  Link2Off,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useCRMSync,
  CRM_PROVIDER_NAMES,
  CRM_PROVIDER_COLORS,
} from "@/hooks/use-crm-sync";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCurrentTeam } from "@/features/team/team.context";

/**
 * CRM SYNC INDICATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 * Shows CRM integration status on any SMS page
 * - Connected/Disconnected state
 * - Last sync result
 * - Quick link to CRM settings
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface CRMSyncIndicatorProps {
  variant?: "badge" | "compact" | "full";
  className?: string;
  showSettings?: boolean;
}

export function CRMSyncIndicator({
  variant = "badge",
  className,
  showSettings = true,
}: CRMSyncIndicatorProps) {
  const { state } = useCRMSync();
  const { team } = useCurrentTeam();

  // Loading state
  if (state.isLoading) {
    return (
      <Badge variant="outline" className={cn("gap-1.5", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Checking CRM...</span>
      </Badge>
    );
  }

  // Not connected
  if (!state.enabled || !state.provider) {
    if (variant === "compact") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn("gap-1 opacity-50", className)}
              >
                <Link2Off className="h-3 w-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>No CRM connected</p>
              {showSettings && (
                <Link
                  href={`/t/${team?.slug}/settings/integrations`}
                  className="text-xs text-primary hover:underline"
                >
                  Connect your CRM →
                </Link>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
          <Link2Off className="h-3 w-3" />
          <span className="text-xs">No CRM</span>
        </Badge>
        {showSettings && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-6 px-2 text-xs"
          >
            <Link href={`/t/${team?.slug}/settings/integrations`}>
              <Settings className="h-3 w-3 mr-1" />
              Connect
            </Link>
          </Button>
        )}
      </div>
    );
  }

  // Connected - render based on variant
  const providerName = CRM_PROVIDER_NAMES[state.provider];
  const providerColor = CRM_PROVIDER_COLORS[state.provider];

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn("gap-1", className)}
              style={{ borderColor: providerColor, color: providerColor }}
            >
              <Link2 className="h-3 w-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">Connected to {providerName}</p>
              {state.lastSyncResult && (
                <p className="text-xs">
                  Last sync: {state.lastSyncResult.success ? "✓" : "✗"}{" "}
                  {state.lastSyncResult.synced} synced
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "badge") {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1.5", className)}
        style={{ borderColor: providerColor, color: providerColor }}
      >
        <Link2 className="h-3 w-3" />
        <span className="text-xs">{providerName}</span>
        {state.lastSyncResult &&
          (state.lastSyncResult.success ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <XCircle className="h-3 w-3 text-red-500" />
          ))}
      </Badge>
    );
  }

  // Full variant
  return (
    <div className={cn("p-3 rounded-lg border bg-muted/30", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: providerColor }}
          />
          <span className="font-medium text-sm">{providerName}</span>
          <Badge variant="secondary" className="text-xs">
            Connected
          </Badge>
        </div>
        {showSettings && (
          <Button variant="ghost" size="sm" asChild className="h-7">
            <Link href={`/t/${team?.slug}/settings/integrations`}>
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {state.lastSyncResult && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          {state.lastSyncResult.success ? (
            <>
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Activity synced to CRM</span>
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 text-red-500" />
              <span>Sync failed: {state.lastSyncResult.error}</span>
            </>
          )}
        </div>
      )}

      <div className="mt-2 text-xs text-muted-foreground">
        SMS activities automatically sync to your CRM
      </div>
    </div>
  );
}

/**
 * CRM SYNC STATUS
 * Minimal status indicator for message forms
 */
export function CRMSyncStatus({ className }: { className?: string }) {
  const { state } = useCRMSync();

  if (!state.enabled) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <Link2 className="h-3 w-3" />
      <span>
        Syncing to {state.provider ? CRM_PROVIDER_NAMES[state.provider] : "CRM"}
      </span>
    </div>
  );
}
