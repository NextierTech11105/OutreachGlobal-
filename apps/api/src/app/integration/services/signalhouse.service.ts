import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface SignalHouseSendSmsOptions {
  to: string;
  from: string;
  message: string;
  campaignId?: string;
}

export interface SignalHouseSmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SignalHouseService {
  private http: AxiosInstance;
  private apiKey: string;
  private apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get("SIGNALHOUSE_API_KEY") as string;
    this.apiUrl =
      (this.configService.get("SIGNALHOUSE_API_URL") as string) ||
      "https://api.signalhouse.io";

    this.http = axios.create({
      baseURL: this.apiUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async sendSms(options: SignalHouseSendSmsOptions): Promise<SignalHouseSmsResponse> {
    try {
      const { data } = await this.http.post("/v1/sms/send", {
        to: options.to,
        from: options.from,
        message: options.message,
        campaign_id: options.campaignId,
      });

      return {
        success: true,
        messageId: data.message_id || data.id,
      };
    } catch (error: any) {
      console.error("SignalHouse SMS Error:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async sendBulkSms(messages: SignalHouseSendSmsOptions[]): Promise<SignalHouseSmsResponse[]> {
    try {
      const { data } = await this.http.post("/v1/sms/bulk", {
        messages: messages.map((msg) => ({
          to: msg.to,
          from: msg.from,
          message: msg.message,
          campaign_id: msg.campaignId,
        })),
      });

      return data.results.map((result: any) => ({
        success: result.success,
        messageId: result.message_id,
        error: result.error,
      }));
    } catch (error: any) {
      console.error("SignalHouse Bulk SMS Error:", error.response?.data || error.message);
      throw error;
    }
  }

  async getMessageStatus(messageId: string) {
    try {
      const { data } = await this.http.get(`/v1/sms/status/${messageId}`);
      return data;
    } catch (error: any) {
      console.error("SignalHouse Status Error:", error.response?.data || error.message);
      throw error;
    }
  }

  async getCampaignStats(campaignId: string) {
    try {
      const { data } = await this.http.get(`/v1/campaigns/${campaignId}/stats`);
      return data;
    } catch (error: any) {
      console.error("SignalHouse Stats Error:", error.response?.data || error.message);
      throw error;
    }
  }
}
