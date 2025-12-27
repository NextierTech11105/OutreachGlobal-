/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIGNALHOUSE SMS CORE - UNIFIED EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Production-ready SMS infrastructure powered by SignalHouse.io
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                         OUTREACH GLOBAL PLATFORM                            │
 * ├──────────────────┬──────────────────┬──────────────────┬───────────────────┤
 * │   Multi-Tenant   │    AI Workers    │   Campaigns      │    Analytics      │
 * │   (Sub-groups)   │  (GIANNA/CATHY)  │   (10DLC)        │   (Heatmaps)      │
 * └────────┬─────────┴────────┬─────────┴────────┬─────────┴────────┬──────────┘
 *          │                  │                  │                  │
 *          ▼                  ▼                  ▼                  ▼
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                          SIGNALHOUSE.IO API                                  │
 * │  • Brands & 10DLC Registration    • Phone Number Provisioning               │
 * │  • Sub-Groups (Multi-Tenant)      • SMS/MMS Messaging                       │
 * │  • Campaign Management            • Webhook Delivery                         │
 * │  • Opt-Out Compliance             • Analytics & Reporting                   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * Key Features:
 * - Retry with exponential backoff for transient errors
 * - Correlation IDs for cross-platform request tracing
 * - Rate limit handling with Retry-After support
 * - Multi-tenant isolation via sub-groups
 * - 10DLC compliance (Brand + Campaign registration)
 * - AI worker integration (GIANNA, CATHY, SABRINA)
 *
 * Environment Variables:
 * - SIGNALHOUSE_API_KEY: API key from SignalHouse dashboard
 * - SIGNALHOUSE_AUTH_TOKEN: Auth token (alternative to API key)
 * - SIGNALHOUSE_WEBHOOK_TOKEN: Shared secret for webhook security
 * - NEXT_PUBLIC_API_URL: Base URL for webhook callbacks
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CORE CLIENT - Direct SignalHouse API interactions
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Configuration & Auth
  isConfigured,
  getAuthHeaders,
  signalhouseRequest,
  WEBHOOK_URLS,

  // Brand Operations (10DLC)
  createBrand,
  getBrand,
  getBrandByName,
  deleteBrand,
  getBasicBrandDetails,

  // Campaign Operations (10DLC)
  createCampaign,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignBasicDetails,
  qualifyBrandForUsecases,
  attachNumberToCampaign,
  detachNumberFromCampaign,
  getCampaignNumbers,

  // Phone Number Operations
  getAvailableNumbers,
  buyPhoneNumber,
  releasePhoneNumber,
  getMyPhoneNumbers,
  configurePhoneNumber,
  addFriendlyName,
  getPhoneNumberDetails,
  fetchPhoneNumberConfig,
  validatePhoneNumber,
  getPhoneNumberActionHistory,
  getAvailablePhoneNumbersForCampaign,
  bulkWhitelistFor10DLC,
  getAreaCodes,

  // Messaging Operations
  sendSMS,
  sendMMS,
  getMessageLogs,
  getConversation,
  calculateSegments,

  // Template Operations
  createTemplate,
  getTemplates,
  getTemplateDetails,
  editTemplate,
  deleteTemplate,

  // Conversation Operations
  getConversationList,
  getMessageLogsByNumber,
  getEventLogs,
  getCarriers,

  // Short Link Operations
  getAllShortLinks,
  updateShortLinkFriendlyName,
  createShortLink,
  getShortLinkAnalytics,

  // Opt-Out Management
  getOptOutList,
  addToOptOutList,
  removeFromOptOutList,
  checkOptOutStatus,

  // Analytics Operations
  getDashboardAnalytics,
  getOutboundAnalytics,
  getInboundAnalytics,
  getOptOutAnalytics,

  // Wallet Operations
  getWalletSummary,
  getUsageSummary,
  getPricing,
  getTransactionHistory,
  rechargeWallet,
  configureAutoRecharge,
  getPaymentMethods,

  // Webhook Operations
  createWebhook,
  getWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookEvents,

  // Sub-Group Operations (Multi-Tenant)
  createSubGroup,
  getSubGroups,
  getSubGroupDetails,
  updateSubGroup,
  deleteSubGroup,

  // User Operations
  getUserInfo,
  getSubUsers,

  // GIANNA AI Integration
  checkGiannaAutoResponse,
  sendGiannaResponse,

  // Workflow Analytics
  calculateHeatScore,
  getHeatColor,
  buildWorkflowHeatmap,

  // Backwards Compatibility Aliases
  searchNumbers,
  purchaseNumber,
  getOwnedNumbers,
  releaseNumber,

  // Types
  type Brand,
  type CreateBrandInput,
  type Campaign,
  type CreateCampaignInput,
  type PhoneNumber,
  type AvailableNumber,
  type SendSMSInput,
  type SendMMSInput,
  type MessageResult,
  type MessageTemplate,
  type DashboardAnalytics,
  type WalletSummary,
  type Webhook,
  type SubGroup,
  type UserInfo,
  type GiannaAutoResponse,
  type LeadContext,
  type WorkflowMetrics,
  type WorkflowHeatmapData,
  type SearchNumbersOptions,
} from "./client";

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE LAYER - Higher-level operations with business logic
// ─────────────────────────────────────────────────────────────────────────────

