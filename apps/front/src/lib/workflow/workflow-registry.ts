/**
 * WORKFLOW REGISTRY - Single Source of Truth
 *
 * This file defines the complete lead journey from data ingestion to conversion.
 * All stages, triggers, webhooks, and UI paths are defined here.
 *
 * RULES:
 * 1. Each stage has ONE trigger condition - no overlap
 * 2. Each stage has ONE webhook handler
 * 3. Each stage has ONE UI workspace
 * 4. Stages are sequential - a lead can only be in one stage at a time
 */

// =============================================================================
// LEAD LIFECYCLE STAGES
// =============================================================================

export type LeadStage =
  | "DATA_INGESTED" // Raw data uploaded, not processed
  | "ENRICHED" // Phone/email validated, scored
  | "INITIAL_OUTREACH" // First SMS sent via GIANNA
  | "AWAITING_RESPONSE" // Waiting for reply
  | "RETARGET" // No response after 3 days, retry
  | "NUDGE" // No response after 14 days, different approach
  | "CONTENT_NURTURE" // Positive but not ready, educational drip
  | "BOOKING" // High intent, scheduling appointment
  | "CONVERTED" // Appointment set or deal closed
  | "OPTED_OUT" // Lead requested no contact
  | "DEAD"; // Wrong number, invalid, etc.

// =============================================================================
// WORKFLOW STAGES - THE COMPLETE JOURNEY
// =============================================================================

export interface WorkflowStage {
  id: string;
  name: string;
  description: string;

  // Trigger
  triggerCondition: string;
  triggerWebhook: string | null;

  // Execution
  worker: "GIANNA" | "CATHY" | "SABRINA" | "NEVA" | "MANUAL" | null;
  smsType: string | null;
  actionHandler: string;

  // UI
  uiPath: string;
  uiIcon: string;

  // Transitions
  nextStageOnSuccess: LeadStage | null;
  nextStageOnNoResponse: LeadStage | null;
  nextStageOnOptOut: LeadStage;

  // Timing
  waitDaysBeforeNextStage: number | null;
}

