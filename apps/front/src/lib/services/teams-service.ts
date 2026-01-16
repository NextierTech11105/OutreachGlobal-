/**
 * Teams Service - Multi-Tenant Operations
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Provides unified team management aligned with SignalHouse.io architecture:
 *
 * HIERARCHY:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  TEAM (Organization)                                                │
 * │    ├── Owner (userId) - Billing responsibility                     │
 * │    ├── Members (teamMembers) - Role-based access                   │
 * │    ├── Settings (teamSettings) - Config/preferences                │
 * │    │                                                               │
 * │    └── SignalHouse Tenant (1:1 mapping)                           │
 * │          ├── Brand (10DLC registration)                           │
 * │          ├── Campaigns (industry-agnostic, unlimited)             │
 * │          ├── Phone Pool (rotating numbers)                        │
 * │          └── SMS Messages → Call Queue (traceable link)          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * INDUSTRY AGNOSTIC DESIGN:
 * - Campaign intents define messaging strategy, not industry
 * - Templates use variable substitution for personalization
 * - Same pipeline works for: plumbers, realtors, trucking, roofing, etc.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/lib/db";
import {
  teams,
  teamMembers,
  teamSettings,
  teamPhoneNumbers,
  signalhouseBrands,
  signalhouseCampaigns,
  leads,
  smsPhonePool,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface TeamContext {
  teamId: string;
  teamName: string;
  ownerId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

export interface TeamSignalHouseConfig {
  brandId: string | null;
  activeCampaigns: number;
  phonePoolSize: number;
  isFullyConfigured: boolean;
}

export interface CampaignBlockMapping {
  campaignId: string;
  signalhouseCampaignId: string | null;
  signalhouseBrandId: string | null;
  phoneNumbers: string[];
  industry: string | null; // Optional - campaigns are industry-agnostic
}

// ============================================================================
// TEAM LOOKUP & CONTEXT
// ============================================================================

/**
 * Get full team context for a user
 * Includes role determination (owner vs member)
 */
export async function getTeamContext(
  userId: string,
  teamId: string,
): Promise<TeamContext | null> {
  if (!db) {
    Logger.error("TeamsService", "Database not configured");
    return null;
  }

  try {
    // Get team details
    const teamResult = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (teamResult.length === 0) {
      return null;
    }

    const team = teamResult[0];

    // Check if user is owner
    if (team.ownerId === userId) {
      return {
        teamId: team.id,
        teamName: team.name,
        ownerId: team.ownerId,
        role: "OWNER",
      };
    }

    // Check team membership
    const memberResult = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (memberResult.length === 0) {
      return null; // User not authorized for this team
    }

    const member = memberResult[0];
    return {
      teamId: team.id,
      teamName: team.name,
      ownerId: team.ownerId,
      role: member.role === "ADMIN" ? "ADMIN" : "MEMBER",
    };
  } catch (error: any) {
    Logger.error("TeamsService", "Error getting team context", {
      error: error.message,
      userId,
      teamId,
    });
    return null;
  }
}

/**
 * Get all teams a user has access to
 * Returns teams where user is owner OR active member
 */
export async function getUserTeams(userId: string): Promise<
  Array<{
    teamId: string;
    teamName: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
  }>
> {
  if (!db) {
    return [];
  }

  try {
    const userTeams: Array<{
      teamId: string;
      teamName: string;
      role: "OWNER" | "ADMIN" | "MEMBER";
    }> = [];

    // Teams user owns
    const ownedTeams = await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.ownerId, userId));

    for (const team of ownedTeams) {
      userTeams.push({
        teamId: team.id,
        teamName: team.name,
        role: "OWNER",
      });
    }

    // Teams user is a member of
    const memberships = await db
      .select({
        teamId: teamMembers.teamId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.userId, userId), eq(teamMembers.status, "ACTIVE")),
      );

    for (const membership of memberships) {
      // Skip if already added as owner
      if (userTeams.some((t) => t.teamId === membership.teamId)) {
        continue;
      }

      // Get team details
      const teamResult = await db
        .select({ name: teams.name })
        .from(teams)
        .where(eq(teams.id, membership.teamId))
        .limit(1);

      if (teamResult.length > 0) {
        userTeams.push({
          teamId: membership.teamId,
          teamName: teamResult[0].name,
          role: membership.role === "ADMIN" ? "ADMIN" : "MEMBER",
        });
      }
    }

    return userTeams;
  } catch (error: any) {
    Logger.error("TeamsService", "Error getting user teams", {
      error: error.message,
      userId,
    });
    return [];
  }
}

