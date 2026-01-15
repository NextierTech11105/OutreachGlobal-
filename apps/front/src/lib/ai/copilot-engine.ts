/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AI COPILOT ENGINE - The Central Brain
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The AI Copilot sits at the CENTER of the execution loop:
 *
 *   DATA PREP → CAMPAIGN PREP → OUTBOUND SMS → INBOUND RESPONSE
 *                                                    ↓
 *                                             AI COPILOT
 *                                                    ↓
 *   DEAL ← PROPOSAL ← 15-MIN DISCOVERY ← HOT CALL QUEUE
 *
 * Everything else in Nextier either FEEDS this loop or SCALES this loop.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  classifyMessage,
  generateResponse,
  quickClassify,
  type Classification,
  type Priority,
  type ClassificationResult,
  type GeneratedResponse,
} from "./openai-client";
import { THE_LOOP, CAMPAIGN_MACROS } from "@/config/constants";
import { Logger } from "@/lib/logger";
import {
  STAGE_COPILOTS,
  type LeadStage,
  type AIWorker,
} from "./stage-copilots";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  company?: string;
  stage: LeadStage;
  source?: string;
  batchId?: string;
  loopDay: number;
  touchCount: number;
  lastTouchAt?: Date;
  nextTouchAt?: Date;
  classification?: Classification;
  priority?: Priority;
  assignedWorker?: AIWorker;
  customFields?: Record<string, unknown>;
}

export interface InboundMessage {
  id: string;
  leadId: string;
  from: string;
  to: string;
  message: string;
  receivedAt: Date;
  processed: boolean;
}

export interface CopilotDecision {
  action:
    | "auto_respond"
    | "route_to_call"
    | "nurture"
    | "opt_out"
    | "manual_review";
  classification: ClassificationResult;
  response?: GeneratedResponse;
  nextStage: LeadStage;
  assignedWorker: AIWorker;
  shouldNotify: boolean;
  reason: string;
}

export interface LeadSourceBucket {
  id: string;
  name: string;
  source: "usbizdata" | "apollo" | "tracerfy" | "manual" | "import";
  campaign: keyof typeof CAMPAIGN_MACROS;
  batchSize: number;
  totalLeads: number;
  processedLeads: number;
  batches: LeadBatch[];
  createdAt: Date;
  status: "pending" | "processing" | "completed" | "paused";
}

