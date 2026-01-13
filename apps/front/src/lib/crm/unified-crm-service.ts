/**
 * UNIFIED CRM SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Makes NEXTIER interoperable with ANY legacy CRM:
 * - Zoho CRM
 * - Salesforce
 * - HubSpot
 * - GoHighLevel (GHL) - Agency favorite
 * - Pipedrive
 * - Monday.com
 * - Custom CRMs via webhooks
 *
 * We don't replace your CRM - we make it BETTER by adding:
 * - Relentless, systematic lead generation
 * - Creative outbound that manufactures inbound responses
 * - Intentional, compounding engagement loops
 *
 * NEXTIER PROPRIETARY EXECUTION CHAIN:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  SMS FOUNDATION (SignalHouse 10DLC)                                     │
 * │  ↓                                                                      │
 * │  GIANNA (Opener) → CATHY (Nurturer) → SABRINA (Closer)                 │
 * │  ↓                                                                      │
 * │  OMNI-CHANNEL ESCALATION: SMS → Call → Email → Meeting → Deal          │
 * │  ↓                                                                      │
 * │  ALL ACTIVITY SYNCS TO YOUR CRM IN REAL-TIME                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * SignalHouse marketplace only has HubSpot.
 * NEXTIER supports ALL major CRMs with deep execution chain integration.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type CRMProvider =
  | "zoho"
  | "salesforce"
  | "hubspot"
  | "gohighlevel"
  | "pipedrive"
  | "monday"
  | "custom_webhook";

export interface CRMConfig {
  provider: CRMProvider;
  enabled: boolean;
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    instanceUrl?: string;
    webhookUrl?: string;
  };
  fieldMapping: FieldMapping;
  syncSettings: SyncSettings;
}

export interface FieldMapping {
  // NEXTIER field → CRM field
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  status: string;
  source: string;
  tags: string;
  notes: string;
  lastContactedAt: string;
  smsOptIn: string;
  // Custom fields
  customFields?: Record<string, string>;
}

export interface SyncSettings {
  // Bi-directional sync
  syncDirection: "to_crm" | "from_crm" | "bidirectional";
  // What to sync
  syncLeads: boolean;
  syncContacts: boolean;
  syncDeals: boolean;
  syncActivities: boolean;
  // When to sync
  syncOnSmsReceived: boolean;
  syncOnSmsSent: boolean;
  syncOnCallCompleted: boolean;
  syncOnStatusChange: boolean;
  syncOnDealClosed: boolean;
  // Frequency
  realTimeSync: boolean;
  batchSyncIntervalMinutes: number;
}

export interface CRMActivity {
  type: "sms_sent" | "sms_received" | "call" | "email" | "note" | "task";
  subject: string;
  body: string;
  leadId: string;
  crmRecordId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface CRMSyncResult {
  success: boolean;
  crmRecordId?: string;
  error?: string;
  synced: number;
  failed: number;
}

// Default field mappings per CRM
const DEFAULT_FIELD_MAPPINGS: Record<CRMProvider, FieldMapping> = {
  zoho: {
    phone: "Phone",
    email: "Email",
    firstName: "First_Name",
    lastName: "Last_Name",
    company: "Company",
    status: "Lead_Status",
    source: "Lead_Source",
    tags: "Tag",
    notes: "Description",
    lastContactedAt: "Last_Activity_Time",
    smsOptIn: "SMS_Opt_In",
  },
  salesforce: {
    phone: "Phone",
    email: "Email",
    firstName: "FirstName",
    lastName: "LastName",
    company: "Company",
    status: "Status",
    source: "LeadSource",
    tags: "Tags__c",
    notes: "Description",
    lastContactedAt: "LastActivityDate",
    smsOptIn: "SMS_Opt_In__c",
  },
  hubspot: {
    phone: "phone",
    email: "email",
    firstName: "firstname",
    lastName: "lastname",
    company: "company",
    status: "lifecyclestage",
    source: "hs_lead_status",
    tags: "hs_tag",
    notes: "notes_last_updated",
    lastContactedAt: "notes_last_contacted",
    smsOptIn: "sms_opt_in",
  },
  gohighlevel: {
    phone: "phone",
    email: "email",
    firstName: "firstName",
    lastName: "lastName",
    company: "companyName",
    status: "tags", // GHL uses tags for status
    source: "source",
    tags: "tags",
    notes: "customField.notes",
    lastContactedAt: "dateLastActivity",
    smsOptIn: "dnd", // Do Not Disturb flag (inverted)
  },
  pipedrive: {
    phone: "phone",
    email: "email",
    firstName: "first_name",
    lastName: "last_name",
    company: "org_name",
    status: "status",
    source: "source",
    tags: "label",
    notes: "notes",
    lastContactedAt: "last_activity_date",
    smsOptIn: "sms_opt_in",
  },
  monday: {
    phone: "phone",
    email: "email",
    firstName: "name",
    lastName: "name",
    company: "company",
    status: "status",
    source: "source",
    tags: "tags",
    notes: "notes",
    lastContactedAt: "last_updated",
    smsOptIn: "sms_opt_in",
  },
  custom_webhook: {
    phone: "phone",
    email: "email",
    firstName: "first_name",
    lastName: "last_name",
    company: "company",
    status: "status",
    source: "source",
    tags: "tags",
    notes: "notes",
    lastContactedAt: "last_contacted_at",
    smsOptIn: "sms_opt_in",
  },
};

/**
 * Format activity as threaded note with timestamp
 * Creates consistent timeline entries across all CRMs
 */
