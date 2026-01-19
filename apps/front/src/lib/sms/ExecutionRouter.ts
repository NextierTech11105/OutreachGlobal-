/**
 * EXECUTION ROUTER
 * ================
 * CANONICAL gateway for ALL outbound SMS messages.
 *
 * ALL SignalHouse/Twilio calls MUST go through this router.
 * - Resolves templateId from CARTRIDGE_LIBRARY
 * - Applies variable substitution
 * - Routes to SignalHouse (primary) or Twilio (fallback)
 * - Supports TRAINING mode (zero sends, logs only)
 * - Validates message content before send
 * - Enforces template lifecycle states
 * - Validates tenant access
 * - Structured audit logging
 *
 * Usage:
 *   import { executeSMS } from "@/lib/sms/ExecutionRouter";
 *   await executeSMS({ templateId: "bb-1", to: "+15551234567", variables: {...} });
 */

import {
  resolveAndRenderTemplate,
  templateExists,
  validateTemplateId,
  validateSendable,
  type TemplateResolutionError,
} from "./resolveTemplate";
import { TemplateLifecycle } from "./template-cartridges";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SMSExecutionRequest {
  templateId: string;
  to: string;
  from?: string;
  variables: Record<string, string>;
  leadId?: string;
  teamId?: string;
  campaignId?: string;
  worker?: "GIANNA" | "CATHY" | "SABRINA" | "NEVA" | "SYSTEM";
  trainingMode?: boolean;
}

/**
 * Team SignalHouse settings fetched from database
 */
export interface TeamSignalHouseSettings {
  subGroupId: string | null;
  brandId: string | null;
  campaignIds: string[] | null;
  phonePool: string[] | null;
}

// Cache for team settings to avoid repeated fetches
const teamSettingsCache = new Map<string, { settings: TeamSignalHouseSettings; fetchedAt: number }>();
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Fetch team's SignalHouse settings from the backend GraphQL API
 */
