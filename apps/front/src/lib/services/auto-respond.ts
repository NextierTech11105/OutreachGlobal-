/**
 * AUTO-RESPOND SERVICE
 * ════════════════════════════════════════════════════════════════════════════
 * Handles automated SMS responses with:
 * - Toggleable per team
 * - Uses GIANNA personality + existing templates
 * - 3-5 minute randomized delay (feels human)
 * - Classification-based template selection
 * - Human override capability
 * ════════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/lib/db";
import { smsMessages } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

// Import GIANNA's existing systems
import { GIANNA_PRESETS, type GiannaPersonality } from "@/lib/gianna/knowledge-base";
import { PERSONALITY_ARCHETYPES, type PersonalityArchetype } from "@/lib/gianna/personality-dna";
import { CONVERSATION_FLOWS, type ResponseIntent } from "@/lib/gianna/conversation-flows";

// Derive preset keys from GIANNA_PRESETS
export type GiannaPreset = keyof typeof GIANNA_PRESETS;

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

export interface AutoRespondConfig {
  enabled: boolean;
  delayMinSeconds: number; // Default: 180 (3 min)
  delayMaxSeconds: number; // Default: 300 (5 min)
  personality: PersonalityArchetype; // GIANNA personality to use
  preset: GiannaPreset; // Behavior preset
  humanApprovalRequired: boolean; // Require human approval before send
}

// Default config - uses GIANNA's balanced preset
export const DEFAULT_CONFIG: AutoRespondConfig = {
  enabled: true,
  delayMinSeconds: 180, // 3 minutes
  delayMaxSeconds: 300, // 5 minutes
  personality: "brooklyn_bestie", // Default GIANNA personality
  preset: "balanced",
  humanApprovalRequired: false,
};

// ════════════════════════════════════════════════════════════════════════════
// RESPONSE INTENT (Maps to GIANNA's conversation flows)
// ════════════════════════════════════════════════════════════════════════════

export type InboundIntent = ResponseIntent;

// ════════════════════════════════════════════════════════════════════════════
// SCHEDULED RESPONSE STORAGE
// ════════════════════════════════════════════════════════════════════════════

interface ScheduledResponse {
  id: string;
  toPhone: string;
  fromPhone: string;
  message: string;
  scheduledAt: Date;
  intent: InboundIntent;
  originalMessage: string;
  leadId?: string;
  teamId?: string;
  status: "pending" | "sent" | "cancelled" | "awaiting_approval";
  personality: PersonalityArchetype;
  preset: GiannaPreset;
  createdAt: Date;
}

// In-memory queue (in production, use Redis or DB table)
const scheduledResponses: Map<string, ScheduledResponse> = new Map();
const activeTimers: Map<string, NodeJS.Timeout> = new Map();

// ════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Schedule an auto-response using GIANNA's personality
 */
export async function scheduleAutoResponse(params: {
  toPhone: string;
  fromPhone: string;
  incomingMessage: string;
  intent: InboundIntent;
  leadId?: string;
  teamId?: string;
  leadContext?: {
    firstName?: string;
    companyName?: string;
    industry?: string;
    propertyAddress?: string;
  };
  config?: Partial<AutoRespondConfig>;
}): Promise<{
  scheduled: boolean;
  responseId?: string;
  intent?: InboundIntent;
  scheduledAt?: Date;
  message?: string;
  skipped?: string;
  awaitingApproval?: boolean;
}> {
  const config = { ...DEFAULT_CONFIG, ...params.config };

  // Check if auto-respond is enabled
  if (!config.enabled) {
    return { scheduled: false, skipped: "Auto-respond disabled" };
  }

  // Don't auto-respond to opt-outs or hard nos - handled immediately
  if (params.intent === "opt_out" || params.intent === "hard_no") {
    return {
      scheduled: false,
      intent: params.intent,
      skipped: "Handled immediately by webhook",
    };
  }

  // Get response from GIANNA's conversation flow
  const response = await generateGiannaResponse({
    intent: params.intent,
    incomingMessage: params.incomingMessage,
    personality: config.personality,
    preset: config.preset,
    leadContext: params.leadContext,
  });

  if (!response) {
    return { scheduled: false, skipped: "No response generated" };
  }

  // Calculate random delay (3-5 minutes default)
  const delaySeconds =
    config.delayMinSeconds +
    Math.random() * (config.delayMaxSeconds - config.delayMinSeconds);
  const delayMs = Math.round(delaySeconds * 1000);

  const scheduledAt = new Date(Date.now() + delayMs);
  const responseId = uuid();

  // Store scheduled response
  const scheduled: ScheduledResponse = {
    id: responseId,
    toPhone: params.toPhone,
    fromPhone: params.fromPhone,
    message: response,
    scheduledAt,
    intent: params.intent,
    originalMessage: params.incomingMessage,
    leadId: params.leadId,
    teamId: params.teamId,
    status: config.humanApprovalRequired ? "awaiting_approval" : "pending",
    personality: config.personality,
    preset: config.preset,
    createdAt: new Date(),
  };

  scheduledResponses.set(responseId, scheduled);

  // If human approval required, don't set timer
  if (config.humanApprovalRequired) {
    console.log(
      `[AutoRespond] Queued for approval ${responseId} → ${params.toPhone} (${params.intent})`
    );
    return {
      scheduled: true,
      responseId,
      intent: params.intent,
      scheduledAt,
      message: response,
      awaitingApproval: true,
    };
  }

  // Set timer to send
  const timer = setTimeout(async () => {
    await executeScheduledResponse(responseId);
  }, delayMs);

  activeTimers.set(responseId, timer);

  console.log(
    `[AutoRespond] Scheduled ${responseId} → ${params.toPhone} in ${Math.round(delaySeconds)}s (${params.intent})`
  );

  return {
    scheduled: true,
    responseId,
    intent: params.intent,
    scheduledAt,
    message: response,
  };
}

