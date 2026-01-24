import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { DEMO_QUEUE } from "./demo.module";

/**
 * DEMO CONSUMER - Processes SMS sending jobs
 *
 * Handles the actual SMS delivery via SignalHouse API
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
  private readonly signalhouseApiKey: string;
  private readonly signalhouseApiUrl: string;

  constructor(private config: ConfigService) {
    super();
    this.signalhouseApiKey = this.config.get("SIGNALHOUSE_API_KEY") || "";
    this.signalhouseApiUrl = this.config.get("SIGNALHOUSE_API_URL") || "https://api.signalhouse.io/v1";
  }

  async process(job: Job<SendSmsJob>): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { teamId, leadId, toPhone, fromPhone, message, batchId } = job.data;

    this.logger.log(`[DEMO] Processing SMS job ${job.id} - to: ${toPhone}, batch: ${batchId || "none"}`);

    try {
      // Check if we have API credentials
      if (!this.signalhouseApiKey) {
        this.logger.warn(`[DEMO] No SignalHouse API key - simulating send`);
        // Simulate success for demo purposes
        await this.simulateSend(toPhone, message);
        return { success: true, messageId: `sim_${Date.now()}` };
      }

      // Real SignalHouse API call
      const response = await fetch(`${this.signalhouseApiUrl}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.signalhouseApiKey}`,
        },
        body: JSON.stringify({
          to: this.formatPhone(toPhone),
          from: this.formatPhone(fromPhone),
          body: message,
          metadata: {
            teamId,
            leadId,
            batchId,
            source: "demo_platform",
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`[DEMO] SignalHouse error: ${error}`);
        throw new Error(`SignalHouse API error: ${response.status}`);
      }

      const result = await response.json();
      this.logger.log(`[DEMO] SMS sent successfully: ${result.messageId || result.id}`);

      return {
        success: true,
        messageId: result.messageId || result.id,
      };
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

  private async simulateSend(toPhone: string, message: string): Promise<void> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    this.logger.debug(`[DEMO SIMULATE] Would send to ${toPhone}: "${message.substring(0, 50)}..."`);
  }
}