async function fetchTeamSignalHouseSettings(teamId: string): Promise<TeamSignalHouseSettings | null> {
  // Check cache first
  const cached = teamSettingsCache.get(teamId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.settings;
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000';

    // GraphQL query to fetch team SignalHouse settings
    const query = `
      query GetTeamSignalHouseSettings($teamId: ID!) {
        signalHouseSettings(teamId: $teamId) {
          subGroupId
          brandId
          campaignIds
          phonePool
        }
      }
    `;

    const response = await fetch(`${apiUrl}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { teamId } }),
    });

    if (!response.ok) {
      console.warn(`[ExecutionRouter] Failed to fetch team settings: ${response.status}`);
      return null;
    }

    const result = await response.json();

    if (result.errors?.length) {
      console.warn(`[ExecutionRouter] GraphQL errors:`, result.errors);
      return null;
    }

    const settings = result.data?.signalHouseSettings as TeamSignalHouseSettings;
    if (!settings) return null;

    // Cache the result
    teamSettingsCache.set(teamId, { settings, fetchedAt: Date.now() });
    return settings;
  } catch (error) {
    console.error(`[ExecutionRouter] Error fetching team settings:`, error);
    return null;
  }
}

/**
 * Select a phone from the pool using round-robin rotation
 */
let phonePoolIndex = 0;
function selectFromPhonePool(phonePool: string[] | null): string | null {
  if (!phonePool || phonePool.length === 0) return null;
  const phone = phonePool[phonePoolIndex % phonePool.length];
  phonePoolIndex++;
  return phone;
}

export interface SMSExecutionResult {
  success: boolean;
  messageId?: string;
  templateId: string;
  templateName: string;
  cartridgeId: string;
  renderedMessage: string;
  sentTo: string;
  sentFrom: string;
  trainingMode: boolean;
  provider: "signalhouse" | "twilio" | "training";
  timestamp: string;
  lifecycle?: TemplateLifecycle;
  error?: string;
  errorCode?: string;
}

/**
 * Structured audit log entry for compliance tracking
 */
export interface SMSAuditLog {
  timestamp: string;
  templateId: string;
  cartridgeId: string;
  templateName: string;
  renderedMessageHash: string; // SHA256 of message (for audit without storing content)
  actor: "GIANNA" | "CATHY" | "SABRINA" | "NEVA" | "SYSTEM";
  mode: "training" | "live";
  provider: "signalhouse" | "twilio" | "training";
  teamId?: string;
  campaignId?: string;
  leadId?: string;
  success: boolean;
  errorCode?: string;
  lifecycle: TemplateLifecycle;
}

export interface ExecutionRouterConfig {
  defaultFromNumber?: string;
  signalhouseApiKey?: string;
  signalhouseAuthToken?: string;
  signalhouseApiBase?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  trainingMode?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: ExecutionRouterConfig = {
  signalhouseApiKey: process.env.SIGNALHOUSE_API_KEY,
  signalhouseAuthToken: process.env.SIGNALHOUSE_AUTH_TOKEN,
  signalhouseApiBase:
    process.env.SIGNALHOUSE_API_BASE || "https://api.signalhouse.io",
  defaultFromNumber:
    process.env.SIGNALHOUSE_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioFromNumber: process.env.TWILIO_PHONE_NUMBER,
  trainingMode: process.env.SMS_TRAINING_MODE === "true",
  logLevel: "info",
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hash message content for audit trail (doesn't store actual content)
 */
function hashMessage(message: string): string {
  return crypto
    .createHash("sha256")
    .update(message)
    .digest("hex")
    .substring(0, 16);
}

/**
 * Log structured audit entry for compliance
 */
function logAudit(entry: SMSAuditLog): void {
  // Structured JSON log for compliance systems
  console.log(
    JSON.stringify({
      type: "SMS_AUDIT",
      ...entry,
      // Redact PII from logs
      renderedMessageHash: entry.renderedMessageHash || "UNKNOWN",
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE EXECUTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute an SMS send through the canonical router.
 * This is the ONLY approved way to send SMS messages.
 *
 * LIFECYCLE ENFORCEMENT:
 * - Only APPROVED templates can be sent
 * - DISABLED templates fail on resolution
 * - DEPRECATED templates rejected before send
 * - Tenant access validated via teamId
 *
 * @param request - The SMS execution request
 * @param config - Optional configuration override
 * @returns SMSExecutionResult
 */
export async function executeSMS(
  request: SMSExecutionRequest,
  config: ExecutionRouterConfig = DEFAULT_CONFIG,
): Promise<SMSExecutionResult> {
  const timestamp = new Date().toISOString();
  const isTrainingMode = request.trainingMode ?? config.trainingMode ?? false;

  // ENFORCEMENT: Validate templateId exists
  try {
    validateTemplateId(request.templateId);
  } catch (error) {
    const resolutionError = error as TemplateResolutionError;
    logAudit({
      timestamp,
      templateId: request.templateId,
      cartridgeId: "",
      templateName: "",
      renderedMessageHash: "",
      actor: request.worker || "SYSTEM",
      mode: isTrainingMode ? "training" : "live",
      provider: "training",
      teamId: request.teamId,
      campaignId: request.campaignId,
      leadId: request.leadId,
      success: false,
      errorCode: resolutionError.code || "TEMPLATE_ID_MISSING",
      lifecycle: TemplateLifecycle.DISABLED,
    });

    return {
      success: false,
      templateId: request.templateId,
      templateName: "",
      cartridgeId: "",
      renderedMessage: "",
      sentTo: request.to,
      sentFrom: config.defaultFromNumber || "",
      trainingMode: isTrainingMode,
      provider: "training",
      timestamp,
      error: error instanceof Error ? error.message : "Invalid templateId",
      errorCode: resolutionError.code,
    };
  }

  // LIFECYCLE ENFORCEMENT: Validate template is sendable (APPROVED only)
  // This also checks tenant access via teamId
  try {
    validateSendable(request.templateId, request.teamId);
  } catch (error) {
    const resolutionError = error as TemplateResolutionError;
    logAudit({
      timestamp,
      templateId: request.templateId,
      cartridgeId: "",
      templateName: "",
      renderedMessageHash: "",
      actor: request.worker || "SYSTEM",
      mode: isTrainingMode ? "training" : "live",
      provider: "training",
      teamId: request.teamId,
      campaignId: request.campaignId,
      leadId: request.leadId,
      success: false,
      errorCode: resolutionError.code || "TEMPLATE_NOT_SENDABLE",
      lifecycle: resolutionError.lifecycle || TemplateLifecycle.DISABLED,
    });

    return {
      success: false,
      templateId: request.templateId,
      templateName: "",
      cartridgeId: "",
      renderedMessage: "",
      sentTo: request.to,
      sentFrom: config.defaultFromNumber || "",
      trainingMode: isTrainingMode,
      provider: "training",
      timestamp,
      lifecycle: resolutionError.lifecycle,
      error: error instanceof Error ? error.message : "Template not sendable",
      errorCode: resolutionError.code,
    };
  }

  // Resolve and render template (with tenant guard via teamId)
  const {
    message: renderedMessage,
    template,
    cartridgeId,
    lifecycle,
  } = resolveAndRenderTemplate(request.templateId, request.variables, {
    teamId: request.teamId,
  });

  // Validate message length
  if (renderedMessage.length > 320) {
    return {
      success: false,
      templateId: request.templateId,
      templateName: template.name,
      cartridgeId,
      renderedMessage,
      sentTo: request.to,
      sentFrom: config.defaultFromNumber || "",
      trainingMode: isTrainingMode,
      provider: "training",
      timestamp,
      error: `Message exceeds 320 characters (${renderedMessage.length})`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH TEAM SIGNALHOUSE SETTINGS (phone pool, campaign IDs)
  // ═══════════════════════════════════════════════════════════════════════════
  let teamSettings: TeamSignalHouseSettings | null = null;
  if (request.teamId) {
    teamSettings = await fetchTeamSignalHouseSettings(request.teamId);
    if (teamSettings) {
      console.log(`[ExecutionRouter] Loaded team settings for ${request.teamId}:`, {
        hasPhonePool: !!teamSettings.phonePool?.length,
        hasCampaignIds: !!teamSettings.campaignIds?.length,
      });
    }
  }

  // Determine from number: request.from > phone pool > config default
  let fromNumber = request.from;
  if (!fromNumber && teamSettings?.phonePool?.length) {
    fromNumber = selectFromPhonePool(teamSettings.phonePool);
    console.log(`[ExecutionRouter] Selected from phone pool: ${fromNumber}`);
  }
  if (!fromNumber) {
    fromNumber = config.defaultFromNumber || "";
  }

  if (!fromNumber) {
    return {
      success: false,
      templateId: request.templateId,
      templateName: template.name,
      cartridgeId,
      renderedMessage,
      sentTo: request.to,
      sentFrom: "",
      trainingMode: isTrainingMode,
      provider: "training",
      timestamp,
      error: "No 'from' number configured",
    };
  }

  // Determine campaign ID: request.campaignId > first from team settings
  let effectiveCampaignId = request.campaignId;
  if (!effectiveCampaignId && teamSettings?.campaignIds?.length) {
    effectiveCampaignId = teamSettings.campaignIds[0];
    console.log(`[ExecutionRouter] Using team campaign ID: ${effectiveCampaignId}`);
  }

  // Log execution details
  console.log(`[ExecutionRouter] ${isTrainingMode ? "TRAINING" : "LIVE"} SMS`, {
    templateId: request.templateId,
    templateName: template.name,
    cartridgeId,
    to: request.to,
    from: fromNumber,
    worker: request.worker,
    messageLength: renderedMessage.length,
    timestamp,
  });

  // TRAINING MODE: Log only, no actual send
  if (isTrainingMode) {
    console.log(`[ExecutionRouter] TRAINING MODE - Would send:`, {
      to: request.to,
      message: renderedMessage.substring(0, 100) + "...",
    });

    logAudit({
      timestamp,
      templateId: request.templateId,
      cartridgeId,
      templateName: template.name,
      renderedMessageHash: hashMessage(renderedMessage),
      actor: request.worker || "SYSTEM",
      mode: "training",
      provider: "training",
      teamId: request.teamId,
      campaignId: request.campaignId,
      leadId: request.leadId,
      success: true,
      lifecycle,
    });

    return {
      success: true,
      messageId: `training-${Date.now()}`,
      templateId: request.templateId,
      templateName: template.name,
      cartridgeId,
      renderedMessage,
      sentTo: request.to,
      sentFrom: fromNumber,
      trainingMode: true,
      provider: "training",
      timestamp,
      lifecycle,
    };
  }

  // LIVE MODE: Send via SignalHouse (primary) or Twilio (fallback)
  try {
    // Try SignalHouse first
    if (config.signalhouseApiKey) {
      const result = await sendViaSignalHouse(
        request.to,
        fromNumber,
        renderedMessage,
        config,
        effectiveCampaignId,
      );

      if (result.success) {
        logAudit({
          timestamp,
          templateId: request.templateId,
          cartridgeId,
          templateName: template.name,
          renderedMessageHash: hashMessage(renderedMessage),
          actor: request.worker || "SYSTEM",
          mode: "live",
          provider: "signalhouse",
          teamId: request.teamId,
          campaignId: request.campaignId,
          leadId: request.leadId,
          success: true,
          lifecycle,
        });

        return {
          success: true,
          messageId: result.messageId,
          templateId: request.templateId,
          templateName: template.name,
          cartridgeId,
          renderedMessage,
          sentTo: request.to,
          sentFrom: fromNumber,
          trainingMode: false,
          provider: "signalhouse",
          timestamp,
          lifecycle,
        };
      }

      console.warn(`[ExecutionRouter] SignalHouse failed:`, result.error);
    }

    // Fallback to Twilio if configured
    if (config.twilioAccountSid && config.twilioAuthToken) {
      const result = await sendViaTwilio(
        request.to,
        config.twilioFromNumber || fromNumber,
        renderedMessage,
        config,
      );

      if (result.success) {
        logAudit({
          timestamp,
          templateId: request.templateId,
          cartridgeId,
          templateName: template.name,
          renderedMessageHash: hashMessage(renderedMessage),
          actor: request.worker || "SYSTEM",
          mode: "live",
          provider: "twilio",
          teamId: request.teamId,
          campaignId: request.campaignId,
          leadId: request.leadId,
          success: true,
          lifecycle,
        });

        return {
          success: true,
          messageId: result.messageId,
          templateId: request.templateId,
          templateName: template.name,
          cartridgeId,
          renderedMessage,
          sentTo: request.to,
          sentFrom: config.twilioFromNumber || fromNumber,
          trainingMode: false,
          provider: "twilio",
          timestamp,
          lifecycle,
        };
      }

      console.warn(`[ExecutionRouter] Twilio failed:`, result.error);
    }

    // No provider available
    logAudit({
      timestamp,
      templateId: request.templateId,
      cartridgeId,
      templateName: template.name,
      renderedMessageHash: hashMessage(renderedMessage),
      actor: request.worker || "SYSTEM",
      mode: "live",
      provider: "signalhouse",
      teamId: request.teamId,
      campaignId: request.campaignId,
      leadId: request.leadId,
      success: false,
      errorCode: "NO_PROVIDER",
      lifecycle,
    });

    return {
      success: false,
      templateId: request.templateId,
      templateName: template.name,
      cartridgeId,
      renderedMessage,
      sentTo: request.to,
      sentFrom: fromNumber,
      trainingMode: false,
      provider: "signalhouse",
      timestamp,
      lifecycle,
      error: "No SMS provider configured or all providers failed",
      errorCode: "NO_PROVIDER",
    };
  } catch (error) {
    console.error(`[ExecutionRouter] Send error:`, error);

    logAudit({
      timestamp,
      templateId: request.templateId,
      cartridgeId,
      templateName: template.name,
      renderedMessageHash: hashMessage(renderedMessage),
      actor: request.worker || "SYSTEM",
      mode: "live",
      provider: "signalhouse",
      teamId: request.teamId,
      campaignId: request.campaignId,
      leadId: request.leadId,
      success: false,
      errorCode: "SEND_ERROR",
      lifecycle,
    });

    return {
      success: false,
      templateId: request.templateId,
      templateName: template.name,
      cartridgeId,
      renderedMessage,
      sentTo: request.to,
      sentFrom: fromNumber,
      trainingMode: false,
      provider: "signalhouse",
      timestamp,
      lifecycle,
      error: error instanceof Error ? error.message : "Unknown send error",
      errorCode: "SEND_ERROR",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function sendViaSignalHouse(
  to: string,
  from: string,
  message: string,
  config: ExecutionRouterConfig,
  campaignId?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Build headers matching client.ts pattern (apiKey + authToken)
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      accept: "application/json",
    };
    if (config.signalhouseApiKey) {
      headers["apiKey"] = config.signalhouseApiKey;
    }
    if (config.signalhouseAuthToken) {
      headers["authToken"] = config.signalhouseAuthToken;
    }

    // Build request body - include campaign_id for 10DLC compliance
    const body: Record<string, string> = { to, from, message };
    if (campaignId) {
      body.campaign_id = campaignId;
    }

    const response = await fetch(
      `${config.signalhouseApiBase}/message/sendSMS`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          errorData.message || errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messageId || data.message_id || data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "SignalHouse error",
    };
  }
}

async function sendViaTwilio(
  to: string,
  from: string,
  message: string,
  config: ExecutionRouterConfig,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const credentials = Buffer.from(
      `${config.twilioAccountSid}:${config.twilioAuthToken}`,
    ).toString("base64");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: from,
          Body: message,
        }).toString(),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.sid,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Twilio error",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface BatchExecutionRequest {
  templateId: string;
  recipients: Array<{
    to: string;
    variables: Record<string, string>;
    leadId?: string;
  }>;
  teamId?: string;
  campaignId?: string;
  worker?: "GIANNA" | "CATHY" | "SABRINA" | "NEVA" | "SYSTEM";
  trainingMode?: boolean;
  batchSize?: number;
  delayMs?: number;
}

export interface BatchExecutionResult {
  success: boolean;
  totalRequested: number;
  totalSent: number;
  totalFailed: number;
  results: SMSExecutionResult[];
  trainingMode: boolean;
}

/**
 * Execute batch SMS sends through the router.
 * Respects rate limits and batch sizes.
 */
export async function executeBatchSMS(
  request: BatchExecutionRequest,
  config: ExecutionRouterConfig = DEFAULT_CONFIG,
): Promise<BatchExecutionResult> {
  const batchSize = request.batchSize || 50;
  const delayMs = request.delayMs || 100;
  const results: SMSExecutionResult[] = [];
  let totalSent = 0;
  let totalFailed = 0;

  // Process in batches
  for (let i = 0; i < request.recipients.length; i += batchSize) {
    const batch = request.recipients.slice(i, i + batchSize);

    for (const recipient of batch) {
      const result = await executeSMS(
        {
          templateId: request.templateId,
          to: recipient.to,
          variables: recipient.variables,
          leadId: recipient.leadId,
          teamId: request.teamId,
          campaignId: request.campaignId,
          worker: request.worker,
          trainingMode: request.trainingMode,
        },
        config,
      );

      results.push(result);
      if (result.success) {
        totalSent++;
      } else {
        totalFailed++;
      }

      // Rate limiting delay
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  return {
    success: totalFailed === 0,
    totalRequested: request.recipients.length,
    totalSent,
    totalFailed,
    results,
    trainingMode: request.trainingMode ?? config.trainingMode ?? false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Preview what would be sent without actually sending.
 * Useful for approval workflows and UI previews.
 */
export function previewSMS(
  templateId: string,
  variables: Record<string, string>,
): {
  success: boolean;
  message?: string;
  error?: string;
  templateName?: string;
} {
  try {
    if (!templateExists(templateId)) {
      return { success: false, error: `Template not found: ${templateId}` };
    }

    const { message, template } = resolveAndRenderTemplate(
      templateId,
      variables,
    );
    return {
      success: true,
      message,
      templateName: template.name,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Preview failed",
    };
  }
}

/**
 * Check if the router is properly configured.
 */
export function isRouterConfigured(
  config: ExecutionRouterConfig = DEFAULT_CONFIG,
): { configured: boolean; providers: string[] } {
  const providers: string[] = [];

  if (config.signalhouseApiKey) {
    providers.push("signalhouse");
  }
  if (config.twilioAccountSid && config.twilioAuthToken) {
    providers.push("twilio");
  }

  return {
    configured: providers.length > 0 || config.trainingMode === true,
    providers,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  executeSMS,
  executeBatchSMS,
  previewSMS,
  isRouterConfigured,
};
