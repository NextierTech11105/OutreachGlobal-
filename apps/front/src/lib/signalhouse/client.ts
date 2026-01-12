// SignalHouse API Client
// Wraps all SignalHouse API calls with proper auth headers
// https://app.signalhouse.io/apidoc
//
// PLATFORM ENGINEERING BEST PRACTICES:
// - Retry with exponential backoff for transient errors
// - Correlation ID for cross-platform tracing
// - Rate limit handling with retry-after
// - Structured error responses

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io";

// Auth credentials from environment
const API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const AUTH_TOKEN = process.env.SIGNALHOUSE_AUTH_TOKEN || "";

// ============ WEBHOOK URL CONSTANTS ============
// Use these when configuring phone numbers in SignalHouse portal
export const WEBHOOK_URLS = {
  // Main app webhook - handles ALL SignalHouse events with full business logic
  APP_WEBHOOK: process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/webhook/signalhouse`
    : "https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse",

  // DO Functions webhook - lightweight, use as backup
  FUNCTIONS_SMS_INBOUND:
    "https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-44110ae1-dbf0-4680-b90b-3d9e342bd433/webhooks/sms-inbound",
  FUNCTIONS_VOICE_INBOUND:
    "https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-44110ae1-dbf0-4680-b90b-3d9e342bd433/webhooks/voice-inbound",
} as const;

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
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  correlationId?: string;
}> {
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
          : Math.min(
              RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
              RETRY_CONFIG.maxDelayMs,
            );

        console.warn(
          `[SignalHouse Client] Rate limited, retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} after ${delayMs}ms [${corrId}]`,
        );
        await sleep(delayMs);
        continue;
      }

      // Handle retryable server errors
      if (
        RETRY_CONFIG.retryableStatuses.includes(response.status) &&
        attempt < RETRY_CONFIG.maxRetries
      ) {
        const delayMs = Math.min(
          RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelayMs,
        );
        console.warn(
          `[SignalHouse Client] Retryable error ${response.status}, retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} [${corrId}]`,
        );
        await sleep(delayMs);
        continue;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error:
            data.message || data.error || `Request failed: ${response.status}`,
          status: response.status,
          correlationId: corrId,
        };
      }

      return { success: true, data: data as T, correlationId: corrId };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Request failed";

      // Network errors are retryable
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delayMs = Math.min(
          RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelayMs,
        );
        console.warn(
          `[SignalHouse Client] Network error, retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} [${corrId}]`,
        );
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

export async function getPhoneNumberDetails(phoneNumber: string) {
  return signalhouseRequest<PhoneNumber>("/phoneNumber/getPhoneNumberDetails", {
    params: { phoneNumber },
  });
}

export async function fetchPhoneNumberConfig(phoneNumber: string) {
  return signalhouseRequest<{
    phoneNumber: string;
    campaignId?: string;
    brandId?: string;
    subGroupId?: string;
    webhookUrl?: string;
    backupUrl?: string;
  }>("/phoneNumber/fetchConfigurePhoneNumber", {
    params: { phoneNumber },
  });
}

export async function validatePhoneNumber(phoneNumber: string) {
  return signalhouseRequest<{
    valid: boolean;
    lineType?: string;
    carrier?: string;
    countryCode?: string;
  }>(`/phoneNumber/numberValidation/${encodeURIComponent(phoneNumber)}`);
}

export async function getPhoneNumberActionHistory(phoneNumber: string) {
  return signalhouseRequest<
    Array<{
      action: string;
      timestamp: string;
      details?: Record<string, unknown>;
    }>
  >(`/phoneNumber/action/history/${encodeURIComponent(phoneNumber)}`);
}

export async function getAvailablePhoneNumbersForCampaign() {
  return signalhouseRequest<PhoneNumber[]>(
    "/phoneNumber/campaign/attach/available",
  );
}

export async function bulkWhitelistFor10DLC(
  phoneNumbers: string[],
  campaignId: string,
) {
  return signalhouseRequest<{ success: boolean; processed: number }>(
    "/phoneNumber/bulkTenDLCWhitelist",
    {
      method: "POST",
      body: { phoneNumbers, campaignId },
    },
  );
}

export async function getAreaCodes(state?: string) {
  return signalhouseRequest<
    Array<{ areaCode: string; state: string; city?: string }>
  >("/phoneNumber/areaCodes", { params: state ? { state } : undefined });
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

// Template Operations
export interface MessageTemplate {
  templateId: string;
  name: string;
  content: string;
  variables?: string[];
  createdAt?: string;
}

export async function createTemplate(input: {
  name: string;
  content: string;
  variables?: string[];
}) {
  return signalhouseRequest<MessageTemplate>("/message/createTemplate", {
    method: "POST",
    body: input,
  });
}

export async function getTemplates(params?: { name?: string }) {
  return signalhouseRequest<MessageTemplate[]>("/message/findTemplate", {
    params: params as Record<string, string>,
  });
}

export async function getTemplateDetails(templateId: string) {
  return signalhouseRequest<MessageTemplate>("/message/getTemplateDetails", {
    params: { templateId },
  });
}

export async function editTemplate(
  templateId: string,
  updates: Partial<{ name: string; content: string }>,
) {
  return signalhouseRequest<MessageTemplate>("/message/editTemplate", {
    method: "PUT",
    body: { templateId, ...updates },
  });
}

export async function deleteTemplate(templateId: string) {
  return signalhouseRequest<{ success: boolean }>("/message/deleteTemplate", {
    method: "DELETE",
    body: { templateId },
  });
}

// Conversation Operations
export async function getConversationList(params?: {
  limit?: number;
  offset?: number;
}) {
  return signalhouseRequest<
    Array<{
      from: string;
      to: string;
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
    }>
  >("/message/conversationList", {
    params: params as Record<string, string>,
  });
}

export async function getMessageLogsByNumber(phoneNumber: string) {
  return signalhouseRequest<MessageResult[]>(
    `/message/logs/${encodeURIComponent(phoneNumber)}`,
  );
}

export async function getEventLogs(params?: {
  startDate?: string;
  endDate?: string;
  event?: string;
}) {
  return signalhouseRequest<
    Array<{
      event: string;
      timestamp: string;
      data: Record<string, unknown>;
    }>
  >("/message/getEventLogs", {
    params: params as Record<string, string>,
  });
}

export async function getCarriers() {
  return signalhouseRequest<
    Array<{ carrierId: string; name: string; country: string }>
  >("/message/carriers");
}

// Short Link Operations
export async function getAllShortLinks() {
  return signalhouseRequest<
    Array<{
      shortUrl: string;
      originalUrl: string;
      clicks: number;
      createdAt: string;
    }>
  >("/message/allShortLinks");
}

export async function updateShortLinkFriendlyName(
  shortUrl: string,
  friendlyName: string,
) {
  return signalhouseRequest<{ success: boolean }>("/message/shortLink", {
    method: "PATCH",
    body: { shortUrl, friendlyName },
  });
}

export async function createShortLink(
  originalUrl: string,
  friendlyName?: string,
) {
  return signalhouseRequest<{
    shortUrl: string;
    originalUrl: string;
    createdAt: string;
  }>("/message/shortLink", {
    method: "POST",
    body: { originalUrl, friendlyName },
  });
}

export async function getShortLinkAnalytics(shortUrl: string) {
  return signalhouseRequest<{
    shortUrl: string;
    originalUrl: string;
    totalClicks: number;
    uniqueClicks: number;
    clicksByDate: Array<{ date: string; clicks: number }>;
  }>(`/message/shortLink/analytics/${encodeURIComponent(shortUrl)}`);
}

// ============ OPT-OUT MANAGEMENT ============

export async function getOptOutList(params?: {
  limit?: number;
  offset?: number;
}) {
  return signalhouseRequest<
    Array<{
      phoneNumber: string;
      optOutAt: string;
      reason?: string;
    }>
  >("/message/optOutList", {
    params: params as Record<string, string>,
  });
}

export async function addToOptOutList(phoneNumber: string, reason?: string) {
  return signalhouseRequest<{ success: boolean }>("/message/optOut", {
    method: "POST",
    body: { phoneNumber, reason },
  });
}

export async function removeFromOptOutList(phoneNumber: string) {
  return signalhouseRequest<{ success: boolean }>("/message/optOut", {
    method: "DELETE",
    body: { phoneNumber },
  });
}

export async function checkOptOutStatus(phoneNumber: string) {
  return signalhouseRequest<{
    isOptedOut: boolean;
    optOutAt?: string;
    reason?: string;
  }>(`/message/optOut/check/${encodeURIComponent(phoneNumber)}`);
}

// ============ CAMPAIGN PHONE NUMBER MANAGEMENT ============

export async function attachNumberToCampaign(
  phoneNumber: string,
  campaignId: string,
) {
  return signalhouseRequest<{ success: boolean }>("/campaign/attachNumber", {
    method: "POST",
    body: { phoneNumber, campaignId },
  });
}

export async function detachNumberFromCampaign(
  phoneNumber: string,
  campaignId: string,
) {
  return signalhouseRequest<{ success: boolean }>("/campaign/detachNumber", {
    method: "POST",
    body: { phoneNumber, campaignId },
  });
}

export async function getCampaignNumbers(campaignId: string) {
  return signalhouseRequest<PhoneNumber[]>(`/campaign/${campaignId}/numbers`);
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

export async function getTransactionHistory(params?: {
  startDate?: string;
  endDate?: string;
  type?: string;
  limit?: number;
}) {
  return signalhouseRequest<
    Array<{
      transactionId: string;
      type: string;
      amount: number;
      balance: number;
      description: string;
      createdAt: string;
    }>
  >("/wallet/transactions", {
    params: params as Record<string, string>,
  });
}

export async function rechargeWallet(amount: number, paymentMethodId?: string) {
  return signalhouseRequest<{
    success: boolean;
    transactionId: string;
    newBalance: number;
  }>("/wallet/recharge", {
    method: "POST",
    body: { amount, paymentMethodId },
  });
}

export async function configureAutoRecharge(config: {
  enabled: boolean;
  threshold?: number;
  amount?: number;
}) {
  return signalhouseRequest<WalletSummary>("/wallet/autoRecharge", {
    method: "POST",
    body: config,
  });
}

export async function getPaymentMethods() {
  return signalhouseRequest<
    Array<{
      id: string;
      type: string;
      last4: string;
      expiryMonth?: number;
      expiryYear?: number;
      isDefault: boolean;
    }>
  >("/wallet/paymentMethods");
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

// ============ GIANNA AI INTEGRATION ============
// Auto-response and classification helpers for LUCI pipeline

import {
  classifyResponse,
  getGiannaTemplate,
  type GiannaResponseTemplate,
  type ClassificationResult,
} from "../response-classifications";

export interface GiannaAutoResponse {
  shouldAutoRespond: boolean;
  template: GiannaResponseTemplate | null;
  message: string | null;
  classification: ClassificationResult | null;
  variables: Record<string, string>;
}

export interface LeadContext {
  firstName: string;
  lastName?: string;
  propertyAddress?: string;
  valueContent: string; // e.g., "Property Valuation Report", "Exit Strategy Guide"
  campaignContext?: string;
}

/**
 * Check if GIANNA can auto-respond to an inbound SMS
 * Returns the template and pre-filled message if automatable
 */
export function checkGiannaAutoResponse(
  clientId: string,
  inboundMessage: string,
  leadContext: LeadContext,
): GiannaAutoResponse {
  const classification = classifyResponse(clientId, inboundMessage);

  if (!classification) {
    return {
      shouldAutoRespond: false,
      template: null,
      message: null,
      classification: null,
      variables: {},
    };
  }

  const template = getGiannaTemplate(classification.classificationId);

  if (!template || !template.automatable) {
    return {
      shouldAutoRespond: false,
      template,
      message: null,
      classification,
      variables: {},
    };
  }

  // Build response message from template
  const variables: Record<string, string> = {
    first_name: leadContext.firstName,
    value_content: leadContext.valueContent,
    property_address: leadContext.propertyAddress || "",
    campaign_context: leadContext.campaignContext || "",
  };

  let message = template.template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  return {
    shouldAutoRespond: true,
    template,
    message,
    classification,
    variables,
  };
}

/**
 * Send GIANNA auto-response through SignalHouse
 */
export async function sendGiannaResponse(
  from: string,
  to: string,
  autoResponse: GiannaAutoResponse,
  correlationId?: string,
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  correlationId?: string;
}> {
  if (!autoResponse.shouldAutoRespond || !autoResponse.message) {
    return {
      success: false,
      error: "No auto-response configured",
    };
  }

  const result = await sendSMS({
    from,
    to,
    message: autoResponse.message,
  });

  return {
    success: result.success,
    messageId: result.data?.messageId,
    error: result.error,
    correlationId: result.correlationId,
  };
}

// ============ WORKFLOW ANALYTICS TYPES ============
// For heatmap visualization of high-impact workflows

export interface WorkflowMetrics {
  workflowId: string;
  name: string;
  campaignContext: string;
  metrics: {
    totalSent: number;
    delivered: number;
    responses: number;
    emailCaptures: number;
    optOuts: number;
    interested: number;
    questions: number;
  };
  conversionRate: number; // emailCaptures / delivered
  responseRate: number; // responses / delivered
  heatScore: number; // 0-100 weighted score for heatmap
}

export interface WorkflowHeatmapData {
  workflows: WorkflowMetrics[];
  dateRange: { start: string; end: string };
  aggregatedMetrics: {
    totalSent: number;
    totalDelivered: number;
    totalResponses: number;
    totalEmailCaptures: number;
    avgConversionRate: number;
    avgResponseRate: number;
  };
}

/**
 * Calculate heat score for workflow prioritization
 * Higher score = higher impact, should be prioritized
 */
export function calculateHeatScore(
  metrics: WorkflowMetrics["metrics"],
): number {
  // Weights for different metrics (sum = 100)
  const weights = {
    emailCaptures: 40, // Most valuable - gateway to conversation
    interested: 25, // High intent
    questions: 15, // Engagement signal
    responseRate: 10, // Overall engagement
    deliveryRate: 10, // Campaign health
  };

  const deliveryRate =
    metrics.totalSent > 0 ? metrics.delivered / metrics.totalSent : 0;
  const responseRate =
    metrics.delivered > 0 ? metrics.responses / metrics.delivered : 0;
  const captureRate =
    metrics.delivered > 0 ? metrics.emailCaptures / metrics.delivered : 0;
  const interestRate =
    metrics.responses > 0 ? metrics.interested / metrics.responses : 0;
  const questionRate =
    metrics.responses > 0 ? metrics.questions / metrics.responses : 0;

  const score =
    captureRate * weights.emailCaptures * 100 +
    interestRate * weights.interested * 100 +
    questionRate * weights.questions * 100 +
    responseRate * weights.responseRate * 100 +
    deliveryRate * weights.deliveryRate * 100;

  return Math.min(100, Math.round(score));
}

/**
 * Get heat color based on score (for visualization)
 */
export function getHeatColor(score: number): string {
  if (score >= 80) return "#22c55e"; // Green - high impact
  if (score >= 60) return "#84cc16"; // Lime
  if (score >= 40) return "#eab308"; // Yellow
  if (score >= 20) return "#f97316"; // Orange
  return "#ef4444"; // Red - low impact
}

/**
 * Build workflow heatmap data from SignalHouse analytics
 */
export async function buildWorkflowHeatmap(
  campaigns: Array<{
    campaignId: string;
    name: string;
    context: string;
  }>,
): Promise<WorkflowHeatmapData> {
  const workflows: WorkflowMetrics[] = [];
  let totalSent = 0;
  let totalDelivered = 0;
  let totalResponses = 0;
  let totalEmailCaptures = 0;

  // In production, this would aggregate from SignalHouse analytics
  // For now, structure shows the expected data shape
  for (const campaign of campaigns) {
    const analytics = await getDashboardAnalytics();

    if (analytics.success && analytics.data) {
      const metrics = {
        totalSent: analytics.data.totalSent,
        delivered: analytics.data.totalDelivered,
        responses: 0, // Would come from inbound analytics
        emailCaptures: 0, // Would come from classification aggregation
        optOuts: 0,
        interested: 0,
        questions: 0,
      };

      const heatScore = calculateHeatScore(metrics);

      workflows.push({
        workflowId: campaign.campaignId,
        name: campaign.name,
        campaignContext: campaign.context,
        metrics,
        conversionRate:
          metrics.delivered > 0 ? metrics.emailCaptures / metrics.delivered : 0,
        responseRate:
          metrics.delivered > 0 ? metrics.responses / metrics.delivered : 0,
        heatScore,
      });

      totalSent += metrics.totalSent;
      totalDelivered += metrics.delivered;
      totalResponses += metrics.responses;
      totalEmailCaptures += metrics.emailCaptures;
    }
  }

  return {
    workflows: workflows.sort((a, b) => b.heatScore - a.heatScore),
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
    aggregatedMetrics: {
      totalSent,
      totalDelivered,
      totalResponses,
      totalEmailCaptures,
      avgConversionRate:
        totalDelivered > 0 ? totalEmailCaptures / totalDelivered : 0,
      avgResponseRate: totalDelivered > 0 ? totalResponses / totalDelivered : 0,
    },
  };
}

// ============ ALIAS EXPORTS ============
// For backwards compatibility with admin APIs

export interface SearchNumbersOptions {
  areaCode?: string;
  state?: string;
  numberType?: "local" | "tollfree";
  limit?: number;
}

export async function searchNumbers(options: SearchNumbersOptions = {}) {
  return getAvailableNumbers({
    areaCode: options.areaCode,
    state: options.state,
    limit: options.limit,
  });
}

export async function purchaseNumber(phoneNumber: string) {
  return buyPhoneNumber(phoneNumber);
}

export async function getOwnedNumbers() {
  return getMyPhoneNumbers();
}

export { releasePhoneNumber as releaseNumber };

console.log("[SignalHouse] Client loaded with GIANNA integration");