/**
 * Generate response using GIANNA's personality system
 */
async function generateGiannaResponse(params: {
  intent: InboundIntent;
  incomingMessage: string;
  personality: PersonalityArchetype;
  preset: GiannaPreset;
  leadContext?: {
    firstName?: string;
    companyName?: string;
    industry?: string;
    propertyAddress?: string;
  };
}): Promise<string | null> {
  try {
    // Get conversation flow for this intent
    const flow = CONVERSATION_FLOWS[params.intent];
    if (!flow) {
      console.log(`[AutoRespond] No flow for intent: ${params.intent}`);
      return null;
    }

    // Get personality DNA
    const personality = PERSONALITY_ARCHETYPES[params.personality];
    const preset = GIANNA_PRESETS[params.preset];

    // Get response template from flow
    let response = flow.response;

    // Apply variable substitution
    if (params.leadContext) {
      response = response
        .replace(/\{\{first_name\}\}/gi, params.leadContext.firstName || "")
        .replace(/\{\{firstName\}\}/gi, params.leadContext.firstName || "")
        .replace(/\{\{company_name\}\}/gi, params.leadContext.companyName || "")
        .replace(/\{\{companyName\}\}/gi, params.leadContext.companyName || "")
        .replace(/\{\{industry\}\}/gi, params.leadContext.industry || "")
        .replace(/\{\{property_address\}\}/gi, params.leadContext.propertyAddress || "")
        .replace(/\{\{propertyAddress\}\}/gi, params.leadContext.propertyAddress || "");
    }

    // Clean up any remaining empty variables
    response = response.replace(/\{\{[^}]+\}\}/g, "").trim();

    // Apply personality adjustments if needed
    // (warmth, directness, humor from personality DNA)

    return response;
  } catch (error) {
    console.error("[AutoRespond] Generate error:", error);
    return null;
  }
}

/**
 * Execute a scheduled response (called by timer)
 */