export const WORKFLOW_STAGES: Record<string, WorkflowStage> = {
  // -------------------------------------------------------------------------
  // STAGE 1: DATA INGESTION
  // -------------------------------------------------------------------------
  DATA_INGESTED: {
    id: "data-ingested",
    name: "Data Ingested",
    description: "Raw lead data uploaded from USDataBiz or other source",

    triggerCondition: "CSV upload OR API push",
    triggerWebhook: "/api/datalake/upload",

    worker: null,
    smsType: null,
    actionHandler: "/api/lucy/prepare",

    uiPath: "/data/luci",
    uiIcon: "Upload",

    nextStageOnSuccess: "ENRICHED",
    nextStageOnNoResponse: null,
    nextStageOnOptOut: "DEAD",

    waitDaysBeforeNextStage: 0,
  },

  // -------------------------------------------------------------------------
  // STAGE 2: ENRICHMENT
  // -------------------------------------------------------------------------
  ENRICHED: {
    id: "enriched",
    name: "Enriched",
    description: "Lead validated, phone type confirmed, score calculated",

    triggerCondition: "Auto after data ingestion",
    triggerWebhook: null,

    worker: "NEVA",
    smsType: null,
    actionHandler: "/api/luci/orchestrate",

    uiPath: "/leads",
    uiIcon: "CheckCircle",

    nextStageOnSuccess: "INITIAL_OUTREACH",
    nextStageOnNoResponse: null,
    nextStageOnOptOut: "DEAD",

    waitDaysBeforeNextStage: 0,
  },

  // -------------------------------------------------------------------------
  // STAGE 3: INITIAL OUTREACH
  // -------------------------------------------------------------------------
  INITIAL_OUTREACH: {
    id: "initial-message",
    name: "Initial Message",
    description: "First SMS sent by GIANNA to introduce the offer",

    triggerCondition: "Lead score >= 60 AND has_valid_mobile",
    triggerWebhook: "/api/luci/push-to-sms",

    worker: "GIANNA",
    smsType: "SMS_INITIAL",
    actionHandler: "/api/signalhouse/send",

    uiPath: "/workspaces/initial-message",
    uiIcon: "MessageCircle",

    nextStageOnSuccess: "BOOKING",
    nextStageOnNoResponse: "RETARGET",
    nextStageOnOptOut: "OPTED_OUT",

    waitDaysBeforeNextStage: 3,
  },

  // -------------------------------------------------------------------------
  // STAGE 4: RETARGET
  // -------------------------------------------------------------------------
  RETARGET: {
    id: "retarget",
    name: "Retarget",
    description: "Follow-up SMS after 3 days of no response",

    triggerCondition: "No response after 3 days from initial",
    triggerWebhook: "/api/luci/push-to-sms",

    worker: "GIANNA",
    smsType: "SMS_RETARGET_NC",
    actionHandler: "/api/signalhouse/send",

    uiPath: "/workspaces/retarget",
    uiIcon: "RefreshCw",

    nextStageOnSuccess: "BOOKING",
    nextStageOnNoResponse: "NUDGE",
    nextStageOnOptOut: "OPTED_OUT",

    waitDaysBeforeNextStage: 11, // 14 days total from initial
  },

  // -------------------------------------------------------------------------
  // STAGE 5: NUDGE
  // -------------------------------------------------------------------------
  NUDGE: {
    id: "nudger",
    name: "Nudger",
    description: "Different approach SMS after 14 days, new angle",

    triggerCondition: "No response after 14 days from initial",
    triggerWebhook: "/api/luci/push-to-sms",

    worker: "CATHY",
    smsType: "SMS_NUDGE",
    actionHandler: "/api/signalhouse/send",

    uiPath: "/workspaces/nudger",
    uiIcon: "Bell",

    nextStageOnSuccess: "BOOKING",
    nextStageOnNoResponse: "CONTENT_NURTURE",
    nextStageOnOptOut: "OPTED_OUT",

    waitDaysBeforeNextStage: 7,
  },

  // -------------------------------------------------------------------------
  // STAGE 6: CONTENT NURTURE
  // -------------------------------------------------------------------------
  CONTENT_NURTURE: {
    id: "content-nurture",
    name: "Content Nurture",
    description: "Educational drip content for long-term engagement",

    triggerCondition: "Positive response but not ready to book",
    triggerWebhook: "/api/luci/push-to-sms",

    worker: "GIANNA",
    smsType: "SMS_NURTURE",
    actionHandler: "/api/signalhouse/send",

    uiPath: "/workspaces/content-nurture",
    uiIcon: "BookOpen",

    nextStageOnSuccess: "BOOKING",
    nextStageOnNoResponse: null, // Stay in nurture
    nextStageOnOptOut: "OPTED_OUT",

    waitDaysBeforeNextStage: 7, // Weekly drip
  },

  // -------------------------------------------------------------------------
  // STAGE 7: BOOKING
  // -------------------------------------------------------------------------
  BOOKING: {
    id: "book-appointment",
    name: "Book Appointment",
    description: "High intent lead, scheduling appointment with SABRINA",

    triggerCondition: "email_captured OR wants_call OR high_intent",
    triggerWebhook: "/api/luci/push-to-sms",

    worker: "SABRINA",
    smsType: "BOOK_APPOINTMENT",
    actionHandler: "/api/signalhouse/send",

    uiPath: "/workspaces/sabrina",
    uiIcon: "Calendar",

    nextStageOnSuccess: "CONVERTED",
    nextStageOnNoResponse: "CONTENT_NURTURE",
    nextStageOnOptOut: "OPTED_OUT",

    waitDaysBeforeNextStage: 1,
  },

  // -------------------------------------------------------------------------
  // TERMINAL STAGES
  // -------------------------------------------------------------------------
  CONVERTED: {
    id: "converted",
    name: "Converted",
    description: "Appointment booked or deal closed",

    triggerCondition: "Appointment confirmed OR deal closed",
    triggerWebhook: null,

    worker: null,
    smsType: null,
    actionHandler: "/api/leads/[id]/convert",

    uiPath: "/leads?status=converted",
    uiIcon: "CheckCircle2",

    nextStageOnSuccess: null,
    nextStageOnNoResponse: null,
    nextStageOnOptOut: "OPTED_OUT",

    waitDaysBeforeNextStage: null,
  },

  OPTED_OUT: {
    id: "opted-out",
    name: "Opted Out",
    description: "Lead requested no contact - HARD STOP",

    triggerCondition: "STOP keyword received",
    triggerWebhook: "/api/webhook/signalhouse",

    worker: null,
    smsType: null,
    actionHandler: "/api/leads/[id]/optout",

    uiPath: "/leads?status=opted_out",
    uiIcon: "Ban",

    nextStageOnSuccess: null,
    nextStageOnNoResponse: null,
    nextStageOnOptOut: "OPTED_OUT",

    waitDaysBeforeNextStage: null,
  },

  DEAD: {
    id: "dead",
    name: "Dead",
    description: "Invalid data, wrong number, or unreachable",

    triggerCondition: "WRONG_NUMBER classification OR invalid phone",
    triggerWebhook: null,

    worker: null,
    smsType: null,
    actionHandler: "/api/leads/[id]/dead",

    uiPath: "/leads?status=dead",
    uiIcon: "X",

    nextStageOnSuccess: null,
    nextStageOnNoResponse: null,
    nextStageOnOptOut: "OPTED_OUT",

    waitDaysBeforeNextStage: null,
  },
} as const;

