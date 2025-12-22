/**
 * UNIFIED ADMIN SERVICE
 *
 * Consolidates overlapping admin functionality:
 * - Message Templates → SignalHouse campaigns
 * - Prompt Library → Content Library (already wired)
 * - Brand Management → SignalHouse brands/sub-groups
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────┐
 * │              NEXTIER ADMIN PANEL                 │
 * │  ┌──────────────┬──────────────┬──────────────┐ │
 * │  │   Tenants    │   Content    │   Messaging  │ │
 * │  │ (Sub-brands) │  (Library)   │ (Campaigns)  │ │
 * │  └──────────────┴──────────────┴──────────────┘ │
 * └─────────────────────────────────────────────────┘
 *                       │
 *                       ▼
 * ┌─────────────────────────────────────────────────┐
 * │              SIGNALHOUSE.IO                      │
 * │  ┌──────────────┬──────────────┬──────────────┐ │
 * │  │    Brands    │  Sub-groups  │  Campaigns   │ │
 * │  │   (10DLC)    │   (Teams)    │  (Templates) │ │
 * │  └──────────────┴──────────────┴──────────────┘ │
 * └─────────────────────────────────────────────────┘
 */

import {
  // Brand operations
  createBrand,
  getBrand,
  getBasicBrandDetails,
  // Sub-group operations
  createSubGroup,
  getSubGroups,
  getSubGroupDetails,
  // Campaign operations
  createCampaign,
  getCampaign,
  updateCampaign,
  getCampaignBasicDetails,
  qualifyBrandForUsecases,
  // Phone operations
  getMyPhoneNumbers,
  buyPhoneNumber,
  configurePhoneNumber,
  // Messaging
  sendSMS,
  sendMMS,
  getMessageLogs,
  // Analytics
  getDashboardAnalytics,
  getWalletSummary,
  // Types
  type Brand,
  type SubGroup,
  type Campaign,
  type PhoneNumber,
  type CreateCampaignInput,
  isConfigured,
} from "./client";

import {
  getSignalHouseContextForTeam,
  NEXTIER_BRANDS,
  NEXTIER_SUB_BRANDS,
  type NextierBrand,
  type NextierSubBrand,
} from "./tenant-mapping";

// ============ ADMIN DASHBOARD SERVICE ============

export interface AdminDashboardData {
  configured: boolean;
  brands: Brand[];
  subGroups: SubGroup[];
  campaigns: Campaign[];
  phoneNumbers: PhoneNumber[];
  analytics: {
    totalSent: number;
    totalDelivered: number;
    deliveryRate: number;
    balance: number;
  } | null;
  localBrands: NextierBrand[];
  localSubBrands: NextierSubBrand[];
}

/**
 * Get all data needed for admin dashboard
 */
export async function getAdminDashboard(): Promise<AdminDashboardData> {
  if (!isConfigured()) {
    return {
      configured: false,
      brands: [],
      subGroups: [],
      campaigns: [],
      phoneNumbers: [],
      analytics: null,
      localBrands: NEXTIER_BRANDS,
      localSubBrands: NEXTIER_SUB_BRANDS,
    };
  }

  const [
    brandsResult,
    subGroupsResult,
    campaignsResult,
    numbersResult,
    analyticsResult,
  ] = await Promise.all([
    getBasicBrandDetails(),
    getSubGroups(),
    getCampaignBasicDetails(),
    getMyPhoneNumbers(),
    getDashboardAnalytics(),
  ]);

  return {
    configured: true,
    brands: brandsResult.success ? (brandsResult.data as Brand[]) || [] : [],
    subGroups: subGroupsResult.success
      ? (subGroupsResult.data as SubGroup[]) || []
      : [],
    campaigns: campaignsResult.success
      ? (campaignsResult.data as Campaign[]) || []
      : [],
    phoneNumbers: numbersResult.success
      ? (numbersResult.data as PhoneNumber[]) || []
      : [],
    analytics: analyticsResult.success
      ? {
          totalSent: analyticsResult.data?.totalSent || 0,
          totalDelivered: analyticsResult.data?.totalDelivered || 0,
          deliveryRate: analyticsResult.data?.deliveryRate || 0,
          balance: analyticsResult.data?.balance || 0,
        }
      : null,
    localBrands: NEXTIER_BRANDS,
    localSubBrands: NEXTIER_SUB_BRANDS,
  };
}