async function executeScheduledResponse(responseId: string): Promise<void> {
  const scheduled = scheduledResponses.get(responseId);
  if (!scheduled) {
    console.log(`[AutoRespond] Response ${responseId} not found`);
    return;
  }

  if (scheduled.status !== "pending") {
    console.log(`[AutoRespond] Response ${responseId} already ${scheduled.status}`);
    return;
  }

  try {
    // Send via SignalHouse
    const sent = await sendSms(scheduled.toPhone, scheduled.message, scheduled.fromPhone);

    if (sent) {
      scheduled.status = "sent";
      console.log(
        `[AutoRespond] ✅ Sent to ${scheduled.toPhone}: "${scheduled.message.substring(0, 50)}..."`
      );

      // Store in sms_messages table
      await db.insert(smsMessages).values({
        id: uuid(),
        direction: "outbound",
        fromNumber: scheduled.fromPhone,
        toNumber: scheduled.toPhone,
        body: scheduled.message,
        status: "sent",
        provider: "signalhouse",
        leadId: scheduled.leadId || null,
        campaignId: null,
        sentAt: new Date(),
        sentByAdvisor: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      console.error(`[AutoRespond] ❌ Failed to send to ${scheduled.toPhone}`);
    }
  } catch (error) {
    console.error(`[AutoRespond] Error sending response:`, error);
  } finally {
    activeTimers.delete(responseId);
  }
}

/**
 * Approve a response awaiting human approval
 */
export async function approveResponse(
  responseId: string,
  modifiedMessage?: string
): Promise<boolean> {
  const scheduled = scheduledResponses.get(responseId);
  if (!scheduled || scheduled.status !== "awaiting_approval") {
    return false;
  }

  // Update message if modified
  if (modifiedMessage) {
    scheduled.message = modifiedMessage;
  }

  scheduled.status = "pending";

  // Calculate remaining delay or send immediately
  const now = Date.now();
  const scheduledTime = scheduled.scheduledAt.getTime();
  const remainingDelay = Math.max(0, scheduledTime - now);

  if (remainingDelay > 0) {
    const timer = setTimeout(async () => {
      await executeScheduledResponse(responseId);
    }, remainingDelay);
    activeTimers.set(responseId, timer);
  } else {
    // Send immediately
    await executeScheduledResponse(responseId);
  }

  console.log(`[AutoRespond] Approved ${responseId}`);
  return true;
}

/**
 * Cancel a scheduled response (human override)
 */
export function cancelScheduledResponse(responseId: string): boolean {
  const scheduled = scheduledResponses.get(responseId);
  if (!scheduled || scheduled.status === "sent") {
    return false;
  }

  const timer = activeTimers.get(responseId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(responseId);
  }

  scheduled.status = "cancelled";
  console.log(`[AutoRespond] Cancelled ${responseId}`);
  return true;
}

/**
 * Cancel all pending responses for a phone (human took over)
 */
export function cancelResponsesForPhone(phone: string): number {
  let cancelled = 0;
  for (const [id, scheduled] of scheduledResponses) {
    if (
      scheduled.toPhone === phone &&
      (scheduled.status === "pending" || scheduled.status === "awaiting_approval")
    ) {
      cancelScheduledResponse(id);
      cancelled++;
    }
  }
  return cancelled;
}

/**
 * Get pending responses for a phone
 */
export function getPendingResponses(phone: string): ScheduledResponse[] {
  const pending: ScheduledResponse[] = [];
  for (const scheduled of scheduledResponses.values()) {
    if (
      scheduled.toPhone === phone &&
      (scheduled.status === "pending" || scheduled.status === "awaiting_approval")
    ) {
      pending.push(scheduled);
    }
  }
  return pending;
}

/**
 * Get all responses awaiting approval
 */
export function getAwaitingApproval(teamId?: string): ScheduledResponse[] {
  const awaiting: ScheduledResponse[] = [];
  for (const scheduled of scheduledResponses.values()) {
    if (scheduled.status === "awaiting_approval") {
      if (!teamId || scheduled.teamId === teamId) {
        awaiting.push(scheduled);
      }
    }
  }
  return awaiting;
}

// ════════════════════════════════════════════════════════════════════════════
// SMS SENDING
// ════════════════════════════════════════════════════════════════════════════

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SIGNALHOUSE_AUTH_TOKEN = process.env.SIGNALHOUSE_AUTH_TOKEN || "";
const DEFAULT_FROM_NUMBER = process.env.SIGNALHOUSE_DEFAULT_NUMBER || "";

async function sendSms(to: string, message: string, from?: string): Promise<boolean> {
  const fromNumber = from || DEFAULT_FROM_NUMBER;

  if (!SIGNALHOUSE_API_KEY || !fromNumber) {
    console.error("[AutoRespond] SignalHouse not configured");
    return false;
  }

  try {
    const response = await fetch(`${SIGNALHOUSE_API_BASE}/message/sendSMS`, {
      method: "POST",
      headers: {
        accept: "application/json",
        apiKey: SIGNALHOUSE_API_KEY,
        authToken: SIGNALHOUSE_AUTH_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromNumber, to, message }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[AutoRespond] SignalHouse error: ${error}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[AutoRespond] Send error:", error);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TEAM SETTINGS
// ════════════════════════════════════════════════════════════════════════════

const teamConfigs: Map<string, AutoRespondConfig> = new Map();

export function getTeamConfig(teamId: string): AutoRespondConfig {
  return teamConfigs.get(teamId) || DEFAULT_CONFIG;
}

export function updateTeamConfig(
  teamId: string,
  updates: Partial<AutoRespondConfig>
): AutoRespondConfig {
  const current = getTeamConfig(teamId);
  const updated = { ...current, ...updates };
  teamConfigs.set(teamId, updated);
  console.log(`[AutoRespond] Updated config for team ${teamId}`);
  return updated;
}

export function toggleAutoRespond(teamId: string, enabled: boolean): boolean {
  updateTeamConfig(teamId, { enabled });
  return enabled;
}

export function setHumanApproval(teamId: string, required: boolean): boolean {
  updateTeamConfig(teamId, { humanApprovalRequired: required });
  return required;
}

export function setPersonality(teamId: string, personality: PersonalityArchetype): void {
  updateTeamConfig(teamId, { personality });
}

export function setPreset(teamId: string, preset: GiannaPreset): void {
  updateTeamConfig(teamId, { preset });
}

export function setDelay(teamId: string, minSeconds: number, maxSeconds: number): void {
  updateTeamConfig(teamId, {
    delayMinSeconds: minSeconds,
    delayMaxSeconds: maxSeconds,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export const autoRespondService = {
  schedule: scheduleAutoResponse,
  approve: approveResponse,
  cancel: cancelScheduledResponse,
  cancelForPhone: cancelResponsesForPhone,
  getPending: getPendingResponses,
  getAwaitingApproval,
  getConfig: getTeamConfig,
  updateConfig: updateTeamConfig,
  toggle: toggleAutoRespond,
  setHumanApproval,
  setPersonality,
  setPreset,
  setDelay,
  DEFAULT_CONFIG,
};

export default autoRespondService;
