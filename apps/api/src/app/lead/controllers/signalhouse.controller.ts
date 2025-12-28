import { Controller, Post, Body, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { UseAuthGuard } from "@/app/auth/decorators";

// INTERNAL API - Requires JWT authentication
// This controller proxies requests to SignalHouse API using server-side credentials
@Controller("signalhouse")
@UseAuthGuard()
export class SignalHouseController {
  private readonly apiKey: string;
  private readonly apiBase = "https://api.signalhouse.io/api/v1";

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get("SIGNALHOUSE_API_KEY") || "";
  }

  @Post("test")
  async test(@Body() body: { apiKey: string }) {
    const key = body.apiKey || this.apiKey;

    if (!key) {
      return { error: "API key is required" };
    }

    try {
      const response = await axios.get(`${this.apiBase}/user/info`, {
        headers: {
          "x-api-key": key,
          "Content-Type": "application/json",
        },
      });

      return {
        success: true,
        message: "Connection successful",
        user: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { error: error.response?.data?.message || "Invalid API key" };
      }
      return { error: "Connection test failed" };
    }
  }

  @Post("configure")
  async configure(@Body() body: { apiKey: string }) {
    const { apiKey } = body;

    if (!apiKey) {
      return { error: "API key is required" };
    }

    try {
      const response = await axios.get(`${this.apiBase}/user/info`, {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200) {
        return {
          success: true,
          message: "SignalHouse API key configured successfully",
        };
      }
      return { error: "Invalid API key" };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { error: error.response?.data?.message || "Invalid API key" };
      }
      return { error: "Configuration failed" };
    }
  }

  @Get("stats")
  async stats() {
    if (!this.apiKey) {
      return { error: "SignalHouse API key not configured" };
    }

    try {
      const [analyticsRes, walletRes] = await Promise.all([
        axios
          .get(`${this.apiBase}/analytics/dashboardAnalytics`, {
            headers: { "x-api-key": this.apiKey },
          })
          .catch(() => null),
        axios
          .get(`${this.apiBase}/wallet/summary`, {
            headers: { "x-api-key": this.apiKey },
          })
          .catch(() => null),
      ]);

      return {
        success: true,
        analytics: analyticsRes?.data || null,
        wallet: walletRes?.data || null,
      };
    } catch (error) {
      return { error: "Failed to fetch stats" };
    }
  }

  @Post("send")
  async send(
    @Body()
    body: {
      to: string;
      from: string;
      message: string;
      mediaUrl?: string;
    },
  ) {
    if (!this.apiKey) {
      return { error: "SignalHouse API key not configured" };
    }

    const { to, from, message, mediaUrl } = body;

    if (!to || !from || !message) {
      return { error: "to, from, and message are required" };
    }

    try {
      const endpoint = mediaUrl
        ? `${this.apiBase}/message/sendMMS`
        : `${this.apiBase}/message/sendSMS`;

      const response = await axios.post(endpoint, body, {
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      return {
        success: true,
        messageId: response.data.messageId || response.data.id,
        data: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          error: error.response?.data?.message || "Failed to send message",
        };
      }
      return { error: "Failed to send message" };
    }
  }
}
