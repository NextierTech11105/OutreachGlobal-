import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { InjectQueue } from "@nestjs/bullmq";
import { eq, and, sql } from "drizzle-orm";
import { leadsTable } from "@/database/schema-alias";
import {
  autoTriggers,
  triggerExecutions,
  TriggerType,
  AutoTrigger,
} from "@/database/schema/auto-triggers.schema";
import { LeadEventService } from "../services/lead-event.service";
import { DeadLetterQueueService } from "@/lib/dlq";
import {
  validateTenantJob,
  logTenantContext,
} from "@/lib/queue/tenant-queue.util";
import { LeadEventType, LeadState } from "@/database/schema/canonical-lead-state.schema";

// Job data types
export interface ProcessEventJobData {
  teamId: string;
  leadId: string;
  eventType: LeadEventType;
  eventData: Record<string, unknown>;
}

export interface ExecuteTriggerJobData {
  teamId: string;
  leadId: string;
  triggerId: string;
  eventType: string;
  eventData: Record<string, unknown>;
}

export interface CheckNoResponseJobData {
  teamId: string;
  leadId: string;
  daysWithoutResponse: number;
}

// Trigger config types (all fields optional for safe parsing)
interface NoResponseConfig {
  daysWithoutResponse?: number;
}

interface StageChangedConfig {
  targetStage?: LeadState;
}

interface SentimentConfig {
  minConfidence?: number;
}

export const AUTO_TRIGGER_QUEUE = "auto-trigger";

@Processor(AUTO_TRIGGER_QUEUE, { concurrency: 10, lockDuration: 30000 })
export class AutoTriggerConsumer extends WorkerHost {
  private readonly logger = new Logger(AutoTriggerConsumer.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    @InjectQueue(AUTO_TRIGGER_QUEUE) private triggerQueue: Queue,
    private leadEventService: LeadEventService,
    private dlqService: DeadLetterQueueService,
  ) {
    super();
  }