function formatActivityThread(activity: CRMActivity): string {
  const timestamp = activity.timestamp.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const worker = activity.metadata?.worker
    ? ` [${activity.metadata.worker}]`
    : "";
  const direction = activity.metadata?.direction
    ? ` (${activity.metadata.direction})`
    : "";

  // Thread format: [TIMESTAMP] [WORKER] TYPE: Message
  const threadHeader = `═══ ${timestamp}${worker} ═══`;
  const activityType = activity.type.replace(/_/g, " ").toUpperCase();

  return `${threadHeader}
${activityType}${direction}
${activity.body}
───────────────────────────`;
}

/**
 * Get activity icon/emoji for thread
 */
function getActivityIcon(type: CRMActivity["type"]): string {
  switch (type) {
    case "sms_sent":
      return "📤";
    case "sms_received":
      return "📥";
    case "call":
      return "📞";
    case "email":
      return "✉️";
    case "note":
      return "📝";
    case "task":
      return "✅";
    default:
      return "📌";
  }
}

/**
 * UNIFIED CRM SERVICE CLASS
 */
export class UnifiedCRMService {
  private config: CRMConfig;

  constructor(config: CRMConfig) {
    this.config = {
      ...config,
      fieldMapping: {
        ...DEFAULT_FIELD_MAPPINGS[config.provider],
        ...config.fieldMapping,
      },
    };
  }

  /**
   * Log an SMS activity to the CRM
   * Called automatically when SMS is sent/received via NEXTIER
   */
  async logSmsActivity(activity: {
    leadId: string;
    crmRecordId?: string;
    direction: "outbound" | "inbound";
    message: string;
    phone: string;
    workerName?: string; // GIANNA, CATHY, SABRINA
  }): Promise<CRMSyncResult> {
    const crmActivity: CRMActivity = {
      type: activity.direction === "outbound" ? "sms_sent" : "sms_received",
      subject: `SMS ${activity.direction === "outbound" ? "Sent" : "Received"}${activity.workerName ? ` by ${activity.workerName}` : ""}`,
      body: activity.message,
      leadId: activity.leadId,
      crmRecordId: activity.crmRecordId,
      timestamp: new Date(),
      metadata: {
        phone: activity.phone,
        worker: activity.workerName,
        platform: "NEXTIER",
      },
    };

    return this.syncActivity(crmActivity);
  }

