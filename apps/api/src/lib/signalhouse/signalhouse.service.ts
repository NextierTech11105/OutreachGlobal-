import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

export interface SignalHouseSendSmsOptions {
  to: string;
  from: string;
  message: string;
  campaignId?: string; // SignalHouse campaign ID for 10DLC compliance
  mediaUrl?: string;
}

export interface SignalHouseSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SignalHouseService {
  private readonly logger = new Logger(SignalHouseService.name);
  private readonly apiBase = "https://api.signalhouse.io/api/v1";

  constructor(private configService: ConfigService) {}

  private getApiKey(): string {
    return this.configService.get("SIGNALHOUSE_API_KEY") || "";
  }

  async sendSms(
    options: SignalHouseSendSmsOptions,
  ): Promise<SignalHouseSendResult> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      this.logger.error("SignalHouse API key not configured");
      return { success: false, error: "SignalHouse API key not configured" };
    }

    const { to, from, message, campaignId, mediaUrl } = options;

    try {
      const endpoint = mediaUrl
        ? `${this.apiBase}/message/sendMMS`
        : `${this.apiBase}/message/sendSMS`;

      // Build payload with campaign_id for 10DLC tracking
      const payload: Record<string, string> = { to, from, message };
      if (mediaUrl) payload.mediaUrl = mediaUrl;
      if (campaignId) payload.campaign_id = campaignId;

      this.logger.log(
        `Sending SMS via SignalHouse: to=${to}, from=${from}, campaign=${campaignId || "none"}`,
      );

      const response = await axios.post(endpoint, payload, {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      });

      return {
        success: true,
        messageId: response.data.messageId || response.data.id,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errMsg =
          error.response?.data?.message || "Failed to send message";
        this.logger.error(`SignalHouse send failed: ${errMsg}`);
        return { success: false, error: errMsg };
      }
      this.logger.error(`SignalHouse send failed: ${error}`);
      return { success: false, error: "Failed to send message" };
    }
  }
}
