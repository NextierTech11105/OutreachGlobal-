/**
 * SMS EXECUTION MODES
 * ====================
 * Three ways to send SMS through ExecutionRouter:
 *
 * 1. BLAST    - Immediate bulk send (batch of leads NOW)
 * 2. SCHEDULED - Send at specific datetime (calendar-based)
 * 3. AUTO      - Trigger-based (if-this-then-that events)
 *
 * All modes flow through ExecutionRouter → SignalHouse.
 * All modes require templateId from CARTRIDGE_LIBRARY.
 */

import { executeSMS, executeBatchSMS, type SMSExecutionRequest, type BatchExecutionRequest } from "./ExecutionRouter";
import { calculateOptimalSendTime, generateBatchSchedule, type ScheduledSend } from "./variance/scheduling";
import { eventBus, EventFactory, type EventType, type OrchestrationEvent } from "../orchestration/events";
import { resolveTemplateById } from "./resolveTemplate";
import type { LeadContext as VarianceLeadContext } from "./variance/variance-rules";

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION MODE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ExecutionMode = "blast" | "scheduled" | "auto";

/**
 * Base configuration for all execution modes
 */
interface BaseExecutionConfig {
  templateId: string;       // REQUIRED - from CARTRIDGE_LIBRARY
  teamId: string;
  campaignId?: string;
  worker?: "GIANNA" | "CATHY" | "SABRINA" | "NEVA" | "SYSTEM";
  trainingMode?: boolean;
}

/**
 * BLAST MODE: Send immediately to a batch of leads
 * Use when: Launching a new campaign, sending to a daily block
 */
export interface BlastModeConfig extends BaseExecutionConfig {
  mode: "blast";
  leads: BlastRecipient[];
  batchSize?: number;       // Default: 50
  delayMs?: number;         // Rate limit delay (default: 100ms)
}

export interface BlastRecipient {
  leadId: string;
  to: string;
  variables: Record<string, string>;
}

/**
 * SCHEDULED MODE: Send at a specific time
 * Use when: Calendar-based sends, optimal timing, time-sensitive campaigns
 */
export interface ScheduledModeConfig extends BaseExecutionConfig {
  mode: "scheduled";
  leads: ScheduledRecipient[];
  scheduling: {
    type: "specific" | "optimal" | "spread";
    // For "specific": exact datetime to send all messages
    sendAt?: Date;
    // For "optimal": use industry-aware timing per lead
    respectIndustry?: boolean;
    // For "spread": distribute evenly across time range
    startAt?: Date;
    endAt?: Date;
  };
}

export interface ScheduledRecipient extends BlastRecipient {
  industry?: string;    // For optimal timing calculation
}

/**
 * AUTO MODE: Event-driven triggers
 * Use when: If-this-then-that automation, response follow-ups, lifecycle events
 */
export interface AutoModeConfig extends BaseExecutionConfig {
  mode: "auto";
  trigger: SMSTrigger;
  recipients?: AutoRecipient[];  // Optional - some triggers auto-select recipients
}

export type SMSTrigger =
  | { type: "lead_responded"; sentimentFilter?: "positive" | "negative" | "neutral" }
  | { type: "lead_no_response"; afterDays: number }
  | { type: "lead_stage_changed"; fromStage?: string; toStage: string }
  | { type: "meeting_booked"; offsetHours?: number }  // Confirmation/reminder
  | { type: "meeting_reminder"; beforeHours: number }
  | { type: "email_captured"; sendValuation?: boolean }
  | { type: "custom_event"; eventType: EventType };

