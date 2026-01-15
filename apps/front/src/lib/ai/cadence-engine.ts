/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CADENCE ENGINE - THE LOOP Execution
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THE LOOP: 30-Day Relentless Intent Path
 * Touch Schedule: Days 1, 3, 5, 7, 10, 14, 21, 28, 30
 *
 * Philosophy:
 * - Loops are PATHS that get carved out and shaped
 * - MANUFACTURE responses through conversational auto-respond
 * - SCALE visibility with high-capability intent messaging
 * - RELENTLESS INTENT inside 30 days → 15-min meeting
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { THE_LOOP, CAMPAIGN_MACROS, type CampaignMacroId } from "@/config/constants";
import { SMS_TEMPLATES, PERSONAS, getTemplate, renderTemplate } from "@/config/the-blitz";
import type { Lead, LeadSourceBucket, LeadBatch } from "./copilot-engine";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CadenceTouch {
  day: number;
  type: "sms" | "call" | "email";
  template: string;
  worker: "GIANNA" | "CATHY" | "SABRINA";
  stage: "opener" | "nudge" | "value" | "close";
}

export interface LeadCadenceState {
  leadId: string;
  campaign: CampaignMacroId;
  persona: string;
  loopStartDate: Date;
  currentDay: number;
  touchesSent: number;
  touchesRemaining: number;
  lastTouchAt?: Date;
  nextTouchAt?: Date;
  nextTouchDay: number;
  status: "active" | "responded" | "booked" | "opted_out" | "completed" | "paused";
}

export interface DailyExecution {
  date: Date;
  campaign: CampaignMacroId;
  leadsToTouch: number;
  touchesByDay: Record<number, number>;
  estimatedSMS: number;
  estimatedCalls: number;
}