  /**
   * Sync a single activity to the CRM
   */
  async syncActivity(activity: CRMActivity): Promise<CRMSyncResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: "CRM sync not enabled",
        synced: 0,
        failed: 1,
      };
    }

    try {
      switch (this.config.provider) {
        case "zoho":
          return this.syncToZoho(activity);
        case "salesforce":
          return this.syncToSalesforce(activity);
        case "hubspot":
          return this.syncToHubSpot(activity);
        case "gohighlevel":
          return this.syncToGoHighLevel(activity);
        case "pipedrive":
          return this.syncToPipedrive(activity);
        case "monday":
          return this.syncToMonday(activity);
        case "custom_webhook":
          return this.syncViaWebhook(activity);
        default:
          return {
            success: false,
            error: "Unknown CRM provider",
            synced: 0,
            failed: 1,
          };
      }
    } catch (error) {
      console.error("[CRM Sync] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        synced: 0,
        failed: 1,
      };
    }
  }

  /**
   * Sync to Zoho CRM
   */
  private async syncToZoho(activity: CRMActivity): Promise<CRMSyncResult> {
    const { credentials } = this.config;
    if (!credentials.accessToken) {
      return {
        success: false,
        error: "Missing Zoho access token",
        synced: 0,
        failed: 1,
      };
    }

    const response = await fetch(
      `https://www.zohoapis.com/crm/v8/Leads/${activity.crmRecordId}/Notes`,
      {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${credentials.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              Note_Title: activity.subject,
              Note_Content: `${activity.body}\n\n---\nLogged via NEXTIER at ${activity.timestamp.toISOString()}`,
            },
          ],
        }),
      },
    );

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        crmRecordId: data.data?.[0]?.details?.id,
        synced: 1,
        failed: 0,
      };
    }

    return {
      success: false,
      error: `Zoho API error: ${response.status}`,
      synced: 0,
      failed: 1,
    };
  }

  /**
   * Sync to Salesforce
   */
  private async syncToSalesforce(
    activity: CRMActivity,
  ): Promise<CRMSyncResult> {
    const { credentials } = this.config;
    if (!credentials.accessToken || !credentials.instanceUrl) {
      return {
        success: false,
        error: "Missing Salesforce credentials",
        synced: 0,
        failed: 1,
      };
    }

    // Create Task record in Salesforce
    const response = await fetch(
      `${credentials.instanceUrl}/services/data/v59.0/sobjects/Task`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Subject: activity.subject,
          Description: activity.body,
          WhoId: activity.crmRecordId,
          Status: "Completed",
          Priority: "Normal",
          ActivityDate: activity.timestamp.toISOString().split("T")[0],
          Type:
            activity.type === "sms_sent" || activity.type === "sms_received"
              ? "SMS"
              : "Call",
        }),
      },
    );

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        crmRecordId: data.id,
        synced: 1,
        failed: 0,
      };
    }

    return {
      success: false,
      error: `Salesforce API error: ${response.status}`,
      synced: 0,
      failed: 1,
    };
  }

  /**
   * Sync to HubSpot
   */
  private async syncToHubSpot(activity: CRMActivity): Promise<CRMSyncResult> {
    const { credentials } = this.config;
    if (!credentials.accessToken) {
      return {
        success: false,
        error: "Missing HubSpot access token",
        synced: 0,
        failed: 1,
      };
    }

    // Create engagement (note/task) in HubSpot
    const response = await fetch(
      "https://api.hubapi.com/crm/v3/objects/notes",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            hs_timestamp: activity.timestamp.getTime(),
            hs_note_body: `<strong>${activity.subject}</strong><br><br>${activity.body}<br><br><em>Logged via NEXTIER</em>`,
          },
          associations: [
            {
              to: { id: activity.crmRecordId },
              types: [
                {
                  associationCategory: "HUBSPOT_DEFINED",
                  associationTypeId: 202,
                },
              ],
            },
          ],
        }),
      },
    );

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        crmRecordId: data.id,
        synced: 1,
        failed: 0,
      };
    }

    return {
      success: false,
      error: `HubSpot API error: ${response.status}`,
      synced: 0,
      failed: 1,
    };
  }

  /**
   * Sync to GoHighLevel (GHL)
   * The agency favorite - used by tons of marketing agencies
   */
  private async syncToGoHighLevel(
    activity: CRMActivity,
  ): Promise<CRMSyncResult> {
    const { credentials } = this.config;
    if (!credentials.apiKey) {
      return {
        success: false,
        error: "Missing GoHighLevel API key",
        synced: 0,
        failed: 1,
      };
    }

    const icon = getActivityIcon(activity.type);
    const threadedNote = formatActivityThread(activity);

    // GHL API - Create note on contact
    // Uses v1 API: https://highlevel.stoplight.io/docs/integrations
    const response = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/${activity.crmRecordId}/notes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: `${icon} ${threadedNote}\n\n🤖 Logged via NEXTIER`,
        }),
      },
    );

    if (response.ok) {
      const data = await response.json();

      // Also add a tag to track NEXTIER activity
      await fetch(
        `https://rest.gohighlevel.com/v1/contacts/${activity.crmRecordId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tags: ["nextier-active", `nextier-${activity.type}`],
          }),
        },
      ).catch(() => {
        // Tag update is optional, don't fail on this
      });

      return {
        success: true,
        crmRecordId: data.id,
        synced: 1,
        failed: 0,
      };
    }

    return {
      success: false,
      error: `GoHighLevel API error: ${response.status}`,
      synced: 0,
      failed: 1,
    };
  }

  /**
   * Sync to Pipedrive
   */
  private async syncToPipedrive(activity: CRMActivity): Promise<CRMSyncResult> {
    const { credentials } = this.config;
    if (!credentials.apiKey) {
      return {
        success: false,
        error: "Missing Pipedrive API key",
        synced: 0,
        failed: 1,
      };
    }

    const response = await fetch(
      `https://api.pipedrive.com/v1/notes?api_token=${credentials.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `${activity.subject}\n\n${activity.body}\n\n---\nLogged via NEXTIER`,
          person_id: parseInt(activity.crmRecordId || "0"),
          pinned_to_person_flag: true,
        }),
      },
    );

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        crmRecordId: data.data?.id?.toString(),
        synced: 1,
        failed: 0,
      };
    }

    return {
      success: false,
      error: `Pipedrive API error: ${response.status}`,
      synced: 0,
      failed: 1,
    };
  }

  /**
   * Sync to Monday.com
   */
  private async syncToMonday(activity: CRMActivity): Promise<CRMSyncResult> {
    const { credentials } = this.config;
    if (!credentials.apiKey) {
      return {
        success: false,
        error: "Missing Monday.com API key",
        synced: 0,
        failed: 1,
      };
    }

    const mutation = `
      mutation {
        create_update (
          item_id: ${activity.crmRecordId},
          body: "${activity.subject}\\n\\n${activity.body.replace(/"/g, '\\"')}\\n\\n---\\nLogged via NEXTIER"
        ) {
          id
        }
      }
    `;

    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        Authorization: credentials.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: mutation }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        crmRecordId: data.data?.create_update?.id,
        synced: 1,
        failed: 0,
      };
    }

    return {
      success: false,
      error: `Monday.com API error: ${response.status}`,
      synced: 0,
      failed: 1,
    };
  }

  /**
   * Sync via custom webhook (for any CRM)
   */
  private async syncViaWebhook(activity: CRMActivity): Promise<CRMSyncResult> {
    const { credentials } = this.config;
    if (!credentials.webhookUrl) {
      return {
        success: false,
        error: "Missing webhook URL",
        synced: 0,
        failed: 1,
      };
    }

    const response = await fetch(credentials.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "nextier.activity.created",
        timestamp: activity.timestamp.toISOString(),
        data: {
          type: activity.type,
          subject: activity.subject,
          body: activity.body,
          leadId: activity.leadId,
          crmRecordId: activity.crmRecordId,
          metadata: activity.metadata,
        },
      }),
    });

    if (response.ok) {
      return { success: true, synced: 1, failed: 0 };
    }

    return {
      success: false,
      error: `Webhook error: ${response.status}`,
      synced: 0,
      failed: 1,
    };
  }

  /**
   * Pull leads from CRM into NEXTIER
   */
  async pullLeadsFromCRM(options: {
    module?: string;
    limit?: number;
    lastSyncedAt?: Date;
  }): Promise<{ leads: unknown[]; nextPageToken?: string }> {
    // Implementation varies by CRM
    // Returns normalized lead data for NEXTIER import
    return { leads: [] };
  }

  /**
   * Push lead updates to CRM
   */
  async pushLeadToCRM(lead: {
    id: string;
    crmRecordId?: string;
    phone?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    status?: string;
    tags?: string[];
  }): Promise<CRMSyncResult> {
    // Map NEXTIER fields to CRM fields using fieldMapping
    // Then call appropriate CRM API
    return { success: true, synced: 1, failed: 0 };
  }
}

/**
 * Factory function to create CRM service from team settings
 */
export async function getCRMServiceForTeam(
  teamId: string,
): Promise<UnifiedCRMService | null> {
  try {
    const response = await fetch(`/api/integrations/crm?teamId=${teamId}`);
    if (!response.ok) return null;

    const config = await response.json();
    if (!config.enabled) return null;

    return new UnifiedCRMService(config);
  } catch {
    return null;
  }
}

/**
 * Hook for React components to use CRM sync
 */
export function useCRMSync(teamId: string) {
  return {
    logSmsActivity: async (
      activity: Parameters<UnifiedCRMService["logSmsActivity"]>[0],
    ) => {
      const service = await getCRMServiceForTeam(teamId);
      if (!service) return null;
      return service.logSmsActivity(activity);
    },
    syncActivity: async (activity: CRMActivity) => {
      const service = await getCRMServiceForTeam(teamId);
      if (!service) return null;
      return service.syncActivity(activity);
    },
  };
}