export interface AutoRecipient extends BlastRecipient {
  context?: Record<string, unknown>;  // Event context for variable interpolation
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExecutionResult {
  mode: ExecutionMode;
  success: boolean;
  totalQueued: number;
  totalSent: number;
  totalFailed: number;
  trainingMode: boolean;
  scheduleId?: string;       // For scheduled mode
  triggerId?: string;        // For auto mode
  results?: Array<{
    leadId: string;
    success: boolean;
    scheduledAt?: Date;      // For scheduled mode
    error?: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLAST MODE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute immediate blast to all recipients
 */
export async function executeBlast(config: BlastModeConfig): Promise<ExecutionResult> {
  // Validate template exists
  resolveTemplateById(config.templateId, { teamId: config.teamId });

  const batchRequest: BatchExecutionRequest = {
    templateId: config.templateId,
    recipients: config.leads.map(l => ({
      to: l.to,
      variables: l.variables,
      leadId: l.leadId,
    })),
    teamId: config.teamId,
    campaignId: config.campaignId,
    worker: config.worker || "GIANNA",
    trainingMode: config.trainingMode,
    batchSize: config.batchSize || 50,
    delayMs: config.delayMs || 100,
  };

  const result = await executeBatchSMS(batchRequest);

  // Emit campaign event
  eventBus.emit(EventFactory.createEvent(
    "campaign.batch_sent",
    { entityType: "campaign", entityId: config.campaignId || "adhoc" },
    {
      campaignId: config.campaignId || "adhoc",
      batchSize: config.leads.length,
      status: result.totalFailed === 0 ? "success" : "partial",
    },
    { agent: config.worker?.toLowerCase() as "gianna" | "cathy" | "sabrina" | undefined }
  ));

  return {
    mode: "blast",
    success: result.totalFailed === 0,
    totalQueued: config.leads.length,
    totalSent: result.totalSent,
    totalFailed: result.totalFailed,
    trainingMode: result.trainingMode,
    results: result.results.map(r => ({
      leadId: config.leads.find(l => l.to === r.sentTo)?.leadId || "unknown",
      success: r.success,
      error: r.error,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULED MODE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

// Schedule item for tracking
interface ScheduleItem {
  lead: ScheduledRecipient;
  scheduledSend: ScheduledSend;
}

// In-memory schedule store (production would use Redis/DB)
const pendingSchedules = new Map<string, ScheduledJob>();

interface ScheduledJob {
  id: string;
  config: ScheduledModeConfig;
  schedule: { leads: ScheduleItem[] };
  status: "pending" | "executing" | "completed" | "cancelled";
  createdAt: Date;
}

/**
 * Schedule messages for future delivery
 */
export async function executeScheduled(config: ScheduledModeConfig): Promise<ExecutionResult> {
  // Validate template exists
  resolveTemplateById(config.templateId, { teamId: config.teamId });

  const scheduleId = `sched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  let schedule: { leads: ScheduleItem[] };

  switch (config.scheduling.type) {
    case "specific": {
      // All messages at exact time
      const sendAt = config.scheduling.sendAt || new Date();
      schedule = {
        leads: config.leads.map(lead => ({
          lead,
          scheduledSend: {
            sendAt,
            timeBand: "mid_morning",
            dayOfWeek: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][sendAt.getDay()] as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
            reason: "Specific time scheduled",
          },
        })),
      };
      break;
    }

    case "optimal": {
      // Industry-aware optimal timing per lead
      const leadContexts: VarianceLeadContext[] = config.leads.map(l => ({
        firstName: l.variables.firstName || l.variables.name || "",
        lastName: l.variables.lastName,
        businessName: l.variables.company || l.variables.businessName || "",
        industry: l.industry,
      }));
      const batchSchedule = generateBatchSchedule(leadContexts, {
        timezone: "America/New_York",
        respectIndustryTiming: config.scheduling.respectIndustry !== false,
        maxMessagesPerHour: 50,
        spreadEvenly: true,
        jitterMinutes: 5,
      });
      // Map back to our ScheduledRecipient type
      schedule = {
        leads: batchSchedule.leads.map((item, i) => ({
          lead: config.leads[i],
          scheduledSend: item.scheduledSend,
        })),
      };
      break;
    }

    case "spread": {
      // Distribute evenly across time range
      const startAt = config.scheduling.startAt || new Date();
      const endAt = config.scheduling.endAt || new Date(startAt.getTime() + 24 * 60 * 60 * 1000);
      const interval = (endAt.getTime() - startAt.getTime()) / config.leads.length;

      schedule = {
        leads: config.leads.map((lead, i) => {
          const sendAt = new Date(startAt.getTime() + i * interval);
          return {
            lead,
            scheduledSend: {
              sendAt,
              timeBand: "mid_morning",
              dayOfWeek: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][sendAt.getDay()] as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
              reason: "Spread evenly across time range",
            },
          };
        }),
      };
      break;
    }
  }

  // Store scheduled job
  const job: ScheduledJob = {
    id: scheduleId,
    config,
    schedule,
    status: "pending",
    createdAt: new Date(),
  };
  pendingSchedules.set(scheduleId, job);

  // Start scheduler tick if not already running
  startSchedulerTick();

  return {
    mode: "scheduled",
    success: true,
    totalQueued: config.leads.length,
    totalSent: 0,  // Nothing sent yet
    totalFailed: 0,
    trainingMode: config.trainingMode || false,
    scheduleId,
    results: schedule.leads.map(item => ({
      leadId: item.lead.leadId,
      success: true,
      scheduledAt: item.scheduledSend.sendAt,
    })),
  };
}

// Scheduler tick interval
let schedulerInterval: NodeJS.Timeout | null = null;

function startSchedulerTick() {
  if (schedulerInterval) return;

  schedulerInterval = setInterval(async () => {
    const now = new Date();

    for (const [id, job] of pendingSchedules.entries()) {
      if (job.status !== "pending") continue;

      // Find messages due now
      const dueMessages = job.schedule.leads.filter(item =>
        item.scheduledSend.sendAt <= now
      );

      if (dueMessages.length === 0) continue;

      // Send due messages
      for (const item of dueMessages) {
        try {
          await executeSMS({
            templateId: job.config.templateId,
            to: item.lead.to,
            variables: item.lead.variables,
            leadId: item.lead.leadId,
            teamId: job.config.teamId,
            campaignId: job.config.campaignId,
            worker: job.config.worker,
            trainingMode: job.config.trainingMode,
          });
        } catch (error) {
          console.error(`[Scheduler] Failed to send to ${item.lead.to}:`, error);
        }
      }

      // Remove sent messages from pending
      job.schedule.leads = job.schedule.leads.filter(item =>
        item.scheduledSend.sendAt > now
      );

      // Mark complete if all sent
      if (job.schedule.leads.length === 0) {
        job.status = "completed";
        console.log(`[Scheduler] Job ${id} completed`);
      }
    }

    // Clean up completed jobs older than 1 hour
    for (const [id, job] of pendingSchedules.entries()) {
      if (job.status === "completed" &&
          Date.now() - job.createdAt.getTime() > 60 * 60 * 1000) {
        pendingSchedules.delete(id);
      }
    }
  }, 60 * 1000);  // Check every minute
}

/**
 * Cancel a scheduled job
 */
export function cancelSchedule(scheduleId: string): boolean {
  const job = pendingSchedules.get(scheduleId);
  if (!job || job.status !== "pending") return false;
  job.status = "cancelled";
  return true;
}

/**
 * Get schedule status
 */
export function getScheduleStatus(scheduleId: string): ScheduledJob | undefined {
  return pendingSchedules.get(scheduleId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO MODE EXECUTOR (EVENT-DRIVEN TRIGGERS)
// ═══════════════════════════════════════════════════════════════════════════════

// Active trigger subscriptions
const activeTriggers = new Map<string, { unsubscribe: () => void; config: AutoModeConfig }>();

/**
 * Register an automatic trigger
 * Messages will be sent when trigger conditions are met
 */
export function registerAutoTrigger(config: AutoModeConfig): string {
  // Validate template exists
  resolveTemplateById(config.templateId, { teamId: config.teamId });

  const triggerId = `trig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  let eventType: EventType;
  let handler: (event: OrchestrationEvent) => Promise<void>;

  switch (config.trigger.type) {
    case "lead_responded":
      eventType = "conversation.message_received";
      handler = async (event) => {
        // Filter by sentiment if specified
        if (config.trigger.type === "lead_responded" && config.trigger.sentimentFilter) {
          const sentiment = event.payload.sentiment as string | undefined;
          if (sentiment !== config.trigger.sentimentFilter) return;
        }
        await sendAutoMessage(config, event);
      };
      break;

    case "lead_stage_changed":
      eventType = "lead.stage_changed";
      handler = async (event) => {
        if (config.trigger.type !== "lead_stage_changed") return;
        const { toStage, fromStage } = config.trigger;
        if (event.context?.newState !== toStage) return;
        if (fromStage && event.context?.previousState !== fromStage) return;
        await sendAutoMessage(config, event);
      };
      break;

    case "meeting_booked":
      eventType = "deal.call_booked";
      handler = async (event) => {
        // Confirmation message
        await sendAutoMessage(config, event);
      };
      break;

    case "email_captured":
      eventType = "lead.enriched";
      handler = async (event) => {
        if (!event.payload.email) return;
        await sendAutoMessage(config, event);
      };
      break;

    case "custom_event":
      eventType = config.trigger.eventType;
      handler = async (event) => {
        await sendAutoMessage(config, event);
      };
      break;

    default:
      throw new Error(`Unknown trigger type: ${(config.trigger as { type: string }).type}`);
  }

  // Subscribe to event bus
  const subscriptionId = eventBus.subscribe(eventType, handler);

  activeTriggers.set(triggerId, {
    unsubscribe: () => eventBus.unsubscribe(subscriptionId),
    config,
  });

  console.log(`[AutoTrigger] Registered ${config.trigger.type} trigger: ${triggerId}`);

  return triggerId;
}

/**
 * Send message when auto trigger fires
 */
async function sendAutoMessage(config: AutoModeConfig, event: OrchestrationEvent): Promise<void> {
  // Build recipient from event
  const leadId = event.entity.entityId;
  const phone = event.payload.phone as string || event.payload.recipientPhone as string;

  if (!phone) {
    console.warn(`[AutoTrigger] No phone in event for lead ${leadId}`);
    return;
  }

  // Build variables from event context
  const variables: Record<string, string> = {
    firstName: (event.payload.firstName as string) || "",
    name: (event.payload.name as string) || (event.payload.firstName as string) || "",
    ...Object.fromEntries(
      Object.entries(event.payload)
        .filter(([, v]) => typeof v === "string")
        .map(([k, v]) => [k, v as string])
    ),
  };

  try {
    await executeSMS({
      templateId: config.templateId,
      to: phone,
      variables,
      leadId,
      teamId: config.teamId,
      campaignId: config.campaignId,
      worker: config.worker,
      trainingMode: config.trainingMode,
    });
    console.log(`[AutoTrigger] Sent ${config.templateId} to ${phone}`);
  } catch (error) {
    console.error(`[AutoTrigger] Failed to send to ${phone}:`, error);
  }
}

/**
 * Unregister an auto trigger
 */
export function unregisterAutoTrigger(triggerId: string): boolean {
  const trigger = activeTriggers.get(triggerId);
  if (!trigger) return false;
  trigger.unsubscribe();
  activeTriggers.delete(triggerId);
  return true;
}

/**
 * Get active triggers
 */
export function getActiveTriggers(): Array<{ id: string; config: AutoModeConfig }> {
  return Array.from(activeTriggers.entries()).map(([id, { config }]) => ({ id, config }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

export type ExecutionConfig = BlastModeConfig | ScheduledModeConfig | AutoModeConfig;

/**
 * Unified SMS executor - routes to appropriate mode handler
 */
export async function executeSMSCampaign(config: ExecutionConfig): Promise<ExecutionResult | string> {
  switch (config.mode) {
    case "blast":
      return executeBlast(config);
    case "scheduled":
      return executeScheduled(config);
    case "auto":
      return registerAutoTrigger(config);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Mode executors
  executeBlast,
  executeScheduled,
  registerAutoTrigger,

  // Unified executor
  executeSMSCampaign,

  // Schedule management
  cancelSchedule,
  getScheduleStatus,

  // Trigger management
  unregisterAutoTrigger,
  getActiveTriggers,
};