export {
  SignalHouseService,
  signalHouseService,
  SIGNALHOUSE_CONFIG,

  // Service Types
  type SendSMSRequest,
  type SendMMSRequest,
  type SMSResponse,
  type MessageLog,
  type PhoneNumber as ServicePhoneNumber,
  type Template,
  type BatchSMSJob,
  type ConversationMessage,
  type DashboardAnalytics as ServiceDashboardAnalytics,
} from "./signalhouse-service";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SERVICE - Super-admin operations
// ─────────────────────────────────────────────────────────────────────────────

export {
  getAdminDashboard,
  createTeamCampaign,
  getCampaignsBySubGroup,
  provisionNumberForTeam,
  getPhoneNumbersByCampaign,
  sendTeamMessage,
  getUsageSummary as getAdminUsageSummary,

  // Types
  type AdminDashboardData,
  type UsageSummary,
} from "./admin-service";

// ─────────────────────────────────────────────────────────────────────────────
// TENANT MAPPING - Multi-tenant brand hierarchy
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Brand Constants
  NEXTIER_BRANDS,
  NEXTIER_SUB_BRANDS,

  // Mapping Functions
  getSubGroupForTeam,
  getParentBrand,
  mapTeamToSubBrand,

  // Sync Functions
  syncBrandsToSignalHouse,
  syncSubBrandsToSignalHouse,
  fullTenantSync,

  // Context Helpers
  getSignalHouseContextForTeam,
  getAllTenantMappings,
  addSubBrand,

  // Types
  type NextierBrand,
  type NextierSubBrand,
  type SignalHouseContext,
} from "./tenant-mapping";

// ─────────────────────────────────────────────────────────────────────────────
// QUICK START HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quick health check for SignalHouse integration
 */
export async function healthCheck(): Promise<{
  configured: boolean;
  connected: boolean;
  balance?: number;
  error?: string;
}> {
  const { isConfigured, getWalletSummary } = await import("./client");

  if (!isConfigured()) {
    return {
      configured: false,
      connected: false,
      error: "SIGNALHOUSE_API_KEY or SIGNALHOUSE_AUTH_TOKEN not set",
    };
  }

  try {
    const result = await getWalletSummary();
    if (result.success) {
      return {
        configured: true,
        connected: true,
        balance: result.data?.balance,
      };
    }
    return {
      configured: true,
      connected: false,
      error: result.error,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

/**
 * Quick send SMS helper - uses default configuration
 */
export async function quickSend(
  to: string,
  message: string,
  from?: string,
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const { sendSMS, isConfigured } = await import("./client");

  if (!isConfigured()) {
    return { success: false, error: "SignalHouse not configured" };
  }

  const fromNumber = from || process.env.SIGNALHOUSE_FROM_NUMBER;
  if (!fromNumber) {
    return { success: false, error: "No from number provided or configured" };
  }

  const result = await sendSMS({ to, from: fromNumber, message });

  return {
    success: result.success,
    messageId: result.data?.messageId,
    error: result.error,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSION & METADATA
// ─────────────────────────────────────────────────────────────────────────────

export const SIGNALHOUSE_SMS_CORE = {
  version: "1.0.0",
  name: "SignalHouse SMS Core",
  description: "Production SMS infrastructure powered by SignalHouse.io",
  features: [
    "10DLC Brand & Campaign Registration",
    "Multi-Tenant Sub-Group Isolation",
    "SMS/MMS Messaging with Templates",
    "Phone Number Provisioning",
    "Webhook Event Handling",
    "AI Worker Integration (GIANNA/CATHY/SABRINA)",
    "Opt-Out Compliance Management",
    "Real-Time Analytics & Heatmaps",
    "Retry with Exponential Backoff",
    "Correlation ID Tracing",
  ],
  docsUrl: "https://app.signalhouse.io/apidoc",
} as const;

console.log(
  `[SignalHouse SMS Core] v${SIGNALHOUSE_SMS_CORE.version} loaded - ${SIGNALHOUSE_SMS_CORE.features.length} features available`,
);
