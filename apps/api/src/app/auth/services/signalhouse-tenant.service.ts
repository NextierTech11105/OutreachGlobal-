import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { tenants } from "@/database/schema/api-keys.schema";
import { eq } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════════════
// SIGNALHOUSE TENANT SERVICE
// ═══════════════════════════════════════════════════════════════════════════
//
// This service provides tenant-isolated SignalHouse API calls.
// All operations automatically include the tenant's subGroupId to ensure
// data isolation (numbers, campaigns, analytics are per-tenant).
//
// Usage:
//   const service = this.signalhouseTenant.forTenant(tenantId);
//   await service.sendSMS({ to, from, message });
//
// ═══════════════════════════════════════════════════════════════════════════

interface SendSMSInput {
  to: string;
  from: string;
  message: string;
}

interface SendMMSInput extends SendSMSInput {
  mediaUrl: string;
}

interface MessageResult {
  messageId: string;
  status: string;
  to: string;
  from: string;
  segments?: number;
}

interface PhoneNumber {
  phoneNumber: string;
  friendlyName?: string;
  capabilities?: string[];
  status?: string;
  campaignId?: string;
}

interface DashboardAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  balance: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable()
export class SignalHouseTenantService {
  private readonly logger = new Logger(SignalHouseTenantService.name);
  private readonly apiBase = "https://api.signalhouse.io/api/v1";
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient,
  ) {
    this.apiKey = this.configService.get("SIGNALHOUSE_API_KEY") || "";
  }

  /**
   * Check if SignalHouse is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get a tenant-scoped client for making SignalHouse API calls
   */
  forTenant(tenantId: string): TenantScopedSignalHouse {
    return new TenantScopedSignalHouse(
      this.apiKey,
      this.apiBase,
      tenantId,
      this.db,
      this.logger,
    );
  }

  /**
   * Make a raw API call (for admin operations)
   */
  async rawRequest<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: Record<string, unknown>;
      subGroupId?: string;
    } = {},
  ): Promise<ApiResponse<T>> {
    if (!this.isConfigured()) {
      return { success: false, error: "SignalHouse not configured" };
    }

    const { method = "GET", body, subGroupId } = options;

    try {
      const requestBody = subGroupId ? { ...body, subGroupId } : body;

      const response = await fetch(`${this.apiBase}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          apiKey: this.apiKey,
        },
        ...(requestBody && { body: JSON.stringify(requestBody) }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error:
            result.message ||
            result.error ||
            `Request failed: ${response.status}`,
        };
      }

      return { success: true, data: result as T };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Request failed",
      };
    }
  }
}

/**
 * Tenant-scoped SignalHouse client
 *
 * All operations automatically include the tenant's subGroupId for isolation.
 */
class TenantScopedSignalHouse {
  private subGroupId: string | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly apiBase: string,
    private readonly tenantId: string,
    private readonly db: DrizzleClient,
    private readonly logger: Logger,
  ) {}

  /**
   * Lazy-load the subGroupId for this tenant
   */
  private async getSubGroupId(): Promise<string | null> {
    if (this.subGroupId !== null) {
      return this.subGroupId;
    }

    const tenant = await this.db.query.tenants.findFirst({
      where: eq(tenants.id, this.tenantId),
    });

    this.subGroupId = tenant?.signalhouseSubGroupId || null;
    return this.subGroupId;
  }

  /**
   * Make an API request with tenant's subGroupId
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: Record<string, unknown>;
      includeSubGroup?: boolean;
    } = {},
  ): Promise<ApiResponse<T>> {
    const { method = "GET", body, includeSubGroup = true } = options;

    try {
      let requestBody = body;

      // Add subGroupId to request if configured
      if (includeSubGroup) {
        const subGroupId = await this.getSubGroupId();
        if (subGroupId && body) {
          requestBody = { ...body, subGroupId };
        }
      }

      const response = await fetch(`${this.apiBase}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          apiKey: this.apiKey,
        },
        ...(requestBody && { body: JSON.stringify(requestBody) }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error:
            result.message ||
            result.error ||
            `Request failed: ${response.status}`,
        };
      }

      return { success: true, data: result as T };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Request failed",
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGING
  // ═══════════════════════════════════════════════════════════════════════════

  async sendSMS(input: SendSMSInput): Promise<ApiResponse<MessageResult>> {
    return this.request<MessageResult>("/message/sendSMS", {
      method: "POST",
      body: input as unknown as Record<string, unknown>,
    });
  }

  async sendMMS(input: SendMMSInput): Promise<ApiResponse<MessageResult>> {
    return this.request<MessageResult>("/message/sendMMS", {
      method: "POST",
      body: input as unknown as Record<string, unknown>,
    });
  }

  async getMessageLogs(params?: {
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const subGroupId = await this.getSubGroupId();
    const queryParams = new URLSearchParams({
      ...(params?.from && { from: params.from }),
      ...(params?.to && { to: params.to }),
      ...(params?.limit && { limit: String(params.limit) }),
      ...(subGroupId && { subGroupId }),
    });

    return this.request<MessageResult[]>(`/message/logs?${queryParams}`, {
      includeSubGroup: false,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHONE NUMBERS
  // ═══════════════════════════════════════════════════════════════════════════

  async getMyPhoneNumbers(): Promise<ApiResponse<PhoneNumber[]>> {
    const subGroupId = await this.getSubGroupId();
    const url = subGroupId
      ? `/phoneNumber/myPhoneNumbers?subGroupId=${subGroupId}`
      : "/phoneNumber/myPhoneNumbers";

    return this.request<PhoneNumber[]>(url, { includeSubGroup: false });
  }

  async buyPhoneNumber(
    phoneNumber: string,
    friendlyName?: string,
  ): Promise<ApiResponse<PhoneNumber>> {
    return this.request<PhoneNumber>("/phoneNumber/buyPhoneNumber", {
      method: "POST",
      body: { phoneNumber, friendlyName },
    });
  }

  async releasePhoneNumber(
    phoneNumber: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(
      "/phoneNumber/releasePhoneNumber",
      {
        method: "POST",
        body: { phoneNumber },
      },
    );
  }

  async configurePhoneNumber(
    phoneNumber: string,
    config: {
      campaignId?: string;
      smsWebhookUrl?: string;
      voiceWebhookUrl?: string;
    },
  ): Promise<ApiResponse<PhoneNumber>> {
    return this.request<PhoneNumber>("/phoneNumber/configurePhoneNumber", {
      method: "POST",
      body: { phoneNumber, ...config },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboardAnalytics(): Promise<ApiResponse<DashboardAnalytics>> {
    const subGroupId = await this.getSubGroupId();
    const url = subGroupId
      ? `/analytics/dashboardAnalytics?subGroupId=${subGroupId}`
      : "/analytics/dashboardAnalytics";

    return this.request<DashboardAnalytics>(url, { includeSubGroup: false });
  }

  async getWalletSummary(): Promise<
    ApiResponse<{ balance: number; currency: string }>
  > {
    return this.request<{ balance: number; currency: string }>(
      "/wallet/summary",
      {
        includeSubGroup: false,
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════════════════

  async createCampaign(input: {
    brandId: string;
    usecase: string;
    description?: string;
    sampleMessages?: string[];
  }) {
    return this.request<{ campaignId: string }>("/campaign/storeForReview", {
      method: "POST",
      body: input,
    });
  }

  async getCampaigns() {
    const subGroupId = await this.getSubGroupId();
    const url = subGroupId
      ? `/campaign/details/basicCampaign?subGroupId=${subGroupId}`
      : "/campaign/details/basicCampaign";

    return this.request<Array<{ campaignId: string; status: string }>>(url, {
      includeSubGroup: false,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BRANDS
  // ═══════════════════════════════════════════════════════════════════════════

  async createBrand(input: {
    legalCompanyName: string;
    brandName: string;
    ein?: string;
    country?: string;
    website?: string;
    vertical?: string;
  }) {
    return this.request<{ brandId: string }>("/brand/nonBlocking", {
      method: "POST",
      body: input,
    });
  }

  async getBrands() {
    const subGroupId = await this.getSubGroupId();
    const url = subGroupId
      ? `/brand/basicBrandDetails?subGroupId=${subGroupId}`
      : "/brand/basicBrandDetails";

    return this.request<Array<{ brandId: string; brandName: string }>>(url, {
      includeSubGroup: false,
    });
  }
}
