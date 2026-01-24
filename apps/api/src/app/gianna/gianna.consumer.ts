import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { SignalHouseService } from "@/lib/signalhouse/signalhouse.service";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { messagesTable } from "@/database/schema-alias";
import { MessageDirection, MessageType } from "@nextier/common";
import { GIANNA_QUEUE } from "./gianna.constants";

/**
 * GIANNA CONSUMER - Processes GIANNA Queue Jobs
 *
 * Job Types:
 * - send-sms: Send SMS via SignalHouse
 * - escalate-sabrina: Hand off to SABRINA for scheduling
 * - escalate-cathy: Hand off to CATHY for nurturing
 */

interface SendSmsJob {
  teamId: string;
  leadId: string;
  toPhone: string;
  fromPhone: string;
  message: string;
  campaignId?: string;
  context?: Record<string, unknown>;
}

interface EscalateJob {
  teamId: string;
  leadId: string;
  phone: string;
  reason: string;
  lastMessage: string;
  context?: Record<string, unknown>;
}

@Processor(GIANNA_QUEUE)
export class GiannaConsumer extends WorkerHost {
  private readonly logger = new Logger(GiannaConsumer.name);
  private readonly defaultCampaignId: string;
  private readonly giannaPhone: string;

  constructor(
    private config: ConfigService,
    private signalHouse: SignalHouseService,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
    this.defaultCampaignId = this.config.get("SIGNALHOUSE_CAMPAIGN_ID") || "";
    this.giannaPhone = this.config.get("GIANNA_PHONE_NUMBER") || "";
  }

  async process(job: Job): Promise<unknown> {
    this.logger.log(`[GIANNA] Processing job ${job.name} - ${job.id}`);

    switch (job.name) {
      case "send-sms":
        return this.handleSendSms(job.data as SendSmsJob);
      case "escalate-sabrina":
        return this.handleEscalateToSabrina(job.data as EscalateJob);
      case "escalate-cathy":
        return this.handleEscalateToCathy(job.data as EscalateJob);
      default:
        this.logger.warn(`[GIANNA] Unknown job type: ${job.name}`);
        return { success: false, error: "Unknown job type" };
    }
  }

  /**
   * Send SMS via SignalHouse
   */
  private async handleSendSms(data: SendSmsJob): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { teamId, leadId, toPhone, fromPhone, message, campaignId } = data;

    this.logger.log(`[GIANNA] Sending SMS to ${toPhone}`);

    try {
      // Send via SignalHouse
      const result = await this.signalHouse.sendSms({
        to: this.formatPhone(toPhone),
        from: this.formatPhone(fromPhone || this.giannaPhone),
        message,
        campaignId: campaignId || this.defaultCampaignId,
      });

      if (result.success) {
        // Log message to database
        await this.db.insert(messagesTable).values({
          teamId,
          leadId,
          body: message,
          type: MessageType.SMS,
          direction: MessageDirection.OUTBOUND,
          fromAddress: fromPhone || this.giannaPhone,
          toAddress: toPhone,
          metadata: {
            agent: "gianna",
            messageId: result.messageId,
            source: "gianna_consumer",
          },
        });

        this.logger.log(`[GIANNA] SMS sent successfully: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
      }

      this.logger.error(`[GIANNA] SMS failed: ${result.error}`);
      return { success: false, error: result.error };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`[GIANNA] SMS error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Escalate to SABRINA (scheduling/closing)
   */
  private async handleEscalateToSabrina(data: EscalateJob): Promise<{ success: boolean }> {
    const { teamId, leadId, reason } = data;

    this.logger.log(`[GIANNA] Escalating to SABRINA - Lead: ${leadId}, Reason: ${reason}`);

    // Log the escalation (using SMS type with metadata to mark as system)
    await this.db.insert(messagesTable).values({
      teamId,
      leadId,
      body: `[ESCALATION] GIANNA → SABRINA: ${reason}`,
      type: MessageType.SMS,
      direction: MessageDirection.OUTBOUND,
      fromAddress: "system:gianna",
      toAddress: "system:sabrina",
      metadata: {
        escalation: true,
        fromAgent: "gianna",
        toAgent: "sabrina",
        reason,
        isSystemMessage: true,
      },
    });

    // SABRINA will pick up from inbox service

    return { success: true };
  }

  /**
   * Escalate to CATHY (nurturing)
   */
  private async handleEscalateToCathy(data: EscalateJob): Promise<{ success: boolean }> {
    const { teamId, leadId, reason } = data;

    this.logger.log(`[GIANNA] Escalating to CATHY - Lead: ${leadId}, Reason: ${reason}`);

    // Log the escalation
    await this.db.insert(messagesTable).values({
      teamId,
      leadId,
      body: `[ESCALATION] GIANNA → CATHY: ${reason}`,
      type: MessageType.SMS,
      direction: MessageDirection.OUTBOUND,
      fromAddress: "system:gianna",
      toAddress: "system:cathy",
      metadata: {
        escalation: true,
        fromAgent: "gianna",
        toAgent: "cathy",
        reason,
        isSystemMessage: true,
      },
    });

    // CATHY will pick up from nurture queue

    return { success: true };
  }

  private formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }
    return `+${digits}`;
  }
}
