/**
 * Send Context Resolver
 *
 * Resolves the correct SignalHouse context (sub-group, campaign, phone number)
 * for sending SMS messages on behalf of a tenant.
 *
 * Uses EXISTING infrastructure:
 * - teams table: signalhouseSubGroupId, signalhouseBrandId
 * - worker_phone_assignments table: worker→phone mapping (legacy)
 * - signalhouse_campaigns table: campaign registration
 * - sms_phone_pool table: rotation-enabled phone pool (NEW)
 */

import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
  teams,
  signalhouseCampaigns,
  workerPhoneAssignments,
} from "@/lib/db/schema";
import {
  selectNextPhone,
  hasRotationPool,
  type RotationStrategy,
} from "./phone-rotation.service";

// ============================================================
// TYPES
// ============================================================

export type CampaignType = "MARKETING" | "NURTURE" | "ALERTS" | "BOOKING";

export type WorkerId = "gianna" | "cathy" | "sabrina" | "neva" | "luci";

export interface SendContext {
  teamId: string;
  teamName: string;
  // SignalHouse identifiers
  shSubGroupId: string;
  shBrandId?: string;
  shCampaignId?: string;
  // Phone number to send from
  phoneNumber: string;
  // Worker info (if applicable)
  workerId?: string;
  workerName?: string;
  // Campaign info
  campaignType?: CampaignType;
  campaignId?: string;
  // Phone pool rotation tracking (for recordSendResult)
  poolEntryId?: string;
  usedRotation?: boolean;
}

export interface SendContextError {
  code:
    | "TEAM_NOT_FOUND"
    | "NOT_ONBOARDED"
    | "NO_CAMPAIGN"
    | "NO_NUMBER"
    | "CAMPAIGN_NOT_APPROVED";
  message: string;
}

export type SendContextResult =
  | { success: true; context: SendContext }
  | { success: false; error: SendContextError };

// ============================================================
// RESOLVE SEND CONTEXT
// ============================================================

/**
 * Resolve the full SignalHouse context for sending SMS.
 *
 * @param teamId - The team sending the message
 * @param options - Optional preferences for campaign type, worker, and rotation strategy
 * @returns SendContext with all identifiers needed for SignalHouse API
 */
