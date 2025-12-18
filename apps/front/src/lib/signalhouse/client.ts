// SignalHouse API Client
// Wraps all SignalHouse API calls with proper auth headers
// https://app.signalhouse.io/apidoc
//
// PLATFORM ENGINEERING BEST PRACTICES:
// - Retry with exponential backoff for transient errors
// - Correlation ID for cross-platform tracing
// - Rate limit handling with retry-after
// - Structured error responses

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io/api/v1";

// Auth credentials from environment
const API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const AUTH_TOKEN = process.env.SIGNALHOUSE_AUTH_TOKEN || "";

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// Generate correlation ID for cross-platform tracing
function generateCorrelationId(): string {
  return `nxt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function getAuthHeaders(correlationId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-correlation-id": correlationId || generateCorrelationId(),
    "x-client": "nextier-platform",
  };
  if (API_KEY) headers["apiKey"] = API_KEY;
  if (AUTH_TOKEN) headers["authToken"] = AUTH_TOKEN;
  return headers;
}

export function isConfigured(): boolean {
  return !!(API_KEY || AUTH_TOKEN);
}

// Generic API call wrapper with retry logic
export async function signalhouseRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
    params?: Record<string, string>;
    correlationId?: string;
  } = {},
): Promise<{ success: boolean; data?: T; error?: string; status?: number; correlationId?: string }> {
  if (!isConfigured()) {
    return { success: false, error: "SignalHouse credentials not configured" };
  }

  const { method = "GET", body, params, correlationId } = options;
  const corrId = correlationId || generateCorrelationId();

  let url = `${SIGNALHOUSE_API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  let lastError: string = "Unknown error";

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(corrId),
        ...(body && { body: JSON.stringify(body) }),
      });

      // Handle rate limiting with retry-after
      if (response.status === 429 && attempt < RETRY_CONFIG.maxRetries) {
        const retryAfter = response.headers.get("retry-after");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.min(RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt), RETRY_CONFIG.maxDelayMs);

        console.warn(`[SignalHouse Client] Rate limited, retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} after ${delayMs}ms [${corrId}]`);
        await sleep(delayMs);
        continue;
      }

      // Handle retryable server errors
      if (RETRY_CONFIG.retryableStatuses.includes(response.status) && attempt < RETRY_CONFIG.maxRetries) {
        const delayMs = Math.min(RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt), RETRY_CONFIG.maxDelayMs);
        console.warn(`[SignalHouse Client] Retryable error ${response.status}, retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} [${corrId}]`);
        await sleep(delayMs);
        continue;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `Request failed: ${response.status}`,
          status: response.status,
          correlationId: corrId,
        };
      }

      return { success: true, data: data as T, correlationId: corrId };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Request failed";

      // Network errors are retryable
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delayMs = Math.min(RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt), RETRY_CONFIG.maxDelayMs);
        console.warn(`[SignalHouse Client] Network error, retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} [${corrId}]`);
        await sleep(delayMs);
        continue;
      }
    }
  }

  return {
    success: false,
    error: `${lastError} (after ${RETRY_CONFIG.maxRetries} retries)`,
    correlationId: corrId,
  };
}

// ============ BRAND OPERATIONS ============

export interface Brand {
  brandId: string;
  brandName: string;
  legalCompanyName: string;
  ein?: string;
  country: string;
  state?: string;
  city?: string;
  street?: string;
  postalCode?: string;
  stockSymbol?: string;
  stockExchange?: string;
  website?: string;
  vertical?: string;
  entityType?: string;
  status?: string;
  createdAt?: string;
}

export interface CreateBrandInput {
  legalCompanyName: string;
  brandName: string; // DBA name
  ein?: string; // Tax ID
  country?: string;
  state?: string;
  city?: string;
  street?: string;
  postalCode?: string;
  website?: string;
  vertical?: string; // Industry
  entityType?:
    | "PRIVATE_PROFIT"
    | "PUBLIC_PROFIT"
    | "NON_PROFIT"
    | "GOVERNMENT"
    | "SOLE_PROPRIETOR";
}

export async function createBrand(input: CreateBrandInput) {
  return signalhouseRequest<Brand>("/brand/nonBlocking", {
    method: "POST",
    body: input as unknown as Record<string, unknown>,
  });
}

export async function getBrand(brandId: string) {
  return signalhouseRequest<Brand>(`/brand/${brandId}`);
}

export async function getBrandByName(name: string) {
  return signalhouseRequest<Brand>(
    `/brand/brandName/${encodeURIComponent(name)}`,
  );
}

export async function deleteBrand(brandId: string) {
  return signalhouseRequest<{ success: boolean }>(`/brand/${brandId}`, {
    method: "DELETE",
  });
}