// ============================================================================
// SIGNALHOUSE INTEGRATION
// ============================================================================

/**
 * Get SignalHouse configuration for a team
 * This links the team to its SignalHouse tenant/brand/campaigns
 */
export async function getTeamSignalHouseConfig(
  teamId: string,
): Promise<TeamSignalHouseConfig> {
  if (!db) {
    return {
      brandId: null,
      activeCampaigns: 0,
      phonePoolSize: 0,
      isFullyConfigured: false,
    };
  }

  try {
    // Get SignalHouse brand for team
    const brandResult = await db
      .select()
      .from(signalhouseBrands)
      .where(eq(signalhouseBrands.teamId, teamId))
      .limit(1);

    const brandId = brandResult.length > 0 ? brandResult[0].id : null;

    // Count active campaigns
    let activeCampaigns = 0;
    if (brandId) {
      const campaignResult = await db
        .select()
        .from(signalhouseCampaigns)
        .where(
          and(
            eq(signalhouseCampaigns.teamId, teamId),
            eq(signalhouseCampaigns.status, "ACTIVE"),
          ),
        );
      activeCampaigns = campaignResult.length;
    }

    // Count phone pool
    const phoneResult = await db
      .select()
      .from(smsPhonePool)
      .where(
        and(eq(smsPhonePool.teamId, teamId), eq(smsPhonePool.status, "ACTIVE")),
      );
    const phonePoolSize = phoneResult.length;

    return {
      brandId,
      activeCampaigns,
      phonePoolSize,
      isFullyConfigured: brandId !== null && phonePoolSize > 0,
    };
  } catch (error: any) {
    Logger.error("TeamsService", "Error getting SignalHouse config", {
      error: error.message,
      teamId,
    });
    return {
      brandId: null,
      activeCampaigns: 0,
      phonePoolSize: 0,
      isFullyConfigured: false,
    };
  }
}

// ============================================================================
// CAMPAIGN BLOCK MAPPING (SMS → Call Queue Traceability)
// ============================================================================

/**
 * Get campaign block mapping for a team
 * Links internal campaigns to SignalHouse campaigns for traceability
 *
 * When SMS response triggers call queue, this mapping ensures:
 * - We know which SignalHouse campaign the SMS came from
 * - We know which brand/number pool was used
 * - We can track the full journey: SMS → Response → Call Queue → Outcome
 */
export async function getCampaignBlockMappings(
  teamId: string,
): Promise<CampaignBlockMapping[]> {
  if (!db) {
    return [];
  }

  try {
    const mappings: CampaignBlockMapping[] = [];

    // Get all SignalHouse campaigns for team
    const campaignResults = await db
      .select()
      .from(signalhouseCampaigns)
      .where(eq(signalhouseCampaigns.teamId, teamId));

    for (const campaign of campaignResults) {
      // Get phone numbers linked to this campaign
      const phoneResults = await db
        .select({ phoneNumber: smsPhonePool.phoneNumber })
        .from(smsPhonePool)
        .where(
          and(
            eq(smsPhonePool.teamId, teamId),
            eq(smsPhonePool.status, "ACTIVE"),
          ),
        );

      mappings.push({
        campaignId: campaign.id,
        signalhouseCampaignId: campaign.signalhouseCampaignId,
        signalhouseBrandId: campaign.brandId,
        phoneNumbers: phoneResults.map((p) => p.phoneNumber),
        industry: null, // Industry-agnostic - determined by lead data, not campaign
      });
    }

    return mappings;
  } catch (error: any) {
    Logger.error("TeamsService", "Error getting campaign mappings", {
      error: error.message,
      teamId,
    });
    return [];
  }
}