export async function getSendContext(
  teamId: string,
  options?: {
    campaignType?: CampaignType;
    preferredWorkerId?: WorkerId;
    requireApprovedCampaign?: boolean;
    rotationStrategy?: RotationStrategy; // NEW: round-robin | least-used | best-health
  },
): Promise<SendContextResult> {
  try {
    // 1. Get team with SignalHouse identifiers
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return {
        success: false,
        error: {
          code: "TEAM_NOT_FOUND",
          message: `Team not found: ${teamId}`,
        },
      };
    }

    // 2. Verify team is onboarded to SignalHouse
    if (!team.signalhouseSubGroupId) {
      return {
        success: false,
        error: {
          code: "NOT_ONBOARDED",
          message:
            "Team has not been onboarded to SignalHouse. Call onboardTenant() first.",
        },
      };
    }

    // 3. Get campaign (optional but recommended)
    let campaign = null;
    if (options?.campaignType) {
      const campaignQuery = and(
        eq(signalhouseCampaigns.teamId, teamId),
        eq(signalhouseCampaigns.campaignType, options.campaignType),
      );

      campaign = await db.query.signalhouseCampaigns.findFirst({
        where: campaignQuery,
      });

      if (!campaign) {
        return {
          success: false,
          error: {
            code: "NO_CAMPAIGN",
            message: `No ${options.campaignType} campaign found for team`,
          },
        };
      }

      if (options.requireApprovedCampaign && campaign.status !== "approved") {
        return {
          success: false,
          error: {
            code: "CAMPAIGN_NOT_APPROVED",
            message: `${options.campaignType} campaign is not yet approved (status: ${campaign.status})`,
          },
        };
      }
    }

    // 4. Get phone number - TRY ROTATION POOL FIRST, then fall back to legacy

    // 4a. Check if rotation pool is configured for this team
    const useRotation = await hasRotationPool(teamId);

    if (useRotation) {
      // Use rotation pool with configured strategy
      const rotatedPhone = await selectNextPhone(
        teamId,
        options?.preferredWorkerId,
        options?.rotationStrategy || "round-robin",
      );

      if (rotatedPhone) {
        return {
          success: true,
          context: {
            teamId,
            teamName: team.name || "Unknown",
            shSubGroupId: team.signalhouseSubGroupId,
            shBrandId: team.signalhouseBrandId || undefined,
            shCampaignId: campaign?.shCampaignId || undefined,
            phoneNumber: rotatedPhone.phoneNumber,
            workerId: rotatedPhone.workerId,
            campaignType: options?.campaignType,
            campaignId: campaign?.id,
            // Rotation tracking for recordSendResult()
            poolEntryId: rotatedPhone.poolEntryId,
            usedRotation: true,
          },
        };
      }
      // If rotation pool is empty/unhealthy, fall through to legacy
    }

    // 4b. Legacy: Get phone from worker_phone_assignments
    const workerQuery = options?.preferredWorkerId
      ? and(
          eq(workerPhoneAssignments.teamId, teamId),
          eq(workerPhoneAssignments.workerId, options.preferredWorkerId),
          eq(workerPhoneAssignments.isActive, true),
        )
      : and(
          eq(workerPhoneAssignments.teamId, teamId),
          eq(workerPhoneAssignments.isActive, true),
        );

    const workerPhone = await db.query.workerPhoneAssignments.findFirst({
      where: workerQuery,
    });

    if (!workerPhone) {
      // 4c. Final fallback: try teams.signalhousePhonePool
      const phonePool = team.signalhousePhonePool as string[] | null;
      if (phonePool && phonePool.length > 0) {
        return {
          success: true,
          context: {
            teamId,
            teamName: team.name || "Unknown",
            shSubGroupId: team.signalhouseSubGroupId,
            shBrandId: team.signalhouseBrandId || undefined,
            shCampaignId: campaign?.shCampaignId || undefined,
            phoneNumber: phonePool[0],
            campaignType: options?.campaignType,
            campaignId: campaign?.id,
          },
        };
      }

      return {
        success: false,
        error: {
          code: "NO_NUMBER",
          message: options?.preferredWorkerId
            ? `No active phone number for worker: ${options.preferredWorkerId}`
            : "No active phone numbers found for team",
        },
      };
    }

    // 5. Build and return context (legacy path)
    return {
      success: true,
      context: {
        teamId,
        teamName: team.name || "Unknown",
        shSubGroupId: team.signalhouseSubGroupId,
        shBrandId: team.signalhouseBrandId || undefined,
        shCampaignId: campaign?.shCampaignId || undefined,
        phoneNumber: workerPhone.phoneNumber,
        workerId: workerPhone.workerId,
        workerName: workerPhone.workerName,
        campaignType: options?.campaignType,
        campaignId: campaign?.id,
        usedRotation: false,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to resolve send context: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ============================================================
// WORKER-SPECIFIC RESOLVERS
// ============================================================

/**
 * Get send context for GIANNA (opener worker).
 */
export async function getGiannaSendContext(
  teamId: string,
): Promise<SendContextResult> {
  return getSendContext(teamId, {
    campaignType: "MARKETING",
    preferredWorkerId: "gianna",
  });
}

/**
 * Get send context for CATHY (nudger worker).
 */
export async function getCathySendContext(
  teamId: string,
): Promise<SendContextResult> {
  return getSendContext(teamId, {
    campaignType: "NURTURE",
    preferredWorkerId: "cathy",
  });
}

/**
 * Get send context for SABRINA (closer worker).
 */
export async function getSabrinaSendContext(
  teamId: string,
): Promise<SendContextResult> {
  return getSendContext(teamId, {
    campaignType: "BOOKING",
    preferredWorkerId: "sabrina",
  });
}

// ============================================================
// PHONE NUMBER LOOKUP
// ============================================================

/**
 * Resolve tenant info from a phone number.
 * Used for inbound message routing.
 *
 * @param phoneNumber - E.164 formatted phone number
 * @returns Tenant info if found
 */
export async function resolveTenantFromPhone(phoneNumber: string): Promise<{
  teamId: string;
  teamName: string;
  workerId: string;
  workerName: string;
  shSubGroupId?: string;
} | null> {
  // Normalize phone number
  const normalized = normalizePhoneNumber(phoneNumber);

  // Try worker_phone_assignments first
  const assignment = await db.query.workerPhoneAssignments.findFirst({
    where: eq(workerPhoneAssignments.phoneNumber, normalized),
  });

  if (assignment) {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, assignment.teamId),
    });

    return {
      teamId: assignment.teamId,
      teamName: team?.name || "Unknown",
      workerId: assignment.workerId,
      workerName: assignment.workerName,
      shSubGroupId: assignment.signalhouseSubgroupId || undefined,
    };
  }

  // Fallback: check teams.signalhousePhonePool
  const allTeams = await db.query.teams.findMany();
  for (const team of allTeams) {
    const phonePool = team.signalhousePhonePool as string[] | null;
    if (phonePool?.includes(normalized)) {
      return {
        teamId: team.id,
        teamName: team.name || "Unknown",
        workerId: "unknown",
        workerName: "Pool Number",
        shSubGroupId: team.signalhouseSubGroupId || undefined,
      };
    }
  }

  return null;
}

/**
 * Normalize phone number to E.164 format.
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");

  // Handle US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // Already in E.164 or international
  return phone.startsWith("+") ? phone : `+${digits}`;
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Check if a team is fully onboarded and ready to send.
 */
export async function validateTeamCanSend(teamId: string): Promise<{
  canSend: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!team) {
    return { canSend: false, issues: ["Team not found"] };
  }

  if (!team.signalhouseSubGroupId) {
    issues.push("Team has no SignalHouse sub-group");
  }

  if (!team.signalhouseBrandId) {
    issues.push("Team has no SignalHouse brand registered");
  }

  // Check for at least one active phone number
  const numbers = await db.query.workerPhoneAssignments.findMany({
    where: and(
      eq(workerPhoneAssignments.teamId, teamId),
      eq(workerPhoneAssignments.isActive, true),
    ),
  });

  if (numbers.length === 0) {
    // Check phone pool fallback
    const phonePool = team.signalhousePhonePool as string[] | null;
    if (!phonePool || phonePool.length === 0) {
      issues.push("Team has no active phone numbers");
    }
  }

  return {
    canSend: issues.length === 0,
    issues,
  };
}

// ============================================================
// RE-EXPORT ROTATION UTILITIES
// ============================================================

// Re-export rotation functions for callers who need to track send results
export {
  recordSendResult,
  addPhoneToPool,
  removePhoneFromPool,
  getPoolHealthStats,
  resetDailyCounts,
  reEnablePhone,
} from "./phone-rotation.service";

export type { RotationStrategy } from "./phone-rotation.service";