export async function getBasicBrandDetails() {
  return signalhouseRequest<Brand[]>("/brand/basicBrandDetails");
}

// ============ CAMPAIGN OPERATIONS ============

export interface Campaign {
  campaignId: string;
  brandId: string;
  usecase: string;
  description?: string;
  status?: string;
  createdAt?: string;
  mnoMetadata?: Record<string, unknown>;
}

export interface CreateCampaignInput {
  brandId: string;
  usecase: string; // "MARKETING", "LOW_VOLUME", "MIXED", etc.
  description?: string;
  sampleMessages?: string[];
  messageFlow?: string;
  helpMessage?: string;
  optoutMessage?: string;
  isDirectLending?: boolean;
  isAgeGated?: boolean; // Alcohol, tobacco, gambling
  subGroupId?: string;
}

export async function createCampaign(input: CreateCampaignInput) {
  return signalhouseRequest<Campaign>("/campaign/storeForReview", {
    method: "POST",
    body: input as unknown as Record<string, unknown>,
  });
}

export async function getCampaign(campaignId: string) {
  return signalhouseRequest<Campaign>(`/campaign/${campaignId}`);
}

export async function updateCampaign(
  campaignId: string,
  updates: Partial<CreateCampaignInput>,
) {
  return signalhouseRequest<Campaign>(`/campaign/${campaignId}`, {
    method: "PUT",
    body: updates as unknown as Record<string, unknown>,
  });
}

export async function deleteCampaign(campaignId: string) {
  return signalhouseRequest<{ success: boolean }>(`/campaign/${campaignId}`, {
    method: "DELETE",
  });
}

export async function getCampaignBasicDetails() {
  return signalhouseRequest<Campaign[]>("/campaign/details/basicCampaign");
}

export async function qualifyBrandForUsecases(brandId: string) {
  return signalhouseRequest<{ usecases: string[] }>(
    `/campaign/campaignBuilder/brand/${brandId}`,
  );
}

// ============ PHONE NUMBER OPERATIONS ============

export interface PhoneNumber {
  phoneNumber: string;
  friendlyName?: string;
  capabilities?: string[];
  status?: string;
  campaignId?: string;
  createdAt?: string;
}

export interface AvailableNumber {
  phoneNumber: string;
  locality?: string;
  region?: string;
  capabilities?: string[];
  monthlyFee?: number;
}

export async function getAvailableNumbers(params?: {
  areaCode?: string;
  state?: string;
  limit?: number;
}) {
  return signalhouseRequest<AvailableNumber[]>("/phoneNumber/getPhoneNumber", {
    params: params as Record<string, string>,
  });
}

export async function buyPhoneNumber(
  phoneNumber: string,
  friendlyName?: string,
) {
  return signalhouseRequest<PhoneNumber>("/phoneNumber/buyPhoneNumber", {
    method: "POST",
    body: { phoneNumber, friendlyName },
  });
}

export async function releasePhoneNumber(phoneNumber: string) {
  return signalhouseRequest<{ success: boolean }>(
    "/phoneNumber/releasePhoneNumber",
    {
      method: "POST",
      body: { phoneNumber },
    },
  );
}

export async function getMyPhoneNumbers() {
  return signalhouseRequest<PhoneNumber[]>("/phoneNumber/myPhoneNumbers");
}

export async function configurePhoneNumber(
  phoneNumber: string,
  config: {
    campaignId?: string;
    smsWebhookUrl?: string;
    voiceWebhookUrl?: string;
  },
) {
  return signalhouseRequest<PhoneNumber>("/phoneNumber/configurePhoneNumber", {
    method: "POST",
    body: { phoneNumber, ...config },
  });
}

export async function addFriendlyName(
  phoneNumber: string,
  friendlyName: string,
) {
  return signalhouseRequest<PhoneNumber>("/phoneNumber/addFriendlyName", {
    method: "POST",
    body: { phoneNumber, friendlyName },
  });
}

// ============ MESSAGING OPERATIONS ============

export interface SendSMSInput {
  to: string;
  from: string;
  message: string;
}

export interface SendMMSInput extends SendSMSInput {
  mediaUrl: string;
}

export interface MessageResult {
  messageId: string;
  status: string;
  to: string;
  from: string;
  segments?: number;
}

export async function sendSMS(input: SendSMSInput) {
  return signalhouseRequest<MessageResult>("/message/sendSMS", {
    method: "POST",
    body: input as unknown as Record<string, unknown>,
  });
}

export async function sendMMS(input: SendMMSInput) {
  return signalhouseRequest<MessageResult>("/message/sendMMS", {
    method: "POST",
    body: input as unknown as Record<string, unknown>,
  });
}