/**
 * Track SMS → Call Queue linkage
 * When a lead responds to SMS and gets added to call queue,
 * this captures the origin campaign for traceability
 */
export interface SMSToCallQueueLink {
  leadId: string;
  sourcePhoneNumber: string; // The SignalHouse number that sent the SMS
  signalhouseCampaignId: string | null;
  responseType: string; // Classification of the response
  callQueuePriority: number;
  timestamp: Date;
}

/**
 * Build the SMS → Call Queue link data
 * Used when promoting an SMS responder to call queue
 */
export function buildSMSToCallQueueLink(params: {
  leadId: string;
  sourcePhoneNumber: string;
  signalhouseCampaignId: string | null;
  responseType: string;
  priority: number;
}): SMSToCallQueueLink {
  return {
    leadId: params.leadId,
    sourcePhoneNumber: params.sourcePhoneNumber,
    signalhouseCampaignId: params.signalhouseCampaignId,
    responseType: params.responseType,
    callQueuePriority: params.priority,
    timestamp: new Date(),
  };
}

/**
 * Full Call Queue Item for SMS → Call Queue promotion
 * Ensures complete SignalHouse traceability when promoting SMS responders
 */
export interface CallQueuePromotion {
  leadId: string;
  leadName?: string;
  phone: string;
  email?: string;
  company?: string;

  // SignalHouse Traceability (CRITICAL)
  signalhouseCampaignId: string | null; // 10DLC campaign ID (e.g., CW7I6X5)
  signalhouseBrandId: string | null; // 10DLC brand ID (e.g., BZOYPIH)
  sourcePhoneNumber: string; // The number that sent the SMS
  campaignBlockId?: string; // Internal block tag (e.g., "campaign:ABC123")

  // Response Context
  responseType: string; // Classification: positive, email_capture, question
  responseText?: string; // The actual response text
  capturedEmail?: string; // If email was captured

  // Queue Config
  persona: "gianna" | "cathy" | "sabrina";
  campaignLane: string;
  priority: number; // 1-10, boosted for GOLD labels
  tags: string[]; // ["responded", "gold", "email_captured", etc.]

  // Industry-Agnostic Context
  industryId?: string; // Optional - campaigns work across all industries
  leadSource?: string; // usbizdata, realtor, property, etc.
}

/**
 * Build call queue promotion data from SMS response
 *
 * This is the CRITICAL function that ensures traceability:
 * SMS Campaign → Response → Call Queue → Outcome
 *
 * Industry-Agnostic: Same function works for plumbers, realtors, trucking, etc.
 */
export function buildCallQueuePromotion(params: {
  leadId: string;
  leadName?: string;
  phone: string;
  email?: string;
  company?: string;
  signalhouseCampaignId: string | null;
  signalhouseBrandId: string | null;
  sourcePhoneNumber: string;
  campaignBlockId?: string;
  responseType: string;
  responseText?: string;
  capturedEmail?: string;
  industryId?: string;
  leadSource?: string;
}): CallQueuePromotion {
  // Determine persona and priority based on response type
  let persona: "gianna" | "cathy" | "sabrina" = "gianna";
  let priority = 5;
  let campaignLane = "follow_up";
  const tags: string[] = ["responded"];

  // Email capture = GOLD LABEL = Highest priority
  if (params.responseType === "email_capture" || params.capturedEmail) {
    persona = "sabrina";
    priority = 10;
    campaignLane = "book_appointment";
    tags.push("gold", "email_captured");
  }
  // Positive response = High priority
  else if (params.responseType === "positive") {
    persona = "sabrina";
    priority = 8;
    campaignLane = "follow_up";
    tags.push("warm");
  }
  // Question = Medium-high priority (engaged but needs info)
  else if (params.responseType === "question") {
    persona = "gianna";
    priority = 7;
    campaignLane = "nurture";
    tags.push("curious");
  }

  return {
    leadId: params.leadId,
    leadName: params.leadName,
    phone: params.phone,
    email: params.email || params.capturedEmail,
    company: params.company,

    // SignalHouse Traceability
    signalhouseCampaignId: params.signalhouseCampaignId,
    signalhouseBrandId: params.signalhouseBrandId,
    sourcePhoneNumber: params.sourcePhoneNumber,
    campaignBlockId: params.campaignBlockId,

    // Response Context
    responseType: params.responseType,
    responseText: params.responseText,
    capturedEmail: params.capturedEmail,

    // Queue Config
    persona,
    campaignLane,
    priority,
    tags,

    // Industry-Agnostic
    industryId: params.industryId,
    leadSource: params.leadSource,
  };
}