export interface LeadBatch {
  id: string;
  bucketId: string;
  batchNumber: number;
  size: number;
  status: "pending" | "enriched" | "in_loop" | "completed";
  loopStartDate?: Date;
  stats: {
    sent: number;
    delivered: number;
    responded: number;
    positive: number;
    booked: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COPILOT CORE - The Decision Engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process an inbound message through the AI Copilot
 * Returns a decision on what to do next
 */
export async function processCopilotDecision(
  lead: Lead,
  inboundMessage: string,
  context?: {
    previousMessages?: string[];
    campaignType?: string;
  },
): Promise<CopilotDecision> {
  // Step 1: Classify the message
  const classification = await classifyMessage(inboundMessage, {
    leadName: lead.firstName,
    previousMessages: context?.previousMessages,
    campaignType: context?.campaignType || CAMPAIGN_MACROS.B2B.name,
  });

  // Step 2: Determine action based on classification
  let action: CopilotDecision["action"];
  let nextStage: LeadStage = lead.stage;
  let assignedWorker: AIWorker = lead.assignedWorker || "COPILOT";
  let shouldNotify = false;
  let reason = "";
  let response: GeneratedResponse | undefined;

  switch (classification.classification) {
    case "POSITIVE":
    case "BOOKING":
      action = "route_to_call";
      nextStage = "hot_call_queue";
      assignedWorker = "SABRINA";
      shouldNotify = true;
      reason = `HOT LEAD: ${classification.intent}`;
      break;

    case "QUESTION":
      // Auto-respond to questions, keep in GIANNA's territory
      action = "auto_respond";
      nextStage = "outbound_sms";
      assignedWorker = "GIANNA";
      response = await generateResponse(inboundMessage, classification, {
        leadName: lead.firstName,
        companyName: lead.company,
        campaignContext: context?.campaignType,
        calendlyLink: process.env.CALENDLY_LINK,
      });
      reason = `Question answered: ${classification.intent}`;
      break;

    case "OBJECTION":
      // Handle objection, may need human review
      if (classification.confidence > 0.8) {
        action = "auto_respond";
        assignedWorker = "GIANNA";
        response = await generateResponse(inboundMessage, classification, {
          leadName: lead.firstName,
          companyName: lead.company,
        });
        reason = `Objection handled: ${classification.intent}`;
      } else {
        action = "manual_review";
        shouldNotify = true;
        reason = `Complex objection needs review: ${classification.intent}`;
      }
      break;

    case "NEGATIVE":
      // Move to nurture for future re-engagement
      action = "nurture";
      nextStage = "nurture";
      assignedWorker = "CATHY";
      reason = `Not interested now, moved to nurture: ${classification.intent}`;
      break;

    case "STOP":
      // Immediate opt-out
      action = "opt_out";
      nextStage = "nurture"; // Track but don't contact
      reason = "Opt-out request processed";
      shouldNotify = true;
      break;

    case "RESCHEDULE":
      action = "route_to_call";
      nextStage = "hot_call_queue";
      assignedWorker = "SABRINA";
      shouldNotify = true;
      reason = `Reschedule request: ${classification.intent}`;
      break;

    case "SPAM":
    case "UNCLEAR":
    default:
      action = "manual_review";
      shouldNotify = classification.priority === "HOT";
      reason = `Needs review: ${classification.intent}`;
      break;
  }

  return {
    action,
    classification,
    response,
    nextStage,
    assignedWorker,
    shouldNotify,
    reason,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE LOOP CADENCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate next touch date based on THE LOOP schedule
 */
export function calculateNextTouch(lead: Lead): {
  nextTouchDay: number;
  nextTouchDate: Date;
  touchType: "sms" | "call" | "nurture";
} {
  const { TOUCH_SCHEDULE, LIFECYCLE_DAYS } = THE_LOOP;
  const currentDay = lead.loopDay;

  // Find next touch day in schedule
  const nextTouchDay =
    TOUCH_SCHEDULE.find((day) => day > currentDay) || LIFECYCLE_DAYS;

  // If beyond lifecycle, move to nurture
  if (nextTouchDay >= LIFECYCLE_DAYS) {
    return {
      nextTouchDay: LIFECYCLE_DAYS,
      nextTouchDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      touchType: "nurture",
    };
  }

  // Calculate date
  const loopStartDate = lead.lastTouchAt || new Date();
  const daysUntilTouch = nextTouchDay - currentDay;
  const nextTouchDate = new Date(loopStartDate);
  nextTouchDate.setDate(nextTouchDate.getDate() + daysUntilTouch);

  // Determine touch type based on day
  let touchType: "sms" | "call" | "nurture" = "sms";
  if (nextTouchDay >= 21) {
    touchType = "call"; // Late in loop, try calling
  }

  return { nextTouchDay, nextTouchDate, touchType };
}

/**
 * Get leads due for touch today
 */
export function getLeadsDueForTouch(leads: Lead[]): Lead[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return leads.filter((lead) => {
    if (!lead.nextTouchAt) return false;
    const touchDate = new Date(lead.nextTouchAt);
    const touchDay = new Date(
      touchDate.getFullYear(),
      touchDate.getMonth(),
      touchDate.getDate(),
    );
    return (
      touchDay <= today &&
      lead.stage !== "nurture" &&
      lead.stage !== "won" &&
      lead.stage !== "lost"
    );
  });
}

/**
 * Advance lead through THE LOOP
 */
export function advanceLeadInLoop(lead: Lead): Lead {
  const nextTouch = calculateNextTouch(lead);

  return {
    ...lead,
    loopDay: nextTouch.nextTouchDay,
    touchCount: lead.touchCount + 1,
    lastTouchAt: new Date(),
    nextTouchAt: nextTouch.nextTouchDate,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD SOURCE BUCKET SYSTEM - 1K Blocks from USBizData
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH_SIZE = 1000; // 1K blocks as requested

/**
 * Create a lead source bucket from imported data
 */
export function createLeadSourceBucket(
  name: string,
  source: LeadSourceBucket["source"],
  campaign: keyof typeof CAMPAIGN_MACROS,
  totalLeads: number,
): LeadSourceBucket {
  const numBatches = Math.ceil(totalLeads / BATCH_SIZE);
  const batches: LeadBatch[] = [];

  for (let i = 0; i < numBatches; i++) {
    const isLastBatch = i === numBatches - 1;
    const batchSize = isLastBatch
      ? totalLeads % BATCH_SIZE || BATCH_SIZE
      : BATCH_SIZE;

    batches.push({
      id: `batch_${Date.now()}_${i}`,
      bucketId: "", // Will be set after bucket creation
      batchNumber: i + 1,
      size: batchSize,
      status: "pending",
      stats: {
        sent: 0,
        delivered: 0,
        responded: 0,
        positive: 0,
        booked: 0,
      },
    });
  }

  const bucket: LeadSourceBucket = {
    id: `bucket_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    source,
    campaign,
    batchSize: BATCH_SIZE,
    totalLeads,
    processedLeads: 0,
    batches,
    createdAt: new Date(),
    status: "pending",
  };

  // Set bucketId on batches
  bucket.batches = batches.map((b) => ({ ...b, bucketId: bucket.id }));

  return bucket;
}

/**
 * Get next batch to process from a bucket
 */
export function getNextBatchToProcess(
  bucket: LeadSourceBucket,
): LeadBatch | null {
  return bucket.batches.find((b) => b.status === "pending") || null;
}

/**
 * Update batch status
 */
export function updateBatchStatus(
  bucket: LeadSourceBucket,
  batchId: string,
  status: LeadBatch["status"],
  stats?: Partial<LeadBatch["stats"]>,
): LeadSourceBucket {
  return {
    ...bucket,
    batches: bucket.batches.map((b) =>
      b.id === batchId
        ? {
            ...b,
            status,
            stats: stats ? { ...b.stats, ...stats } : b.stats,
            loopStartDate: status === "in_loop" ? new Date() : b.loopStartDate,
          }
        : b,
    ),
    processedLeads: bucket.batches
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + b.size, 0),
  };
}

/**
 * Calculate bucket progress
 */
export function calculateBucketProgress(bucket: LeadSourceBucket): {
  percentComplete: number;
  batchesComplete: number;
  batchesInProgress: number;
  batchesPending: number;
  totalResponses: number;
  totalBooked: number;
  responseRate: number;
  bookingRate: number;
} {
  const batchesComplete = bucket.batches.filter(
    (b) => b.status === "completed",
  ).length;
  const batchesInProgress = bucket.batches.filter(
    (b) => b.status === "in_loop" || b.status === "enriched",
  ).length;
  const batchesPending = bucket.batches.filter(
    (b) => b.status === "pending",
  ).length;

  const totals = bucket.batches.reduce(
    (acc, b) => ({
      sent: acc.sent + b.stats.sent,
      responded: acc.responded + b.stats.responded,
      booked: acc.booked + b.stats.booked,
    }),
    { sent: 0, responded: 0, booked: 0 },
  );

  return {
    percentComplete: (bucket.processedLeads / bucket.totalLeads) * 100,
    batchesComplete,
    batchesInProgress,
    batchesPending,
    totalResponses: totals.responded,
    totalBooked: totals.booked,
    responseRate: totals.sent > 0 ? (totals.responded / totals.sent) * 100 : 0,
    bookingRate:
      totals.responded > 0 ? (totals.booked / totals.responded) * 100 : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOT CALL QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

export interface HotCallQueueItem {
  id: string;
  leadId: string;
  lead: Lead;
  reason: string;
  classification: Classification;
  priority: Priority;
  addedAt: Date;
  assignedTo?: string;
  status:
    | "pending"
    | "dialing"
    | "connected"
    | "completed"
    | "no_answer"
    | "callback";
  callbackAt?: Date;
  notes?: string;
}

/**
 * Add lead to hot call queue
 */
export function createHotCallQueueItem(
  lead: Lead,
  decision: CopilotDecision,
): HotCallQueueItem {
  return {
    id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    leadId: lead.id,
    lead,
    reason: decision.reason,
    classification: decision.classification.classification,
    priority: decision.classification.priority,
    addedAt: new Date(),
    status: "pending",
  };
}

/**
 * Sort call queue by priority
 */
export function sortCallQueue(queue: HotCallQueueItem[]): HotCallQueueItem[] {
  const priorityOrder: Record<Priority, number> = { HOT: 0, WARM: 1, COLD: 2 };

  return [...queue].sort((a, b) => {
    // First by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by time (FIFO within same priority)
    return a.addedAt.getTime() - b.addedAt.getTime();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the appropriate AI worker for a lead's current state
 */
export function assignWorker(
  lead: Lead,
  classification?: Classification,
): AIWorker {
  // Based on stage
  const stageCopilot = STAGE_COPILOTS[lead.stage];
  if (stageCopilot) {
    return stageCopilot.primaryWorker;
  }

  // Based on classification
  if (classification) {
    switch (classification) {
      case "POSITIVE":
      case "BOOKING":
        return "SABRINA"; // Closer
      case "QUESTION":
      case "OBJECTION":
        return "GIANNA"; // Opener/Handler
      case "NEGATIVE":
        return "CATHY"; // Nurturer
      default:
        return "COPILOT";
    }
  }

  return "COPILOT";
}

/**
 * Get worker's current load
 */
export function getWorkerLoad(
  worker: AIWorker,
  activeLeads: Lead[],
): {
  worker: AIWorker;
  activeCount: number;
  hotCount: number;
  warmCount: number;
  coldCount: number;
} {
  const workerLeads = activeLeads.filter((l) => l.assignedWorker === worker);

  return {
    worker,
    activeCount: workerLeads.length,
    hotCount: workerLeads.filter((l) => l.priority === "HOT").length,
    warmCount: workerLeads.filter((l) => l.priority === "WARM").length,
    coldCount: workerLeads.filter((l) => l.priority === "COLD").length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CopilotAnalytics {
  period: { start: Date; end: Date };
  totalProcessed: number;
  classifications: Record<Classification, number>;
  priorities: Record<Priority, number>;
  actions: Record<CopilotDecision["action"], number>;
  autoRespondRate: number;
  routeToCallRate: number;
  avgConfidence: number;
}

/**
 * Calculate copilot analytics
 */
export function calculateCopilotAnalytics(
  decisions: CopilotDecision[],
  period: { start: Date; end: Date },
): CopilotAnalytics {
  const classifications: Record<Classification, number> = {
    POSITIVE: 0,
    NEGATIVE: 0,
    QUESTION: 0,
    OBJECTION: 0,
    BOOKING: 0,
    RESCHEDULE: 0,
    STOP: 0,
    SPAM: 0,
    UNCLEAR: 0,
  };

  const priorities: Record<Priority, number> = { HOT: 0, WARM: 0, COLD: 0 };

  const actions: Record<CopilotDecision["action"], number> = {
    auto_respond: 0,
    route_to_call: 0,
    nurture: 0,
    opt_out: 0,
    manual_review: 0,
  };

  let totalConfidence = 0;

  for (const decision of decisions) {
    classifications[decision.classification.classification]++;
    priorities[decision.classification.priority]++;
    actions[decision.action]++;
    totalConfidence += decision.classification.confidence;
  }

  const total = decisions.length || 1;

  return {
    period,
    totalProcessed: decisions.length,
    classifications,
    priorities,
    actions,
    autoRespondRate: (actions.auto_respond / total) * 100,
    routeToCallRate: (actions.route_to_call / total) * 100,
    avgConfidence: totalConfidence / total,
  };
}

Logger.info("Copilot", "Copilot Engine loaded - AI Copilot ready to process");