export interface CadenceMessage {
  leadId: string;
  to: string;
  from: string;
  message: string;
  touchDay: number;
  template: string;
  worker: "GIANNA" | "CATHY" | "SABRINA";
  scheduledAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE LOOP TOUCH SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════════

export const TOUCH_SCHEDULE: CadenceTouch[] = [
  // Day 1 - OPENER (GIANNA)
  { day: 1, type: "sms", template: "opener", worker: "GIANNA", stage: "opener" },

  // Day 3 - NUDGE 1 (GIANNA)
  { day: 3, type: "sms", template: "nudge", worker: "GIANNA", stage: "nudge" },

  // Day 5 - VALUE (GIANNA)
  { day: 5, type: "sms", template: "value", worker: "GIANNA", stage: "value" },

  // Day 7 - NUDGE 2 (CATHY takes over nurture)
  { day: 7, type: "sms", template: "nudge", worker: "CATHY", stage: "nudge" },

  // Day 10 - VALUE (CATHY)
  { day: 10, type: "sms", template: "value", worker: "CATHY", stage: "value" },

  // Day 14 - CLOSE ATTEMPT (SABRINA)
  { day: 14, type: "sms", template: "close", worker: "SABRINA", stage: "close" },

  // Day 21 - CALL ATTEMPT (SABRINA)
  { day: 21, type: "call", template: "call", worker: "SABRINA", stage: "close" },

  // Day 28 - FINAL SMS (SABRINA)
  { day: 28, type: "sms", template: "close", worker: "SABRINA", stage: "close" },

  // Day 30 - FINAL CALL (SABRINA)
  { day: 30, type: "call", template: "final", worker: "SABRINA", stage: "close" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CADENCE CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current loop day for a lead
 */
export function calculateLoopDay(loopStartDate: Date): number {
  const now = new Date();
  const start = new Date(loopStartDate);
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.min(diffDays + 1, THE_LOOP.LIFECYCLE_DAYS); // Day 1-30
}

/**
 * Get next touch for a lead based on current day
 */
export function getNextTouch(currentDay: number): CadenceTouch | null {
  return TOUCH_SCHEDULE.find((touch) => touch.day > currentDay) || null;
}

/**
 * Get all remaining touches for a lead
 */
export function getRemainingTouches(currentDay: number): CadenceTouch[] {
  return TOUCH_SCHEDULE.filter((touch) => touch.day > currentDay);
}

/**
 * Calculate next touch date
 */
export function calculateNextTouchDate(loopStartDate: Date, touchDay: number): Date {
  const start = new Date(loopStartDate);
  start.setDate(start.getDate() + touchDay - 1);
  return start;
}

/**
 * Get lead's cadence state
 */
export function getLeadCadenceState(
  lead: Lead,
  campaign: CampaignMacroId = "B2B",
  persona: string = "busy_ceo"
): LeadCadenceState {
  const loopStartDate = lead.lastTouchAt || new Date();
  const currentDay = calculateLoopDay(loopStartDate);
  const nextTouch = getNextTouch(currentDay);
  const remainingTouches = getRemainingTouches(currentDay);

  return {
    leadId: lead.id,
    campaign,
    persona,
    loopStartDate,
    currentDay,
    touchesSent: lead.touchCount,
    touchesRemaining: remainingTouches.length,
    lastTouchAt: lead.lastTouchAt,
    nextTouchAt: nextTouch ? calculateNextTouchDate(loopStartDate, nextTouch.day) : undefined,
    nextTouchDay: nextTouch?.day || THE_LOOP.LIFECYCLE_DAYS,
    status: currentDay >= THE_LOOP.LIFECYCLE_DAYS ? "completed" : "active",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate cadence message for a lead
 */
export function generateCadenceMessage(
  lead: Lead,
  touch: CadenceTouch,
  persona: string,
  fromNumber: string,
  bookingLink?: string
): CadenceMessage {
  // Get template for persona and stage
  const template = getTemplate(persona, touch.stage);

  let message: string;
  if (template) {
    message = renderTemplate(template, {
      firstName: lead.firstName,
      link: bookingLink || process.env.CALENDLY_LINK || "calendly.com/tb-outreachglobal/15min",
    });
  } else {
    // Fallback message
    message = `Hi ${lead.firstName}, quick q - do you have a few minutes for a call this week? -Emily`;
  }

  return {
    leadId: lead.id,
    to: lead.phone,
    from: fromNumber,
    message,
    touchDay: touch.day,
    template: touch.template,
    worker: touch.worker,
    scheduledAt: new Date(),
  };
}

/**
 * Generate all pending messages for a batch
 */
export function generateBatchMessages(
  leads: Lead[],
  currentDay: number,
  fromNumber: string,
  persona: string = "busy_ceo"
): CadenceMessage[] {
  const messages: CadenceMessage[] = [];
  const touch = TOUCH_SCHEDULE.find((t) => t.day === currentDay);

  if (!touch) return messages;

  for (const lead of leads) {
    if (lead.stage === "nurture" || lead.stage === "won" || lead.stage === "lost") {
      continue;
    }

    const message = generateCadenceMessage(lead, touch, persona, fromNumber);
    messages.push(message);
  }

  return messages;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY EXECUTION PLANNING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Plan daily execution for a campaign
 */
export function planDailyExecution(
  buckets: LeadSourceBucket[],
  campaign: CampaignMacroId
): DailyExecution {
  const campaignBuckets = buckets.filter((b) => b.campaign === campaign);
  const activeBatches = campaignBuckets.flatMap((b) =>
    b.batches.filter((batch) => batch.status === "in_loop")
  );

  // Count leads by their current loop day
  const touchesByDay: Record<number, number> = {};
  let totalLeadsToTouch = 0;

  for (const batch of activeBatches) {
    if (batch.loopStartDate) {
      const loopDay = calculateLoopDay(batch.loopStartDate);

      // Find if there's a touch scheduled for today based on loop day
      const touch = TOUCH_SCHEDULE.find((t) => t.day === loopDay);
      if (touch) {
        touchesByDay[touch.day] = (touchesByDay[touch.day] || 0) + batch.size;
        totalLeadsToTouch += batch.size;
      }
    }
  }

  // Calculate SMS vs calls
  let estimatedSMS = 0;
  let estimatedCalls = 0;

  for (const [dayStr, count] of Object.entries(touchesByDay)) {
    const day = parseInt(dayStr);
    const touch = TOUCH_SCHEDULE.find((t) => t.day === day);
    if (touch?.type === "sms") {
      estimatedSMS += count;
    } else if (touch?.type === "call") {
      estimatedCalls += count;
    }
  }

  return {
    date: new Date(),
    campaign,
    leadsToTouch: totalLeadsToTouch,
    touchesByDay,
    estimatedSMS,
    estimatedCalls,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Start a batch in THE LOOP
 */
export function startBatchInLoop(batch: LeadBatch): LeadBatch {
  return {
    ...batch,
    status: "in_loop",
    loopStartDate: new Date(),
  };
}

/**
 * Check if batch has completed THE LOOP
 */
export function isBatchCompleted(batch: LeadBatch): boolean {
  if (!batch.loopStartDate) return false;
  const loopDay = calculateLoopDay(batch.loopStartDate);
  return loopDay >= THE_LOOP.LIFECYCLE_DAYS;
}

/**
 * Get batch progress through THE LOOP
 */
export function getBatchLoopProgress(batch: LeadBatch): {
  currentDay: number;
  percentComplete: number;
  touchesSent: number;
  touchesRemaining: number;
  nextTouch: CadenceTouch | null;
} {
  if (!batch.loopStartDate) {
    return {
      currentDay: 0,
      percentComplete: 0,
      touchesSent: 0,
      touchesRemaining: TOUCH_SCHEDULE.length,
      nextTouch: TOUCH_SCHEDULE[0],
    };
  }

  const currentDay = calculateLoopDay(batch.loopStartDate);
  const touchesSent = TOUCH_SCHEDULE.filter((t) => t.day <= currentDay).length;
  const remainingTouches = getRemainingTouches(currentDay);

  return {
    currentDay,
    percentComplete: (currentDay / THE_LOOP.LIFECYCLE_DAYS) * 100,
    touchesSent,
    touchesRemaining: remainingTouches.length,
    nextTouch: remainingTouches[0] || null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-RESPOND CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const AUTO_RESPOND_CONFIG = {
  enabled: THE_LOOP.AUTO_RESPOND.enabled,
  maxAutoReplies: THE_LOOP.AUTO_RESPOND.maxAutoReplies,

  // Response delay (human-like timing)
  minDelaySeconds: 30,
  maxDelaySeconds: 120,

  // Worker assignments for auto-respond
  workerAssignments: {
    POSITIVE: "SABRINA", // Push to call
    QUESTION: "GIANNA", // Answer and continue
    OBJECTION: "GIANNA", // Handle objection
    NEGATIVE: "CATHY", // Nurture
    BOOKING: "SABRINA", // Book immediately
  } as const,

  // Stop auto-respond triggers
  stopTriggers: [
    /\b(stop|unsubscribe|remove|opt.?out)\b/i,
    /\b(wrong number|don'?t text me)\b/i,
  ],
};

/**
 * Check if we should auto-respond to a message
 */
export function shouldAutoRespond(
  message: string,
  autoReplyCount: number
): { should: boolean; reason: string } {
  // Check stop triggers
  for (const trigger of AUTO_RESPOND_CONFIG.stopTriggers) {
    if (trigger.test(message)) {
      return { should: false, reason: "Stop trigger detected" };
    }
  }

  // Check max replies
  if (autoReplyCount >= AUTO_RESPOND_CONFIG.maxAutoReplies) {
    return { should: false, reason: "Max auto-replies reached, human handoff" };
  }

  // Check if enabled
  if (!AUTO_RESPOND_CONFIG.enabled) {
    return { should: false, reason: "Auto-respond disabled" };
  }

  return { should: true, reason: "Auto-respond enabled" };
}

/**
 * Calculate response delay (human-like)
 */
export function calculateResponseDelay(): number {
  const { minDelaySeconds, maxDelaySeconds } = AUTO_RESPOND_CONFIG;
  return Math.floor(
    Math.random() * (maxDelaySeconds - minDelaySeconds) + minDelaySeconds
  ) * 1000;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  THE_LOOP,
  CAMPAIGN_MACROS,
};

console.log("[Cadence Engine] Loaded - THE LOOP ready to execute");