// ============================================================================
// TEAM SETTINGS
// ============================================================================

/**
 * Get a team setting by name
 */
export async function getTeamSetting(
  teamId: string,
  name: string,
): Promise<string | null> {
  if (!db) {
    return null;
  }

  try {
    const result = await db
      .select({ value: teamSettings.value })
      .from(teamSettings)
      .where(and(eq(teamSettings.teamId, teamId), eq(teamSettings.name, name)))
      .limit(1);

    return result.length > 0 ? result[0].value : null;
  } catch (error: any) {
    Logger.error("TeamsService", "Error getting team setting", {
      error: error.message,
      teamId,
      name,
    });
    return null;
  }
}

/**
 * Get all settings for a team
 */
export async function getAllTeamSettings(
  teamId: string,
): Promise<Record<string, string>> {
  if (!db) {
    return {};
  }

  try {
    const results = await db
      .select({ name: teamSettings.name, value: teamSettings.value })
      .from(teamSettings)
      .where(eq(teamSettings.teamId, teamId));

    const settings: Record<string, string> = {};
    for (const row of results) {
      settings[row.name] = row.value || "";
    }
    return settings;
  } catch (error: any) {
    Logger.error("TeamsService", "Error getting all team settings", {
      error: error.message,
      teamId,
    });
    return {};
  }
}

// ============================================================================
// TEAM STATS
// ============================================================================

/**
 * Get team stats (leads count, etc.)
 */
export async function getTeamStats(teamId: string): Promise<{
  totalLeads: number;
  enrichedLeads: number;
  contactedLeads: number;
  phonePoolSize: number;
  activeCampaigns: number;
}> {
  if (!db) {
    return {
      totalLeads: 0,
      enrichedLeads: 0,
      contactedLeads: 0,
      phonePoolSize: 0,
      activeCampaigns: 0,
    };
  }

  try {
    // Total leads
    const allLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.teamId, teamId));

    const totalLeads = allLeads.length;
    const enrichedLeads = allLeads.filter(
      (l) => l.status === "ENRICHED" || l.mobile,
    ).length;
    const contactedLeads = allLeads.filter((l) =>
      ["CONTACTED", "RESPONDED", "BOOKED", "CONVERTED"].includes(
        l.status || "",
      ),
    ).length;

    // Phone pool
    const phones = await db
      .select()
      .from(smsPhonePool)
      .where(
        and(eq(smsPhonePool.teamId, teamId), eq(smsPhonePool.status, "ACTIVE")),
      );

    // Active campaigns
    const campaigns = await db
      .select()
      .from(signalhouseCampaigns)
      .where(
        and(
          eq(signalhouseCampaigns.teamId, teamId),
          eq(signalhouseCampaigns.status, "ACTIVE"),
        ),
      );

    return {
      totalLeads,
      enrichedLeads,
      contactedLeads,
      phonePoolSize: phones.length,
      activeCampaigns: campaigns.length,
    };
  } catch (error: any) {
    Logger.error("TeamsService", "Error getting team stats", {
      error: error.message,
      teamId,
    });
    return {
      totalLeads: 0,
      enrichedLeads: 0,
      contactedLeads: 0,
      phonePoolSize: 0,
      activeCampaigns: 0,
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const TeamsService = {
  getTeamContext,
  getUserTeams,
  getTeamSignalHouseConfig,
  getCampaignBlockMappings,
  buildSMSToCallQueueLink,
  buildCallQueuePromotion,
  getTeamSetting,
  getAllTeamSettings,
  getTeamStats,
};

export default TeamsService;
