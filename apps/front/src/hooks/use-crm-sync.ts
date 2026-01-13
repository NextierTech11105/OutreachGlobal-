/**
 * USE CRM SYNC HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 * React hook for automatic CRM synchronization
 * Use this in any SMS page to sync activities back to the customer's CRM
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect } from "react";
import { useCurrentTeam } from "@/features/team/team.context";
import type {
  CRMActivity,
  CRMSyncResult,
  CRMProvider,
} from "@/lib/crm/unified-crm-service";

export interface CRMSyncState {
  enabled: boolean;
  provider: CRMProvider | null;
  hasCredentials: boolean;
  isLoading: boolean;
  lastSyncResult: CRMSyncResult | null;
}

export interface UseCRMSyncReturn {
  state: CRMSyncState;
  logSmsSent: (params: {
    leadId: string;
    crmRecordId?: string;
    message: string;
    phone: string;
    workerName?: string;
  }) => Promise<CRMSyncResult | null>;
  logSmsReceived: (params: {
    leadId: string;
    crmRecordId?: string;
    message: string;
    phone: string;
  }) => Promise<CRMSyncResult | null>;
  logCall: (params: {
    leadId: string;
    crmRecordId?: string;
    duration: number;
    outcome: string;
    notes?: string;
  }) => Promise<CRMSyncResult | null>;
  logActivity: (activity: CRMActivity) => Promise<CRMSyncResult | null>;
  refresh: () => Promise<void>;
}

export function useCRMSync(): UseCRMSyncReturn {
  const { teamId, isTeamReady } = useCurrentTeam();

  const [state, setState] = useState<CRMSyncState>({
    enabled: false,
    provider: null,
    hasCredentials: false,
    isLoading: true,
    lastSyncResult: null,
  });

  // Fetch CRM config on mount
  const fetchConfig = useCallback(async () => {
    if (!teamId || !isTeamReady) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/integrations/crm?teamId=${teamId}`);
      if (response.ok) {
        const data = await response.json();
        setState({
          enabled: data.enabled,
          provider: data.provider,
          hasCredentials: data.hasCredentials,
          isLoading: false,
          lastSyncResult: null,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error("[useCRMSync] Error fetching config:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [teamId, isTeamReady]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Generic activity sync
  const logActivity = useCallback(
    async (activity: CRMActivity): Promise<CRMSyncResult | null> => {
      if (!state.enabled || !teamId) return null;

      try {
        const response = await fetch("/api/integrations/crm", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, activity }),
        });

        const result = await response.json();
        setState((prev) => ({ ...prev, lastSyncResult: result }));
        return result;
      } catch (error) {
        console.error("[useCRMSync] Error syncing activity:", error);
        const errorResult: CRMSyncResult = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          synced: 0,
          failed: 1,
        };
        setState((prev) => ({ ...prev, lastSyncResult: errorResult }));
        return errorResult;
      }
    },
    [state.enabled, teamId],
  );

  // Log outbound SMS
  const logSmsSent = useCallback(
    async (params: {
      leadId: string;
      crmRecordId?: string;
      message: string;
      phone: string;
      workerName?: string;
    }): Promise<CRMSyncResult | null> => {
      return logActivity({
        type: "sms_sent",
        subject: `SMS Sent${params.workerName ? ` by ${params.workerName}` : ""}`,
        body: params.message,
        leadId: params.leadId,
        crmRecordId: params.crmRecordId,
        timestamp: new Date(),
        metadata: {
          phone: params.phone,
          worker: params.workerName,
          platform: "NEXTIER",
          direction: "outbound",
        },
      });
    },
    [logActivity],
  );

  // Log inbound SMS
  const logSmsReceived = useCallback(
    async (params: {
      leadId: string;
      crmRecordId?: string;
      message: string;
      phone: string;
    }): Promise<CRMSyncResult | null> => {
      return logActivity({
        type: "sms_received",
        subject: "SMS Received",
        body: params.message,
        leadId: params.leadId,
        crmRecordId: params.crmRecordId,
        timestamp: new Date(),
        metadata: {
          phone: params.phone,
          platform: "NEXTIER",
          direction: "inbound",
        },
      });
    },
    [logActivity],
  );

  // Log call activity
  const logCall = useCallback(
    async (params: {
      leadId: string;
      crmRecordId?: string;
      duration: number;
      outcome: string;
      notes?: string;
    }): Promise<CRMSyncResult | null> => {
      return logActivity({
        type: "call",
        subject: `Call - ${params.outcome}`,
        body: `Duration: ${Math.floor(params.duration / 60)}m ${params.duration % 60}s\nOutcome: ${params.outcome}${params.notes ? `\n\nNotes:\n${params.notes}` : ""}`,
        leadId: params.leadId,
        crmRecordId: params.crmRecordId,
        timestamp: new Date(),
        metadata: {
          duration: params.duration,
          outcome: params.outcome,
          platform: "NEXTIER",
        },
      });
    },
    [logActivity],
  );

  return {
    state,
    logSmsSent,
    logSmsReceived,
    logCall,
    logActivity,
    refresh: fetchConfig,
  };
}

/**
 * CRM Provider display names
 */
export const CRM_PROVIDER_NAMES: Record<CRMProvider, string> = {
  zoho: "Zoho CRM",
  salesforce: "Salesforce",
  hubspot: "HubSpot",
  gohighlevel: "GoHighLevel",
  pipedrive: "Pipedrive",
  monday: "Monday.com",
  custom_webhook: "Custom Webhook",
};

/**
 * CRM Provider logos/icons
 */
export const CRM_PROVIDER_COLORS: Record<CRMProvider, string> = {
  zoho: "#E42527",
  salesforce: "#00A1E0",
  hubspot: "#FF7A59",
  gohighlevel: "#4CAF50",
  pipedrive: "#1A1F36",
  monday: "#FF3D57",
  custom_webhook: "#6366F1",
};