export async function getMessageLogs(params?: {
  from?: string;
  to?: string;
  limit?: number;
}) {
  return signalhouseRequest<MessageResult[]>("/message/logs", {
    params: params as Record<string, string>,
  });
}

export async function getConversation(from: string, to: string) {
  return signalhouseRequest<MessageResult[]>(
    `/message/conversation/${from}/${to}`,
  );
}

export async function calculateSegments(message: string) {
  return signalhouseRequest<{ segments: number; encoding: string }>(
    "/message/calculateSegments",
    {
      params: { message },
    },
  );
}

// ============ ANALYTICS OPERATIONS ============

export interface DashboardAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  failureRate: number;
  uniqueClicks: number;
  clickthroughRate: number;
  balance: number;
}

export async function getDashboardAnalytics() {
  return signalhouseRequest<DashboardAnalytics>(
    "/analytics/dashboardAnalytics",
  );
}

export async function getOutboundAnalytics(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return signalhouseRequest<Record<string, number>>(
    "/analytics/analyticsOutbound",
    {
      params: params as Record<string, string>,
    },
  );
}

export async function getInboundAnalytics(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return signalhouseRequest<Record<string, number>>(
    "/analytics/analyticsInbound",
    {
      params: params as Record<string, string>,
    },
  );
}

export async function getOptOutAnalytics() {
  return signalhouseRequest<Record<string, number>>("/analytics/optOut");
}

// ============ WALLET OPERATIONS ============

export interface WalletSummary {
  balance: number;
  currency: string;
  autoRecharge?: boolean;
  autoRechargeAmount?: number;
  autoRechargeThreshold?: number;
}

export async function getWalletSummary() {
  return signalhouseRequest<WalletSummary>("/wallet/summary");
}

export async function getUsageSummary(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return signalhouseRequest<Record<string, unknown>>("/wallet/usageSummary", {
    params: params as Record<string, string>,
  });
}

export async function getPricing() {
  return signalhouseRequest<Record<string, number>>("/wallet/pricing");
}

// ============ WEBHOOK OPERATIONS ============

export interface Webhook {
  webhookId: string;
  name: string;
  url: string;
  events: string[];
  status: "enabled" | "disabled";
  createdAt?: string;
}

export async function createWebhook(input: {
  name: string;
  url: string;
  events: string[];
  description?: string;
}) {
  return signalhouseRequest<Webhook>("/webhook", {
    method: "POST",
    body: input,
  });
}

export async function getWebhooks() {
  return signalhouseRequest<Webhook[]>("/webhook");
}

export async function getWebhook(webhookId: string) {
  return signalhouseRequest<Webhook>(`/webhook/${webhookId}`);
}

export async function updateWebhook(
  webhookId: string,
  updates: Partial<{
    name: string;
    url: string;
    events: string[];
    status: string;
  }>,
) {
  return signalhouseRequest<Webhook>(`/webhook/${webhookId}`, {
    method: "PATCH",
    body: updates,
  });
}

export async function deleteWebhook(webhookId: string) {
  return signalhouseRequest<{ success: boolean }>(`/webhook/${webhookId}`, {
    method: "DELETE",
  });
}

export async function getWebhookEvents() {
  return signalhouseRequest<string[]>("/webhook/events");
}

// ============ SUB GROUP OPERATIONS ============

export interface SubGroup {
  subGroupId: string;
  name: string;
  description?: string;
  brandId?: string;
  campaignId?: string;
  phoneNumbers?: string[];
  createdAt?: string;
}

export async function createSubGroup(input: {
  name: string;
  description?: string;
}) {
  return signalhouseRequest<SubGroup>("/user/subGroup/create", {
    method: "POST",
    body: input,
  });
}

export async function getSubGroups() {
  return signalhouseRequest<SubGroup[]>("/user/subGroup/get");
}

export async function getSubGroupDetails(subGroupId: string) {
  return signalhouseRequest<SubGroup>(`/user/subGroup/Details/${subGroupId}`);
}

export async function updateSubGroup(updates: {
  subGroupId: string;
  name?: string;
  description?: string;
}) {
  return signalhouseRequest<SubGroup>("/user/subGroup/update", {
    method: "PATCH",
    body: updates,
  });
}

export async function deleteSubGroup(subGroupId: string) {
  return signalhouseRequest<{ success: boolean }>("/user/subGroup/delete", {
    method: "DELETE",
    body: { subGroupId },
  });
}

// ============ USER OPERATIONS ============

export interface UserInfo {
  userId: string;
  email: string;
  companyName?: string;
  role?: string;
  createdAt?: string;
}

export async function getUserInfo() {
  return signalhouseRequest<UserInfo>("/user/info");
}

export async function getSubUsers() {
  return signalhouseRequest<UserInfo[]>("/user/subUsers");
}