  async process(
    job: Job<ProcessEventJobData | ExecuteTriggerJobData | CheckNoResponseJobData>,
  ): Promise<unknown> {
    // P0: Validate tenant isolation
    validateTenantJob(job, AUTO_TRIGGER_QUEUE);
    logTenantContext(AUTO_TRIGGER_QUEUE, job, "Processing");

    switch (job.name) {
      case "PROCESS_EVENT":
        return this.processEvent(job.data as ProcessEventJobData);

      case "EXECUTE_TRIGGER":
        return this.executeTrigger(job.data as ExecuteTriggerJobData);

      case "CHECK_NO_RESPONSE":
        return this.checkNoResponse(job.data as CheckNoResponseJobData);

      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  /**
   * Process a lead event and find matching triggers
   */
  async processEvent(data: ProcessEventJobData): Promise<void> {
    const { teamId, leadId, eventType, eventData } = data;

    this.logger.log(`Processing event ${eventType} for lead ${leadId}`);

    // Map event types to trigger types
    const triggerType = this.mapEventToTriggerType(eventType, eventData);
    if (!triggerType) {
      this.logger.debug(`No trigger type for event ${eventType}`);
      return;
    }

    // Find matching enabled triggers
    const matchingTriggers = await this.db
      .select()
      .from(autoTriggers)
      .where(
        and(
          eq(autoTriggers.teamId, teamId),
          eq(autoTriggers.type, triggerType),
          eq(autoTriggers.enabled, true),
        ),
      );

    if (matchingTriggers.length === 0) {
      this.logger.debug(`No triggers configured for ${triggerType}`);
      return;
    }

    this.logger.log(
      `Found ${matchingTriggers.length} triggers for ${triggerType}`,
    );

    // Queue execution for each matching trigger
    for (const trigger of matchingTriggers) {
      if (this.shouldFireTrigger(trigger, eventData)) {
        await this.triggerQueue.add(
          "EXECUTE_TRIGGER",
          {
            teamId,
            leadId,
            triggerId: trigger.id,
            eventType,
            eventData,
          } as ExecuteTriggerJobData,
          {
            jobId: `trigger-${trigger.id}-${leadId}-${Date.now()}`,
            removeOnComplete: true,
          },
        );
      }
    }
  }

  /**
   * Execute a single trigger (send template)
   */
  async executeTrigger(data: ExecuteTriggerJobData): Promise<void> {
    const { teamId, leadId, triggerId, eventType, eventData } = data;

    // Get trigger details
    const trigger = await this.db.query.autoTriggers.findFirst({
      where: eq(autoTriggers.id, triggerId),
    });

    if (!trigger || !trigger.enabled) {
      this.logger.warn(`Trigger ${triggerId} not found or disabled`);
      return;
    }

    // Get lead
    const lead = await this.db.query.leads.findFirst({
      where: and(eq(leadsTable.id, leadId), eq(leadsTable.teamId, teamId)),
    });

    if (!lead) {
      this.logger.warn(`Lead ${leadId} not found`);
      return;
    }

    // Check if lead is suppressed
    if (lead.leadState === "suppressed") {
      this.logger.log(`Lead ${leadId} is suppressed, skipping trigger`);
      return;
    }

    this.logger.log(
      `Executing trigger "${trigger.name}" for lead ${leadId}`,
    );

    // Create execution record
    const [execution] = await this.db
      .insert(triggerExecutions)
      .values({
        teamId,
        triggerId,
        leadId,
        status: "pending",
        eventType,
        eventData,
      })
      .returning();

    try {
      // Send the template
      await this.sendTriggerTemplate(lead, trigger);

      // Update execution status
      await this.db
        .update(triggerExecutions)
        .set({
          status: "sent",
          sentAt: new Date(),
        })
        .where(eq(triggerExecutions.id, execution.id));

      // Update trigger stats
      await this.db
        .update(autoTriggers)
        .set({
          firedCount: sql`${autoTriggers.firedCount} + 1`,
          lastFiredAt: new Date(),
        })
        .where(eq(autoTriggers.id, triggerId));

      // Record event
      await this.leadEventService.recordEvent({
        tenantId: teamId,
        teamId,
        leadId,
        eventType: "SMS_SENT",
        eventSource: "auto_trigger",
        payload: {
          triggerId,
          triggerName: trigger.name,
          triggerType: trigger.type,
          templateId: trigger.templateId,
        },
      });

      this.logger.log(
        `Trigger "${trigger.name}" executed successfully for lead ${leadId}`,
      );
    } catch (error) {
      // Update execution with failure
      await this.db
        .update(triggerExecutions)
        .set({
          status: "failed",
          failedAt: new Date(),
          failedReason: error instanceof Error ? error.message : String(error),
        })
        .where(eq(triggerExecutions.id, execution.id));

      throw error;
    }
  }

  /**
   * Check if lead has had no response for N days
   * Called by scheduler to trigger no_response triggers
   */
  async checkNoResponse(data: CheckNoResponseJobData): Promise<void> {
    const { teamId, leadId, daysWithoutResponse } = data;

    const lead = await this.db.query.leads.findFirst({
      where: and(eq(leadsTable.id, leadId), eq(leadsTable.teamId, teamId)),
    });

    if (!lead) return;

    // Only check leads in touched or retargeting state
    if (lead.leadState !== "touched" && lead.leadState !== "retargeting") {
      return;
    }

    // Check last response time from events
    const events = await this.leadEventService.getRecentEvents(leadId, 20);
    const lastResponse = events.find(
      (e) => e.eventType === "SMS_RECEIVED" || e.eventType === "EMAIL_RECEIVED",
    );

    if (lastResponse) {
      // Lead has responded, don't trigger
      return;
    }

    // Find last outbound
    const lastOutbound = events.find(
      (e) => e.eventType === "SMS_SENT" || e.eventType === "EMAIL_SENT",
    );

    if (!lastOutbound) {
      return;
    }

    const daysSinceOutbound = Math.floor(
      (Date.now() - new Date(lastOutbound.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysSinceOutbound >= daysWithoutResponse) {
      this.logger.log(
        `Lead ${leadId} has not responded in ${daysSinceOutbound} days`,
      );

      // Queue event processing
      await this.triggerQueue.add("PROCESS_EVENT", {
        teamId,
        leadId,
        eventType: "TIMER_7D" as LeadEventType, // Using timer event type
        eventData: {
          daysWithoutResponse: daysSinceOutbound,
          triggerReason: "no_response_check",
        },
      } as ProcessEventJobData);
    }
  }

  /**
   * Map lead event types to trigger types
   */
  private mapEventToTriggerType(
    eventType: LeadEventType,
    eventData: Record<string, unknown>,
  ): TriggerType | null {
    switch (eventType) {
      case "SMS_RECEIVED":
      case "EMAIL_RECEIVED":
        // Check sentiment if available
        if (eventData.sentiment === "positive") {
          return "positive_sentiment";
        }
        if (eventData.sentiment === "negative") {
          return "negative_sentiment";
        }
        return "lead_responded";

      case "MEETING_REQUESTED":
        return "meeting_booked";

      case "TIMER_7D":
      case "TIMER_14D":
        return "no_response";

      default:
        return null;
    }
  }

  /**
   * Check if trigger should fire based on config
   */
  private shouldFireTrigger(
    trigger: AutoTrigger,
    eventData: Record<string, unknown>,
  ): boolean {
    const config = trigger.config as Record<string, unknown>;

    switch (trigger.type) {
      case "no_response": {
        const noResponseConfig = config as NoResponseConfig;
        const days = (eventData.daysWithoutResponse as number) || 0;
        return days >= (noResponseConfig.daysWithoutResponse || 7);
      }

      case "stage_changed": {
        const stageConfig = config as StageChangedConfig;
        const newStage = eventData.newState as LeadState;
        return newStage === stageConfig.targetStage;
      }

      case "positive_sentiment":
      case "negative_sentiment": {
        const sentimentConfig = config as SentimentConfig;
        const confidence = (eventData.confidence as number) || 0;
        return confidence >= (sentimentConfig.minConfidence || 70);
      }

      case "lead_responded":
      case "meeting_booked":
        // These trigger on any match
        return true;

      default:
        return true;
    }
  }

  /**
   * Send the trigger's template to the lead
   */
  private async sendTriggerTemplate(
    lead: typeof leadsTable.$inferSelect,
    trigger: AutoTrigger,
  ): Promise<void> {
    // Personalize template
    // TODO: Fetch actual template content from templates table
    const templateContent = `Hi ${lead.firstName || "there"}, this is an automated follow-up...`;

    this.logger.log(
      `[AUTO-TRIGGER SMS] To: ${lead.phone}, Template: ${trigger.templateName}`,
    );

    // TODO: Integrate with actual SMS sending service (SignalHouse)
    // For now, just log the intent
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `Auto-trigger job ${job.id} failed: ${error.message}`,
      error.stack,
    );
    await this.dlqService.recordBullMQFailure(AUTO_TRIGGER_QUEUE, job, error);
  }
}

/**
 * Helper service to queue events for trigger processing
 * Can be injected into other services to trigger auto-triggers
 */
export class AutoTriggerService {
  constructor(
    @InjectQueue(AUTO_TRIGGER_QUEUE) private triggerQueue: Queue,
  ) {}

  /**
   * Queue a lead event for trigger processing
   */
  async queueEvent(
    teamId: string,
    leadId: string,
    eventType: LeadEventType,
    eventData: Record<string, unknown> = {},
  ): Promise<void> {
    await this.triggerQueue.add("PROCESS_EVENT", {
      teamId,
      leadId,
      eventType,
      eventData,
    } as ProcessEventJobData);
  }
}
