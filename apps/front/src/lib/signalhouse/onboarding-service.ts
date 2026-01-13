/**
 * SignalHouse Tenant Onboarding Service
 *
 * Database-backed onboarding for SignalHouse multi-tenant setup.
 * Replaces hardcoded arrays in tenant-mapping.ts with DB-driven flow.
 *
 * Flow:
 * 1. Team created → ensureSubGroup() → store in teams.signalhouseSubGroupId
 * 2. Brand registered → ensureBrand() → store in teams.signalhouseBrandId
 * 3. Campaign submitted → ensureCampaigns() → store in signalhouse_campaigns
 * 4. Numbers purchased → ensureWorkerNumbers() → store in worker_phone_assignments
 */

import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
  teams,
  signalhouseCampaigns,
  workerPhoneAssignments,
} from "@/lib/db/schema";
import {
  createSubGroup,
  createBrand,
  createCampaign,
  buyPhoneNumber,
  configurePhoneNumber,
  getSubGroupDetails,
  type CreateBrandInput,
  type CreateCampaignInput,
} from "./client";

// ============================================================
// TYPES
// ============================================================

export type CampaignType = "MARKETING" | "NURTURE" | "ALERTS" | "BOOKING";

export type OnboardingStep =
  | "subgroup"
  | "brand"
  | "campaign"
  | "numbers"
  | "complete";

export interface OnboardingStatus {
  teamId: string;
  currentStep: OnboardingStep;
  subGroup: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  campaigns: Array<{ type: CampaignType; id: string; status: string }>;
  numbers: Array<{ phone: string; workerId: string; workerName: string }>;
  errors: string[];
}

export interface OnboardingResult {
  success: boolean;
  status: OnboardingStatus;
}

// ============================================================
// SUB-GROUP MANAGEMENT
// ============================================================

/**
 * Ensure team has a SignalHouse sub-group.
 * Creates one if missing, returns existing if present.
 */
