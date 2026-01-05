import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { InjectQueue } from "@nestjs/bullmq";
import { eq, and, isNull, lte, sql } from "drizzle-orm";
import { leadsTable } from "@/database/schema-alias";
import { LeadEventService } from "../services/lead-event.service";
import { DeadLetterQueueService } from "@/lib/dlq";
import {
  validateTenantJob,
  logTenantContext,
} from "@/lib/queue/tenant-queue.util";

// Nurture sequence types
export interface NurtureStep {
  stepNumber: number;
  channel: "sms" | "mms" | "email";
  templateId: string;
  templateContent: string;
  delayMs: number; // Delay before sending (0 for first message)
  mediaUrl?: string; // For MMS
  linkUrl?: string; // For link tracking
}

export interface NurtureSequence {
  id: string;
  name: string;
  teamId: string;
  steps: NurtureStep[];
  escalationTrigger?: {
    responseKeywords: string[];
    targetState: "high_intent" | "appointment_booked";
  };
}

// Job data types
export interface EnrollNurtureJobData {
  leadId: string;
  teamId: string;
  sequenceId: string;
  enrolledBy: string;
}

export interface ExecuteNurtureStepJobData {
  leadId: string;
  teamId: string;
  sequenceId: string;
  stepNumber: number;
  step: NurtureStep;
}

export interface CheckNurtureEscalationJobData {
  leadId: string;
  teamId: string;
  sequenceId: string;
}

export const CONTENT_NURTURE_QUEUE = "content-nurture";

@Processor(CONTENT_NURTURE_QUEUE, { concurrency: 10, lockDuration: 30000 })
export class ContentNurtureConsumer extends WorkerHost {
  private readonly logger = new Logger(ContentNurtureConsumer.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    @InjectQueue(CONTENT_NURTURE_QUEUE) private nurtureQueue: Queue,
    private leadEventService: LeadEventService,
    private dlqService: DeadLetterQueueService,
  ) {
    super();
  }

