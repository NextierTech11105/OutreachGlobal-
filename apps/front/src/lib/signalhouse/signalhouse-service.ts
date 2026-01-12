/**
 * SignalHouse Service Layer
 * Higher-level operations with business logic built on top of the client
 */

import {
  sendSMS as clientSendSMS,
  sendMMS as clientSendMMS,
  getMessageLogs,
  getConversation,
  getTemplates,
  getDashboardAnalytics,
  isConfigured,
  type SendSMSInput,
  type SendMMSInput,
  type MessageResult,
  type MessageTemplate,
  type DashboardAnalytics as ClientDashboardAnalytics,
} from "./client";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const SIGNALHOUSE_CONFIG = {
  defaultFromNumber: process.env.SIGNALHOUSE_FROM_NUMBER || "",
  maxRetries: 3,
  retryDelayMs: 1000,
  batchSize: 100,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SendSMSRequest {
  to: string;
  message: string;
  from?: string;
  campaignId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendMMSRequest extends SendSMSRequest {
  mediaUrl: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  correlationId?: string;
}

export interface MessageLog {
  id: string;
  to: string;
  from: string;
  message: string;
  status: string;
  direction: "inbound" | "outbound";
  createdAt: string;
  segments?: number;
}

export interface PhoneNumber {
  phoneNumber: string;
  friendlyName?: string;
  capabilities?: string[];
  status?: string;
  campaignId?: string;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  variables?: string[];
}

export interface BatchSMSJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  total: number;
  sent: number;
  failed: number;
  startedAt?: string;
  completedAt?: string;
}

export interface ConversationMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  direction: "inbound" | "outbound";
  status: string;
  timestamp: string;
}

export interface DashboardAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  responseRate: number;
  balance: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class SignalHouseService {
  private fromNumber: string;

  constructor(fromNumber?: string) {
    this.fromNumber = fromNumber || SIGNALHOUSE_CONFIG.defaultFromNumber;
  }

  /**
   * Check if the service is properly configured
   */
  isReady(): boolean {
    return isConfigured() && !!this.fromNumber;
  }

  /**
   * Send a single SMS
   */
  async sendSMS(request: SendSMSRequest): Promise<SMSResponse> {
    const from = request.from || this.fromNumber;
    if (!from) {
      return { success: false, error: "No from number configured" };
    }

    const input: SendSMSInput = {
      to: request.to,
      from,
      message: request.message,
    };

    const result = await clientSendSMS(input);

    return {
      success: result.success,
      messageId: result.data?.messageId,
      status: result.data?.status,
      error: result.error,
      correlationId: result.correlationId,
    };
  }

  /**
   * Send an MMS with media
   */
  async sendMMS(request: SendMMSRequest): Promise<SMSResponse> {
    const from = request.from || this.fromNumber;
    if (!from) {
      return { success: false, error: "No from number configured" };
    }

    const input: SendMMSInput = {
      to: request.to,
      from,
      message: request.message,
      mediaUrl: request.mediaUrl,
    };

    const result = await clientSendMMS(input);

    return {
      success: result.success,
      messageId: result.data?.messageId,
      status: result.data?.status,
      error: result.error,
      correlationId: result.correlationId,
    };
  }

  /**
   * Get message history for a phone number
   */
  async getMessageHistory(phoneNumber: string): Promise<MessageLog[]> {
    const result = await getMessageLogs({ from: phoneNumber, limit: 100 });
    if (!result.success || !result.data) {
      return [];
    }

    return result.data.map((msg: MessageResult) => ({
      id: msg.messageId,
      to: msg.to,
      from: msg.from,
      message: "",
      status: msg.status,
      direction: "outbound" as const,
      createdAt: new Date().toISOString(),
      segments: msg.segments,
    }));
  }

  /**
   * Get conversation between two numbers
   */
  async getConversation(
    from: string,
    to: string,
  ): Promise<ConversationMessage[]> {
    const result = await getConversation(from, to);
    if (!result.success || !result.data) {
      return [];
    }

    return result.data.map((msg: MessageResult) => ({
      id: msg.messageId,
      from: msg.from,
      to: msg.to,
      message: "",
      direction: "outbound" as const,
      status: msg.status,
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Get all templates
   */
  async getTemplates(): Promise<Template[]> {
    const result = await getTemplates();
    if (!result.success || !result.data) {
      return [];
    }

    return result.data.map((t: MessageTemplate) => ({
      id: t.templateId,
      name: t.name,
      content: t.content,
      variables: t.variables,
    }));
  }

  /**
   * Get dashboard analytics
   */
  async getAnalytics(): Promise<DashboardAnalytics | null> {
    const result = await getDashboardAnalytics();
    if (!result.success || !result.data) {
      return null;
    }

    const data = result.data as ClientDashboardAnalytics;
    return {
      totalSent: data.totalSent,
      totalDelivered: data.totalDelivered,
      totalFailed: data.totalFailed,
      deliveryRate: data.deliveryRate,
      responseRate: 0,
      balance: data.balance,
    };
  }

  /**
   * Send batch SMS (queued)
   */
  async sendBatch(
    messages: Array<{ to: string; message: string }>,
  ): Promise<BatchSMSJob> {
    const jobId = `batch_${Date.now()}`;

    // For now, send sequentially
    // In production, this would queue to a job processor
    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      const result = await this.sendSMS({ to: msg.to, message: msg.message });
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return {
      id: jobId,
      status: "completed",
      total: messages.length,
      sent,
      failed,
      completedAt: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

export const signalHouseService = new SignalHouseService();

console.log("[SignalHouse Service] Initialized");