export async function ensureSubGroup(teamId: string): Promise<{
  success: boolean;
  subGroupId?: string;
  error?: string;
}> {
  try {
    // Check if team already has sub-group
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return { success: false, error: "Team not found" };
    }

    if (team.signalhouseSubGroupId) {
      // Verify it still exists in SignalHouse
      const details = await getSubGroupDetails(team.signalhouseSubGroupId);
      if (details.success) {
        return { success: true, subGroupId: team.signalhouseSubGroupId };
      }
      // Sub-group was deleted, need to recreate
    }

    // Create new sub-group
    const result = await createSubGroup({
      name: team.name || `Team ${teamId}`,
      description: `Auto-created for team: ${team.name}`,
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error || "Failed to create sub-group" };
    }

    // Store in database
    await db
      .update(teams)
      .set({
        signalhouseSubGroupId: result.data.subGroupId,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));

    return { success: true, subGroupId: result.data.subGroupId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================
// BRAND MANAGEMENT
// ============================================================

/**
 * Ensure team has a SignalHouse brand.
 * Creates one if missing, returns existing if present.
 */
export async function ensureBrand(
  teamId: string,
  brandDetails?: Partial<CreateBrandInput>
): Promise<{
  success: boolean;
  brandId?: string;
  error?: string;
}> {
  try {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return { success: false, error: "Team not found" };
    }

    if (team.signalhouseBrandId) {
      return { success: true, brandId: team.signalhouseBrandId };
    }

    // Create new brand (requires business info)
    const brandInput: CreateBrandInput = {
      legalCompanyName: brandDetails?.legalCompanyName || team.name || "Unknown Company",
      brandName: brandDetails?.brandName || team.name || "Unknown Brand",
      entityType: brandDetails?.entityType || "PRIVATE_PROFIT",
      ...brandDetails,
    };

    const result = await createBrand(brandInput);

    if (!result.success || !result.data) {
      return { success: false, error: result.error || "Failed to create brand" };
    }

    // Store in database
    await db
      .update(teams)
      .set({
        signalhouseBrandId: result.data.brandId,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));

    return { success: true, brandId: result.data.brandId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================
// CAMPAIGN MANAGEMENT
// ============================================================

/**
 * Ensure team has campaigns registered for specified types.
 */
export async function ensureCampaigns(
  teamId: string,
  campaignTypes: CampaignType[]
): Promise<{
  success: boolean;
  campaigns: Array<{ type: CampaignType; id: string; status: string }>;
  errors: string[];
}> {
  const campaigns: Array<{ type: CampaignType; id: string; status: string }> = [];
  const errors: string[] = [];

  try {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return { success: false, campaigns: [], errors: ["Team not found"] };
    }

    if (!team.signalhouseBrandId) {
      return { success: false, campaigns: [], errors: ["Team has no brand registered"] };
    }

    for (const campaignType of campaignTypes) {
      // Check if campaign already exists
      const existing = await db.query.signalhouseCampaigns.findFirst({
        where: and(
          eq(signalhouseCampaigns.teamId, teamId),
          eq(signalhouseCampaigns.campaignType, campaignType)
        ),
      });

      if (existing) {
        campaigns.push({
          type: campaignType,
          id: existing.id,
          status: existing.status || "pending",
        });
        continue;
      }

      // Create new campaign in SignalHouse
      const campaignInput: CreateCampaignInput = {
        brandId: team.signalhouseBrandId,
        usecase: mapCampaignTypeToUseCase(campaignType),
        description: `${campaignType} campaign for ${team.name}`,
        subGroupId: team.signalhouseSubGroupId || undefined,
      };

      const result = await createCampaign(campaignInput);

      if (!result.success) {
        errors.push(`Failed to create ${campaignType} campaign: ${result.error}`);
        continue;
      }

      // Insert into database
      const inserted = await db
        .insert(signalhouseCampaigns)
        .values({
          teamId,
          campaignType,
          name: `${team.name} - ${campaignType}`,
          shCampaignId: result.data?.campaignId,
          shBrandId: team.signalhouseBrandId,
          shSubGroupId: team.signalhouseSubGroupId,
          useCase: mapCampaignTypeToUseCase(campaignType),
          status: "submitted",
          submittedAt: new Date(),
        })
        .returning();

      if (inserted[0]) {
        campaigns.push({
          type: campaignType,
          id: inserted[0].id,
          status: "submitted",
        });
      }
    }

    return {
      success: errors.length === 0,
      campaigns,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      campaigns,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Map internal campaign type to SignalHouse use case code
 */
function mapCampaignTypeToUseCase(type: CampaignType): string {
  switch (type) {
    case "MARKETING":
      return "MARKETING";
    case "NURTURE":
      return "LOW_VOLUME"; // Follow-ups typically low volume
    case "ALERTS":
      return "ACCOUNT_NOTIFICATION";
    case "BOOKING":
      return "CUSTOMER_CARE";
    default:
      return "MIXED";
  }
}

// ============================================================
// NUMBER MANAGEMENT
// ============================================================

/**
 * Ensure workers have phone numbers assigned.
 * Uses existing worker_phone_assignments table.
 */
export async function ensureWorkerNumbers(
  teamId: string,
  workers: Array<{ workerId: string; workerName: string }>
): Promise<{
  success: boolean;
  assignments: Array<{ workerId: string; workerName: string; phoneNumber: string }>;
  errors: string[];
}> {
  const assignments: Array<{ workerId: string; workerName: string; phoneNumber: string }> = [];
  const errors: string[] = [];

  try {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return { success: false, assignments: [], errors: ["Team not found"] };
    }

    for (const worker of workers) {
      // Check if worker already has a number
      const existing = await db.query.workerPhoneAssignments.findFirst({
        where: and(
          eq(workerPhoneAssignments.teamId, teamId),
          eq(workerPhoneAssignments.workerId, worker.workerId)
        ),
      });

      if (existing) {
        assignments.push({
          workerId: worker.workerId,
          workerName: worker.workerName,
          phoneNumber: existing.phoneNumber,
        });
        continue;
      }

      // Buy a new number from SignalHouse
      const buyResult = await buyPhoneNumber(
        "", // Empty = let SignalHouse pick
        `${team.name} - ${worker.workerName}`
      );

      if (!buyResult.success || !buyResult.data?.phoneNumber) {
        errors.push(`Failed to buy number for ${worker.workerName}: ${buyResult.error}`);
        continue;
      }

      const phoneNumber = buyResult.data.phoneNumber;

      // Configure the number
      await configurePhoneNumber(phoneNumber, {
        smsWebhookUrl: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/webhook/signalhouse`
          : undefined,
      });

      // Insert into worker_phone_assignments
      await db.insert(workerPhoneAssignments).values({
        teamId,
        workerId: worker.workerId,
        workerName: worker.workerName,
        phoneNumber,
        signalhouseSubgroupId: team.signalhouseSubGroupId,
        isActive: true,
      });

      assignments.push({
        workerId: worker.workerId,
        workerName: worker.workerName,
        phoneNumber,
      });
    }

    return {
      success: errors.length === 0,
      assignments,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      assignments,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// ============================================================
// FULL ONBOARDING PIPELINE
// ============================================================

/**
 * Run full onboarding pipeline for a team.
 * Idempotent - safe to call multiple times.
 */
export async function onboardTenant(
  teamId: string,
  options?: {
    brandDetails?: Partial<CreateBrandInput>;
    campaignTypes?: CampaignType[];
    workers?: Array<{ workerId: string; workerName: string }>;
  }
): Promise<OnboardingResult> {
  const status: OnboardingStatus = {
    teamId,
    currentStep: "subgroup",
    subGroup: null,
    brand: null,
    campaigns: [],
    numbers: [],
    errors: [],
  };

  // Step 1: Ensure sub-group
  const subGroupResult = await ensureSubGroup(teamId);
  if (!subGroupResult.success) {
    status.errors.push(subGroupResult.error || "Sub-group creation failed");
    return { success: false, status };
  }
  status.subGroup = { id: subGroupResult.subGroupId!, name: "Default" };
  status.currentStep = "brand";

  // Step 2: Ensure brand
  const brandResult = await ensureBrand(teamId, options?.brandDetails);
  if (!brandResult.success) {
    status.errors.push(brandResult.error || "Brand creation failed");
    return { success: false, status };
  }
  status.brand = { id: brandResult.brandId!, name: options?.brandDetails?.brandName || "Default" };
  status.currentStep = "campaign";

  // Step 3: Ensure campaigns
  const campaignTypes = options?.campaignTypes || ["MARKETING"];
  const campaignResult = await ensureCampaigns(teamId, campaignTypes);
  status.campaigns = campaignResult.campaigns;
  if (campaignResult.errors.length > 0) {
    status.errors.push(...campaignResult.errors);
  }
  status.currentStep = "numbers";

  // Step 4: Ensure worker numbers (optional)
  if (options?.workers && options.workers.length > 0) {
    const numberResult = await ensureWorkerNumbers(teamId, options.workers);
    status.numbers = numberResult.assignments;
    if (numberResult.errors.length > 0) {
      status.errors.push(...numberResult.errors);
    }
  }

  status.currentStep = status.errors.length === 0 ? "complete" : status.currentStep;

  return {
    success: status.errors.length === 0,
    status,
  };
}

// ============================================================
// STATUS CHECK
// ============================================================

/**
 * Get current onboarding status for a team.
 */
export async function getOnboardingStatus(teamId: string): Promise<OnboardingStatus> {
  const status: OnboardingStatus = {
    teamId,
    currentStep: "subgroup",
    subGroup: null,
    brand: null,
    campaigns: [],
    numbers: [],
    errors: [],
  };

  try {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      status.errors.push("Team not found");
      return status;
    }

    // Check sub-group
    if (team.signalhouseSubGroupId) {
      status.subGroup = { id: team.signalhouseSubGroupId, name: team.name || "Default" };
      status.currentStep = "brand";
    }

    // Check brand
    if (team.signalhouseBrandId) {
      status.brand = { id: team.signalhouseBrandId, name: team.name || "Default" };
      status.currentStep = "campaign";
    }

    // Check campaigns
    const campaigns = await db.query.signalhouseCampaigns.findMany({
      where: eq(signalhouseCampaigns.teamId, teamId),
    });
    status.campaigns = campaigns.map((c) => ({
      type: c.campaignType as CampaignType,
      id: c.id,
      status: c.status || "pending",
    }));
    if (campaigns.length > 0) {
      status.currentStep = "numbers";
    }

    // Check numbers
    const numbers = await db.query.workerPhoneAssignments.findMany({
      where: eq(workerPhoneAssignments.teamId, teamId),
    });
    status.numbers = numbers.map((n) => ({
      workerId: n.workerId,
      workerName: n.workerName,
      phone: n.phoneNumber,
    }));
    if (numbers.length > 0) {
      status.currentStep = "complete";
    }

    return status;
  } catch (error) {
    status.errors.push(error instanceof Error ? error.message : "Unknown error");
    return status;
  }
}