  async process(
    job: Job<
      EnrollNurtureJobData | ExecuteNurtureStepJobData | CheckNurtureEscalationJobData
    >,
  ): Promise<unknown> {
    // P0: Validate tenant isolation
    validateTenantJob(job, CONTENT_NURTURE_QUEUE);
    logTenantContext(CONTENT_NURTURE_QUEUE, job, "Processing");

    switch (job.name) {
      case "ENROLL_NURTURE":
        return this.enrollInNurture(job.data as EnrollNurtureJobData);

      case "EXECUTE_STEP":
        return this.executeNurtureStep(job.data as ExecuteNurtureStepJobData);

      case "CHECK_ESCALATION":
        return this.checkForEscalation(job.data as CheckNurtureEscalationJobData);

      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  /**
   * Enroll a lead in a nurture sequence
   * Schedules all steps with appropriate delays
   */
  async enrollInNurture(data: EnrollNurtureJobData): Promise<void> {
    const { leadId, teamId, sequenceId, enrolledBy } = data;

    // Verify lead exists and is in content_nurture state
    const lead = await this.db.query.leads.findFirst({
      where: and(eq(leadsTable.id, leadId), eq(leadsTable.teamId, teamId)),
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    if (lead.leadState !== "content_nurture") {
      this.logger.warn(
        `Lead ${leadId} is not in content_nurture state (current: ${lead.leadState}), skipping enrollment`,
      );
      return;
    }

    // Get the nurture sequence
    const sequence = await this.getNurtureSequence(teamId, sequenceId);
    if (!sequence) {
      throw new Error(`Nurture sequence ${sequenceId} not found`);
    }

    this.logger.log(
      `Enrolling lead ${leadId} in nurture sequence "${sequence.name}" (${sequence.steps.length} steps)`,
    );

    // Schedule each step with cumulative delays
    let cumulativeDelay = 0;
    for (const step of sequence.steps) {
      cumulativeDelay += step.delayMs;

      await this.nurtureQueue.add(
        "EXECUTE_STEP",
        {
          leadId,
          teamId,
          sequenceId,
          stepNumber: step.stepNumber,
          step,
        } as ExecuteNurtureStepJobData,
        {
          delay: cumulativeDelay,
          jobId: `nurture-${leadId}-${sequenceId}-step-${step.stepNumber}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    // Record enrollment event
    await this.leadEventService.recordEvent({
      tenantId: teamId,
      teamId,
      leadId,
      eventType: "EMAIL_SENT", // Using as generic content event
      eventSource: "content_nurture",
      payload: {
        action: "enrolled",
        sequenceId,
        sequenceName: sequence.name,
        totalSteps: sequence.steps.length,
        enrolledBy,
      },
    });

    this.logger.log(
      `Scheduled ${sequence.steps.length} nurture steps for lead ${leadId}`,
    );
  }

  /**
   * Execute a single nurture step (send message)
   */
  async executeNurtureStep(data: ExecuteNurtureStepJobData): Promise<void> {
    const { leadId, teamId, sequenceId, stepNumber, step } = data;

    // Re-verify lead is still in content_nurture state
    const lead = await this.db.query.leads.findFirst({
      where: and(eq(leadsTable.id, leadId), eq(leadsTable.teamId, teamId)),
    });

    if (!lead) {
      this.logger.warn(`Lead ${leadId} not found, skipping step ${stepNumber}`);
      return;
    }

    // Check if lead has moved out of nurture (responded, escalated, suppressed)
    if (lead.leadState !== "content_nurture") {
      this.logger.log(
        `Lead ${leadId} no longer in content_nurture (now: ${lead.leadState}), cancelling remaining steps`,
      );
      await this.cancelRemainingSteps(leadId, sequenceId, stepNumber);
      return;
    }

    this.logger.log(
      `Executing nurture step ${stepNumber} for lead ${leadId} via ${step.channel}`,
    );

    // Execute based on channel type
    switch (step.channel) {
      case "sms":
        await this.sendSmsNurture(lead, step);
        break;

      case "mms":
        await this.sendMmsNurture(lead, step);
        break;

      case "email":
        await this.sendEmailNurture(lead, step);
        break;
    }

    // Record step execution event
    await this.leadEventService.recordEvent({
      tenantId: teamId,
      teamId,
      leadId,
      eventType: step.channel === "email" ? "EMAIL_SENT" : "SMS_SENT",
      eventSource: "content_nurture",
      payload: {
        sequenceId,
        stepNumber,
        channel: step.channel,
        templateId: step.templateId,
        linkUrl: step.linkUrl,
      },
    });

    // Schedule escalation check after this step
    await this.nurtureQueue.add(
      "CHECK_ESCALATION",
      {
        leadId,
        teamId,
        sequenceId,
      } as CheckNurtureEscalationJobData,
      {
        delay: 60 * 60 * 1000, // Check 1 hour after each message
        jobId: `nurture-escalation-${leadId}-${stepNumber}`,
        removeOnComplete: true,
      },
    );
  }

  /**
   * Check if lead should be escalated based on response
   */
  async checkForEscalation(data: CheckNurtureEscalationJobData): Promise<void> {
    const { leadId, teamId, sequenceId } = data;

    const lead = await this.db.query.leads.findFirst({
      where: and(eq(leadsTable.id, leadId), eq(leadsTable.teamId, teamId)),
    });

    if (!lead) return;

    // If lead has already moved to a higher state, nothing to do
    if (
      lead.leadState === "high_intent" ||
      lead.leadState === "appointment_booked" ||
      lead.leadState === "in_call_queue" ||
      lead.leadState === "closed"
    ) {
      this.logger.log(`Lead ${leadId} already escalated to ${lead.leadState}`);
      return;
    }

    // Get sequence escalation triggers
    const sequence = await this.getNurtureSequence(teamId, sequenceId);
    if (!sequence?.escalationTrigger) return;

    // Check recent events for response indicators
    const recentEvents = await this.leadEventService.getRecentEvents(leadId, 5);
    const hasResponse = recentEvents.some(
      (e) => e.eventType === "SMS_RECEIVED" || e.eventType === "EMAIL_RECEIVED",
    );

    if (hasResponse) {
      this.logger.log(
        `Lead ${leadId} responded during nurture - checking for escalation keywords`,
      );
      // Actual keyword matching would go here
      // For now, any response during nurture is considered escalation-worthy
    }
  }

  /**
   * Cancel remaining nurture steps for a lead
   */
  private async cancelRemainingSteps(
    leadId: string,
    sequenceId: string,
    afterStep: number,
  ): Promise<void> {
    // Find and remove scheduled jobs
    const jobs = await this.nurtureQueue.getDelayed();
    for (const job of jobs) {
      if (
        job.data.leadId === leadId &&
        job.data.sequenceId === sequenceId &&
        job.data.stepNumber > afterStep
      ) {
        await job.remove();
        this.logger.debug(`Cancelled nurture job ${job.id}`);
      }
    }
  }

  /**
   * Get nurture sequence by ID
   * TODO: Move to a NurtureSequenceService when sequences are stored in DB
   */
  private async getNurtureSequence(
    teamId: string,
    sequenceId: string,
  ): Promise<NurtureSequence | null> {
    // For now, return a default sequence
    // This should be replaced with DB lookup when nurture_sequences table is created
    const defaultSequence: NurtureSequence = {
      id: sequenceId,
      name: "Default Nurture Sequence",
      teamId,
      steps: [
        {
          stepNumber: 1,
          channel: "sms",
          templateId: "nurture-1",
          templateContent: "Hi {{firstName}}, wanted to share some resources that might help...",
          delayMs: 0,
          linkUrl: "https://example.com/resource-1",
        },
        {
          stepNumber: 2,
          channel: "email",
          templateId: "nurture-2",
          templateContent: "Following up with more details...",
          delayMs: 2 * 24 * 60 * 60 * 1000, // 2 days
        },
        {
          stepNumber: 3,
          channel: "sms",
          templateId: "nurture-3",
          templateContent: "Quick check-in - any questions about what I shared?",
          delayMs: 4 * 24 * 60 * 60 * 1000, // 4 days after previous
        },
      ],
      escalationTrigger: {
        responseKeywords: ["interested", "yes", "tell me more", "schedule"],
        targetState: "high_intent",
      },
    };

    return defaultSequence;
  }

  /**
   * Send SMS nurture message
   */
  private async sendSmsNurture(
    lead: typeof leadsTable.$inferSelect,
    step: NurtureStep,
  ): Promise<void> {
    // Personalize template
    const content = this.personalizeTemplate(step.templateContent, lead);

    // Add link if present
    const finalContent = step.linkUrl
      ? `${content}\n\n${step.linkUrl}`
      : content;

    this.logger.log(
      `[NURTURE SMS] To: ${lead.phone}, Template: ${step.templateId}`,
    );

    // TODO: Integrate with actual SMS sending service (SignalHouse)
    // For now, just log the intent
  }

  /**
   * Send MMS nurture message
   */
  private async sendMmsNurture(
    lead: typeof leadsTable.$inferSelect,
    step: NurtureStep,
  ): Promise<void> {
    const content = this.personalizeTemplate(step.templateContent, lead);

    this.logger.log(
      `[NURTURE MMS] To: ${lead.phone}, Template: ${step.templateId}, Media: ${step.mediaUrl}`,
    );

    // TODO: Integrate with MMS sending service
  }

  /**
   * Send email nurture message
   */
  private async sendEmailNurture(
    lead: typeof leadsTable.$inferSelect,
    step: NurtureStep,
  ): Promise<void> {
    if (!lead.email) {
      this.logger.warn(`Lead ${lead.id} has no email, skipping email step`);
      return;
    }

    const content = this.personalizeTemplate(step.templateContent, lead);

    this.logger.log(
      `[NURTURE EMAIL] To: ${lead.email}, Template: ${step.templateId}`,
    );

    // TODO: Integrate with email sending service (SendGrid)
  }

  /**
   * Personalize template with lead data
   */
  private personalizeTemplate(
    template: string,
    lead: typeof leadsTable.$inferSelect,
  ): string {
    return template
      .replace(/\{\{firstName\}\}/g, lead.firstName || "there")
      .replace(/\{\{lastName\}\}/g, lead.lastName || "")
      .replace(/\{\{company\}\}/g, lead.company || "your company")
      .replace(/\{\{email\}\}/g, lead.email || "");
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `Content nurture job ${job.id} failed: ${error.message}`,
      error.stack,
    );
    await this.dlqService.recordBullMQFailure(CONTENT_NURTURE_QUEUE, job, error);
  }
}
