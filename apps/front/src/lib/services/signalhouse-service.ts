/**
 * SignalHouse SMS/MMS Service
 * Complete integration with SignalHouse API (api.signalhouse.io)
 * Powers SMS drip automation, batch sending, and message tracking
 */

const SIGNALHOUSE_CONFIG = {
  baseUrl: process.env.SIGNALHOUSE_API_URL || "https://api.signalhouse.io",
  apiKey: process.env.SIGNALHOUSE_API_KEY || "",
  publicKey: process.env.SIGNALHOUSE_PUBLIC_KEY || "",
  defaultFromNumber: process.env.SIGNALHOUSE_FROM_NUMBER || "",
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SendSMSRequest {
  to: string;
  from?: string;
  message: string;
  webhookUrl?: string;
  scheduledAt?: string;
  tags?: string[];
}

export interface SendMMSRequest extends SendSMSRequest {
  mediaUrl: string[];
}

export interface SMSResponse {
  messageId: string;
  to: string;
  from: string;
  status: "queued" | "sent" | "delivered" | "failed";
  segments: number;
  cost?: number;
  createdAt: string;
}

export interface MessageLog {
  messageId: string;
  to: string;
  from: string;
  message: string;
  direction: "inbound" | "outbound";
  status: string;
  segments: number;
  cost: number;
  createdAt: string;
  deliveredAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PhoneNumber {
  phoneNumber: string;
  friendlyName?: string;
  capabilities: {
    sms: boolean;
    mms: boolean;
    voice: boolean;
  };
  tags?: string[];
  campaignId?: string;
  status: "active" | "released" | "pending";
}

export interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BatchSMSJob {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  createdAt: string;
  completedAt?: string;
}

export interface ConversationMessage {
  messageId: string;
  direction: "inbound" | "outbound";
  content: string;
  timestamp: string;
  status: string;
}

export interface DashboardAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  optOutCount: number;
  responseRate: number;
  costTotal: number;
  periodStart: string;
  periodEnd: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNALHOUSE SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SignalHouseService {
  private static instance: SignalHouseService;
  private apiKey: string;
  private baseUrl: string;

  private constructor() {
    this.apiKey = SIGNALHOUSE_CONFIG.apiKey;
    this.baseUrl = SIGNALHOUSE_CONFIG.baseUrl;
  }

  public static getInstance(): SignalHouseService {
    if (!SignalHouseService.instance) {
      SignalHouseService.instance = new SignalHouseService();
    }
    return SignalHouseService.instance;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `SignalHouse API error: ${response.status}`,
      );
    }

    return response.json();
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, "");
    // Ensure it starts with country code
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`;
    }
    return cleaned.startsWith("+") ? phone : `+${cleaned}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MESSAGE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Send a single SMS message
   */
  public async sendSMS(request: SendSMSRequest): Promise<SMSResponse> {
    return this.request<SMSResponse>("/message/sendSMS", {
      method: "POST",
      body: JSON.stringify({
        to: this.formatPhoneNumber(request.to),
        from: request.from || SIGNALHOUSE_CONFIG.defaultFromNumber,
        message: request.message,
        webhookUrl: request.webhookUrl,
        scheduledAt: request.scheduledAt,
        tags: request.tags,
      }),
    });
  }

  /**
   * Send MMS with media attachments
   */
  public async sendMMS(request: SendMMSRequest): Promise<SMSResponse> {
    return this.request<SMSResponse>("/message/sendMMS", {
      method: "POST",
      body: JSON.stringify({
        to: this.formatPhoneNumber(request.to),
        from: request.from || SIGNALHOUSE_CONFIG.defaultFromNumber,
        message: request.message,
        mediaUrl: request.mediaUrl,
        webhookUrl: request.webhookUrl,
        scheduledAt: request.scheduledAt,
        tags: request.tags,
      }),
    });
  }

  /**
   * Calculate message segments (for cost estimation)
   */
  public async calculateSegments(
    message: string,
  ): Promise<{ segments: number; encoding: string }> {
    return this.request<{ segments: number; encoding: string }>(
      `/message/calculateSegments?message=${encodeURIComponent(message)}`,
    );
  }

  /**
   * Get message logs with filtering
   */
  public async getMessageLogs(params: {
    from?: string;
    to?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    direction?: "inbound" | "outbound";
    limit?: number;
    offset?: number;
  }): Promise<{ logs: MessageLog[]; total: number }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, String(value));
    });

    return this.request<{ logs: MessageLog[]; total: number }>(
      `/message/logs?${queryParams.toString()}`,
    );
  }

  /**
   * Get conversation between two numbers
   */
  public async getConversation(
    from: string,
    to: string,
  ): Promise<ConversationMessage[]> {
    const formattedFrom = this.formatPhoneNumber(from);
    const formattedTo = this.formatPhoneNumber(to);

    return this.request<ConversationMessage[]>(
      `/message/conversation/${encodeURIComponent(formattedFrom)}/${encodeURIComponent(formattedTo)}`,
    );
  }

  /**
   * Get conversation list for a number
   */
  public async getConversationList(phoneNumber?: string): Promise<{
    conversations: Array<{
      to: string;
      from: string;
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
    }>;
  }> {
    const params = phoneNumber
      ? `?phoneNumber=${encodeURIComponent(phoneNumber)}`
      : "";
    return this.request(`/message/conversationList${params}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BATCH SMS OPERATIONS (FOR DRIP CAMPAIGNS)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Send batch SMS messages with rate limiting
   * Implements the 250 batch / 2k daily limit logic
   */
  public async sendBatchSMS(
    messages: Array<{
      to: string;
      message: string;
      variables?: Record<string, string>;
    }>,
    options: {
      batchSize?: number;
      maxPerDay?: number;
      delayBetweenBatches?: number; // ms
      templateId?: string;
      fromNumber?: string;
      webhookUrl?: string;
      scheduledAt?: string;
    } = {},
  ): Promise<BatchSMSJob> {
    const {
      batchSize = 250,
      maxPerDay = 2000,
      delayBetweenBatches = 5000,
      fromNumber = SIGNALHOUSE_CONFIG.defaultFromNumber,
      webhookUrl,
      scheduledAt,
    } = options;

    // Limit to max per day
    const limitedMessages = messages.slice(0, maxPerDay);

    // Create batches
    const batches: (typeof messages)[] = [];
    for (let i = 0; i < limitedMessages.length; i += batchSize) {
      batches.push(limitedMessages.slice(i, i + batchSize));
    }

    // Track job
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const results: SMSResponse[] = [];
    const errors: Array<{ to: string; error: string }> = [];

    // Process batches with delay
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Send batch in parallel
      const batchPromises = batch.map(async (msg) => {
        try {
          const response = await this.sendSMS({
            to: msg.to,
            from: fromNumber,
            message: this.renderTemplate(msg.message, msg.variables || {}),
            webhookUrl,
            scheduledAt,
          });
          results.push(response);
        } catch (error) {
          errors.push({
            to: msg.to,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });

      await Promise.all(batchPromises);

      // Wait between batches (except for last batch)
      if (i < batches.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches),
        );
      }
    }

    return {
      jobId,
      status: errors.length === 0 ? "completed" : "completed",
      totalMessages: limitedMessages.length,
      sentMessages: results.length,
      failedMessages: errors.length,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Render template with variables
   */
  private renderTemplate(
    template: string,
    variables: Record<string, string>,
  ): string {
    let rendered = template;
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), value);
      rendered = rendered.replace(new RegExp(`{${key}}`, "g"), value);
    });
    return rendered;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a message template
   */
  public async createTemplate(template: {
    name: string;
    content: string;
    category?: string;
  }): Promise<Template> {
    return this.request<Template>("/message/createTemplate", {
      method: "POST",
      body: JSON.stringify(template),
    });
  }

  /**
   * Get all templates
   */
  public async getTemplates(category?: string): Promise<Template[]> {
    const params = category ? `?category=${encodeURIComponent(category)}` : "";
    return this.request<Template[]>(`/message/findTemplate${params}`);
  }

  /**
   * Get template details
   */
  public async getTemplateDetails(templateId: string): Promise<Template> {
    return this.request<Template>(
      `/message/getTemplateDetails?id=${encodeURIComponent(templateId)}`,
    );
  }

  /**
   * Update a template
   */
  public async updateTemplate(
    templateId: string,
    updates: { name?: string; content?: string; category?: string },
  ): Promise<Template> {
    return this.request<Template>("/message/editTemplate", {
      method: "PUT",
      body: JSON.stringify({ id: templateId, ...updates }),
    });
  }

  /**
   * Delete a template
   */
  public async deleteTemplate(templateId: string): Promise<void> {
    await this.request(
      `/message/deleteTemplate?id=${encodeURIComponent(templateId)}`,
      {
        method: "DELETE",
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHONE NUMBER OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Search for available phone numbers
   */
  public async searchPhoneNumbers(params: {
    areaCode?: string;
    state?: string;
    capabilities?: ("sms" | "mms" | "voice")[];
    limit?: number;
  }): Promise<PhoneNumber[]> {
    const queryParams = new URLSearchParams();
    if (params.areaCode) queryParams.append("areaCode", params.areaCode);
    if (params.state) queryParams.append("state", params.state);
    if (params.capabilities) {
      queryParams.append("capabilities", params.capabilities.join(","));
    }
    if (params.limit) queryParams.append("limit", String(params.limit));

    return this.request<PhoneNumber[]>(
      `/phoneNumber/getPhoneNumber?${queryParams.toString()}`,
    );
  }

  /**
   * Purchase a phone number
   */
  public async purchasePhoneNumber(phoneNumber: string): Promise<PhoneNumber> {
    return this.request<PhoneNumber>("/phoneNumber/buyPhoneNumber", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  }

  /**
   * Get owned phone numbers
   */
  public async getMyPhoneNumbers(): Promise<PhoneNumber[]> {
    return this.request<PhoneNumber[]>("/phoneNumber/myPhoneNumbers");
  }

  /**
   * Configure phone number (attach to campaign, set webhooks)
   */
  public async configurePhoneNumber(config: {
    phoneNumber: string;
    friendlyName?: string;
    webhookUrl?: string;
    campaignId?: string;
  }): Promise<void> {
    await this.request("/phoneNumber/configurePhoneNumber", {
      method: "POST",
      body: JSON.stringify(config),
    });
  }

  /**
   * Add tags to phone number
   */
  public async addPhoneNumberTags(
    phoneNumber: string,
    tags: string[],
  ): Promise<void> {
    await this.request("/phoneNumber/addTags", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, tags }),
    });
  }

  /**
   * Release a phone number
   */
  public async releasePhoneNumber(phoneNumber: string): Promise<void> {
    await this.request("/phoneNumber/releasePhoneNumber", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYTICS OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get dashboard analytics
   */
  public async getDashboardAnalytics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<DashboardAnalytics> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    return this.request<DashboardAnalytics>(
      `/analytics/dashboardAnalytics?${queryParams.toString()}`,
    );
  }

  /**
   * Get outbound analytics
   */
  public async getOutboundAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: "hour" | "day" | "week" | "month";
  }): Promise<
    Array<{ period: string; sent: number; delivered: number; failed: number }>
  > {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.groupBy) queryParams.append("groupBy", params.groupBy);

    return this.request(
      `/analytics/analyticsOutbound?${queryParams.toString()}`,
    );
  }

  /**
   * Get inbound analytics
   */
  public async getInboundAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: "hour" | "day" | "week" | "month";
  }): Promise<Array<{ period: string; received: number; responded: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.groupBy) queryParams.append("groupBy", params.groupBy);

    return this.request(
      `/analytics/analyticsInbound?${queryParams.toString()}`,
    );
  }

  /**
   * Get opt-out statistics
   */
  public async getOptOutStats(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{ date: string; count: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    return this.request(`/analytics/optOut?${queryParams.toString()}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WEBHOOK OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a webhook
   */
  public async createWebhook(webhook: {
    url: string;
    events: string[];
    active?: boolean;
  }): Promise<{ webhookId: string }> {
    return this.request("/webhook", {
      method: "POST",
      body: JSON.stringify(webhook),
    });
  }

  /**
   * Get all webhooks
   */
  public async getWebhooks(): Promise<
    Array<{
      webhookId: string;
      url: string;
      events: string[];
      active: boolean;
    }>
  > {
    return this.request("/webhook");
  }

  /**
   * Update a webhook
   */
  public async updateWebhook(
    webhookId: string,
    updates: { url?: string; events?: string[]; active?: boolean },
  ): Promise<void> {
    await this.request(`/webhook/${webhookId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a webhook
   */
  public async deleteWebhook(webhookId: string): Promise<void> {
    await this.request(`/webhook/${webhookId}`, { method: "DELETE" });
  }

  /**
   * Get available webhook events
   */
  public async getWebhookEvents(): Promise<string[]> {
    return this.request("/webhook/events");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WALLET / USAGE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get wallet summary (balance)
   */
  public async getWalletSummary(): Promise<{
    balance: number;
    currency: string;
    autoRechargeEnabled: boolean;
  }> {
    return this.request("/wallet/summary");
  }

  /**
   * Get usage summary
   */
  public async getUsageSummary(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    smsSent: number;
    smsReceived: number;
    mmsSent: number;
    mmsReceived: number;
    totalCost: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    return this.request(`/wallet/usageSummary?${queryParams.toString()}`);
  }

  /**
   * Get pricing details
   */
  public async getPricing(): Promise<{
    smsOutbound: number;
    smsInbound: number;
    mmsOutbound: number;
    mmsInbound: number;
    phoneNumberMonthly: number;
  }> {
    return this.request("/wallet/pricing");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10DLC CAMPAIGN OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get brand details
   */
  public async getBrandDetails(): Promise<{
    brandId: string;
    name: string;
    status: string;
    vettingScore?: number;
  }> {
    return this.request("/brand/basicBrandDetails");
  }

  /**
   * Get campaign details
   */
  public async getCampaignDetails(campaignId: string): Promise<{
    campaignId: string;
    brandId: string;
    usecase: string;
    status: string;
    sampleMessages: string[];
  }> {
    return this.request(`/campaign/${campaignId}`);
  }

  /**
   * Attach phone numbers to 10DLC campaign
   */
  public async attachPhoneNumbersToCampaign(
    campaignId: string,
    phoneNumbers: string[],
  ): Promise<void> {
    await this.request("/phoneNumber/bulkTenDLCWhitelist", {
      method: "POST",
      body: JSON.stringify({ campaignId, phoneNumbers }),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Validate phone number format
   */
  public async validatePhoneNumber(phoneNumber: string): Promise<{
    valid: boolean;
    lineType?: "mobile" | "landline" | "voip" | "unknown";
    carrier?: string;
  }> {
    return this.request(
      `/phoneNumber/numberValidation/${encodeURIComponent(this.formatPhoneNumber(phoneNumber))}`,
    );
  }

  /**
   * Get area codes for a state
   */
  public async getAreaCodes(state?: string): Promise<string[]> {
    const params = state ? `?state=${encodeURIComponent(state)}` : "";
    return this.request(`/phoneNumber/areaCodes${params}`);
  }

  /**
   * Get carriers list
   */
  public async getCarriers(): Promise<Array<{ name: string; code: string }>> {
    return this.request("/message/carriers");
  }

  /**
   * Check if API is properly configured
   */
  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Get configuration status
   */
  public getConfigStatus(): {
    hasApiKey: boolean;
    hasFromNumber: boolean;
    baseUrl: string;
  } {
    return {
      hasApiKey: !!this.apiKey,
      hasFromNumber: !!SIGNALHOUSE_CONFIG.defaultFromNumber,
      baseUrl: this.baseUrl,
    };
  }
}

// Export singleton instance
export const signalHouseService = SignalHouseService.getInstance();

// Export config for use in other services
export { SIGNALHOUSE_CONFIG };
