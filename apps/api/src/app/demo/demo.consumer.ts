import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { SignalHouseService } from "@/lib/signalhouse/signalhouse.service";
import { DEMO_QUEUE } from "./demo.constants";

/**
 * DEMO CONSUMER - Processes SMS sending jobs
 *
 * Uses the SignalHouse service for actual SMS delivery
 */

interface SendSmsJob {
  teamId: string;
  leadId: string;
  toPhone: string;
  fromPhone: string;
  message: string;
  campaignId?: string;
  batchId?: string;
}

@Processor(DEMO_QUEUE)
export class DemoConsumer extends WorkerHost {
  private readonly logger = new Logger(DemoConsumer.name);
  private readonly defaultCampaignId: string;

  constructor(
    private config: ConfigService,
    private signalHouse: SignalHouseService,
  ) {
    super();
    this.defaultCampaignId = this.config.get("SIGNALHOUSE_CAMPAIGN_ID") || "";
  }

  async process(job: Job<SendSmsJob>): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { toPhone, fromPhone, message, campaignId, batchId } = job.data;

    this.logger.log(`[DEMO] Processing SMS job ${job.id} - to: ${toPhone}, batch: ${batchId || "none"}`);

    try {
      // Use the SignalHouse service for actual delivery
      const result = await this.signalHouse.sendSms({
        to: this.formatPhone(toPhone),
        from: this.formatPhone(fromPhone),
        message,
        campaignId: campaignId || this.defaultCampaignId,
      });

      if (result.success) {
        this.logger.log(`[DEMO] SMS sent successfully: ${result.messageId}`);
        return {
          success: true,
          messageId: result.messageId,
        };
      } else {
        this.logger.error(`[DEMO] SMS send failed: ${result.error}`);

        // For demo mode, we can still mark as "sent" to not block the flow
        if (this.config.get("DEMO_MODE") === "true") {
          return { success: true, messageId: `demo_${Date.now()}` };
        }

        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`[DEMO] SMS send failed: ${errorMsg}`);

      // For demo, we can still mark as "sent" to not block the flow
      if (this.config.get("DEMO_MODE") === "true") {
        return { success: true, messageId: `demo_${Date.now()}` };
      }

      return { success: false, error: errorMsg };
    }
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
