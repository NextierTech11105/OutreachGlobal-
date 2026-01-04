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
 *
 * Usage:
 *   import { executeSMS } from "@/lib/sms/ExecutionRouter";
 *   await executeSMS({ templateId: "bb-1", to: "+15551234567", variables: {...} });
 */

import { resolveAndRenderTemplate, templateExists, validateTemplateId } from "./resolveTemplate";

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
  worker?: "GIANNA" | "CATHY" | "SABRINA" | "SYSTEM";
  trainingMode?: boolean;
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
  error?: string;
}

export interface ExecutionRouterConfig {
  defaultFromNumber?: string;
  signalhouseApiKey?: string;
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
  signalhouseApiBase: process.env.SIGNALHOUSE_API_BASE || "https://api.signalhouse.io/api/v1",
  defaultFromNumber: process.env.SIGNALHOUSE_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioFromNumber: process.env.TWILIO_PHONE_NUMBER,
  trainingMode: process.env.SMS_TRAINING_MODE === "true",
  logLevel: "info",
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE EXECUTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute an SMS send through the canonical router.
 * This is the ONLY approved way to send SMS messages.
 *
 * @param request - The SMS execution request
 * @param config - Optional configuration override
 * @returns SMSExecutionResult
 */
export async function executeSMS(
  request: SMSExecutionRequest,
  config: ExecutionRouterConfig = DEFAULT_CONFIG
): Promise<SMSExecutionResult> {
  const timestamp = new Date().toISOString();
  const isTrainingMode = request.trainingMode ?? config.trainingMode ?? false;

  // ENFORCEMENT: Validate templateId
  try {
    validateTemplateId(request.templateId);
  } catch (error) {
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
    };
  }

  // Resolve and render template
  const { message: renderedMessage, template, cartridgeId } = resolveAndRenderTemplate(
    request.templateId,
    request.variables
  );

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

  // Determine from number
  const fromNumber = request.from || config.defaultFromNumber || "";
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
        config
      );

      if (result.success) {
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
        config
      );

      if (result.success) {
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
        };
      }

      console.warn(`[ExecutionRouter] Twilio failed:`, result.error);
    }

    // No provider available
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
      error: "No SMS provider configured or all providers failed",
    };
  } catch (error) {
    console.error(`[ExecutionRouter] Send error:`, error);
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
      error: error instanceof Error ? error.message : "Unknown send error",
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
  config: ExecutionRouterConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`${config.signalhouseApiBase}/message/sendSMS`, {
      method: "POST",
      headers: {
        "x-api-key": config.signalhouseApiKey || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, from, message }),
    });

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
      messageId: data.messageId || data.id || data.sid,
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
  config: ExecutionRouterConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const credentials = Buffer.from(
      `${config.twilioAccountSid}:${config.twilioAuthToken}`
    ).toString("base64");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
      }
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
  worker?: "GIANNA" | "CATHY" | "SABRINA" | "SYSTEM";
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
  config: ExecutionRouterConfig = DEFAULT_CONFIG
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
        config
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
  variables: Record<string, string>
): { success: boolean; message?: string; error?: string; templateName?: string } {
  try {
    if (!templateExists(templateId)) {
      return { success: false, error: `Template not found: ${templateId}` };
    }

    const { message, template } = resolveAndRenderTemplate(templateId, variables);
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
  config: ExecutionRouterConfig = DEFAULT_CONFIG
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