// =============================================================================
// WEBHOOK HANDLERS - All triggers in one place
// =============================================================================

export const WEBHOOK_HANDLERS = {
  // Inbound SMS from SignalHouse
  INBOUND_SMS: {
    path: "/api/webhook/signalhouse",
    method: "POST",
    triggers: [
      { condition: "STOP keyword", action: "Move to OPTED_OUT" },
      {
        condition: "Email captured",
        action: "Apply email_captured label, move to BOOKING",
      },
      { condition: "Phone captured", action: "Apply mobile_captured label" },
      { condition: "Positive response", action: "Evaluate for BOOKING" },
      { condition: "Question asked", action: "Route to inbox for review" },
    ],
  },

  // Campaign orchestration
  CAMPAIGN_ORCHESTRATE: {
    path: "/api/luci/orchestrate",
    method: "POST",
    triggers: [
      { condition: "Campaign approved", action: "Prepare lead blocks" },
      { condition: "Lead block ready", action: "Queue for SMS send" },
    ],
  },

  // SMS execution
  SMS_SEND: {
    path: "/api/luci/push-to-sms",
    method: "POST",
    triggers: [
      { condition: "Lead in queue", action: "Send via SignalHouse" },
      { condition: "Rate limit hit", action: "Defer to next window" },
    ],
  },

  // Delivery status
  DELIVERY_STATUS: {
    path: "/api/webhook/signalhouse/status",
    method: "POST",
    triggers: [
      { condition: "delivered", action: "Update message status" },
      { condition: "failed", action: "Mark message failed, retry logic" },
      { condition: "undelivered", action: "Check carrier rejection" },
    ],
  },
} as const;

// =============================================================================
// NAVIGATION - Derived from workflow stages
// =============================================================================

export const WORKSPACE_NAV_ITEMS = Object.values(WORKFLOW_STAGES)
  .filter((stage) => stage.uiPath.startsWith("/workspaces/"))
  .map((stage) => ({
    label: stage.name,
    path: stage.uiPath,
    icon: stage.uiIcon,
    worker: stage.worker,
    description: stage.description,
  }));

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the next stage for a lead based on current stage and response
 */
export function getNextStage(
  currentStage: LeadStage,
  response: "success" | "no_response" | "opt_out",
): LeadStage | null {
  const stage = WORKFLOW_STAGES[currentStage];
  if (!stage) return null;

  switch (response) {
    case "success":
      return stage.nextStageOnSuccess;
    case "no_response":
      return stage.nextStageOnNoResponse;
    case "opt_out":
      return stage.nextStageOnOptOut;
    default:
      return null;
  }
}

/**
 * Get the worker assigned to a stage
 */
export function getWorkerForStage(stage: LeadStage): string | null {
  return WORKFLOW_STAGES[stage]?.worker || null;
}

/**
 * Get the webhook handler for a stage
 */
export function getWebhookForStage(stage: LeadStage): string | null {
  return WORKFLOW_STAGES[stage]?.triggerWebhook || null;
}

/**
 * Check if a lead can transition to a new stage
 */
export function canTransition(
  currentStage: LeadStage,
  targetStage: LeadStage,
): boolean {
  const stage = WORKFLOW_STAGES[currentStage];
  if (!stage) return false;

  return (
    stage.nextStageOnSuccess === targetStage ||
    stage.nextStageOnNoResponse === targetStage ||
    stage.nextStageOnOptOut === targetStage
  );
}