// ============ CAMPAIGN MANAGEMENT ============

/**
 * Create a SignalHouse campaign for a team's messaging
 */
export async function createTeamCampaign(
  teamId: string,
  usecase: string,
  description: string,
  sampleMessages: string[],
): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
  // Get SignalHouse context for this team
  const context = await getSignalHouseContextForTeam(teamId);
  if (!context) {
    return { success: false, error: "No SignalHouse context for team" };
  }

  const input: CreateCampaignInput = {
    brandId: context.brandId,
    usecase,
    description,
    sampleMessages,
    subGroupId: context.subGroupId,
    messageFlow: `User opts in via web form or SMS keyword. 
                  System sends initial value message.
                  Follow-up based on user engagement.`,
    helpMessage: "Reply HELP for assistance.",
    optoutMessage: "You have been unsubscribed. Reply START to resubscribe.",
  };

  const result = await createCampaign(input);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, campaign: result.data };
}

/**
 * Get all campaigns grouped by sub-group
 */
export async function getCampaignsBySubGroup(): Promise<
  Map<string, Campaign[]>
> {
  const result = await getCampaignBasicDetails();
  if (!result.success || !result.data) {
    return new Map();
  }

  const grouped = new Map<string, Campaign[]>();
  for (const campaign of result.data) {
    const key = (campaign as any).subGroupId || "unassigned";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(campaign);
  }

  return grouped;
}

// ============ PHONE NUMBER MANAGEMENT ============

/**
 * Provision a phone number for a team
 */
export async function provisionNumberForTeam(
  teamId: string,
  phoneNumber: string,
  campaignId: string,
): Promise<{ success: boolean; phone?: PhoneNumber; error?: string }> {
  // Buy the number
  const buyResult = await buyPhoneNumber(
    phoneNumber,
    `Team ${teamId} - ${new Date().toISOString()}`,
  );

  if (!buyResult.success) {
    return { success: false, error: buyResult.error };
  }

  // Configure for campaign
  const configResult = await configurePhoneNumber(phoneNumber, {
    campaignId,
    smsWebhookUrl: `${process.env.NEXT_PUBLIC_API_URL || ""}/api/webhook/signalhouse`,
  });

  if (!configResult.success) {
    return {
      success: false,
      error: `Number purchased but config failed: ${configResult.error}`,
    };
  }

  return { success: true, phone: configResult.data };
}

/**
 * Get phone numbers grouped by campaign
 */
export async function getPhoneNumbersByCampaign(): Promise<
  Map<string, PhoneNumber[]>
> {
  const result = await getMyPhoneNumbers();
  if (!result.success || !result.data) {
    return new Map();
  }

  const grouped = new Map<string, PhoneNumber[]>();
  for (const phone of result.data) {
    const key = phone.campaignId || "unassigned";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(phone);
  }

  return grouped;
}

// ============ MESSAGING SHORTCUTS ============

/**
 * Send message with automatic team context
 */
export async function sendTeamMessage(
  teamId: string,
  to: string,
  message: string,
  mediaUrl?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const context = await getSignalHouseContextForTeam(teamId);
  if (!context?.fromNumber) {
    return { success: false, error: "No phone number configured for team" };
  }

  const result = mediaUrl
    ? await sendMMS({
        from: context.fromNumber,
        to,
        message,
        mediaUrl,
      })
    : await sendSMS({
        from: context.fromNumber,
        to,
        message,
      });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, messageId: result.data?.messageId };
}

// ============ USAGE & BILLING ============

export interface UsageSummary {
  balance: number;
  totalSpent: number;
  messagesSent: number;
  deliveryRate: number;
  costPerMessage: number;
}

export async function getUsageSummary(): Promise<UsageSummary | null> {
  const [walletResult, analyticsResult] = await Promise.all([
    getWalletSummary(),
    getDashboardAnalytics(),
  ]);

  if (!walletResult.success || !analyticsResult.success) {
    return null;
  }

  const wallet = walletResult.data!;
  const analytics = analyticsResult.data!;

  return {
    balance: wallet.balance,
    totalSpent: 0, // Would need usage endpoint
    messagesSent: analytics.totalSent,
    deliveryRate: analytics.deliveryRate,
    costPerMessage:
      analytics.totalSent > 0 ? wallet.balance / analytics.totalSent : 0,
  };
}
