/**
 * LUCI Service - Data Authority & Compliance Gatekeeper
 *
 * LUCI owns:
 * - Skip trace (Tracerfy)
 * - Verification (Trestle)
 * - Contactability scoring
 * - Compliance gating
 *
 * NEVA may NEVER override LUCI.
 */

import { db } from "@/lib/db";
import { leads, leadTags, tags } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type {
  LuciApprovedLead,
  LuciApprovalResult,
  LuciRecheckRequest,
  LuciRecheckResult,
  LuciStatus,
  LuciContactability,
  SuppressionReason,
  CampaignManifest,
  ExecutionBlock,
  RawIngestRecord,
} from "./types";
import { LUCI_THRESHOLDS, PERMANENT_SUPPRESSIONS, TCPA_CALLING_HOURS } from "./constants";

// Suppression tag slugs
const SUPPRESSION_TAG_SLUGS = {
  OPTED_OUT: "opted-out",
  DNC: "dnc",
  WRONG_NUMBER: "wrong-number",
  LITIGATOR: "litigator",
  COMPLIANCE_HOLD: "compliance-hold",
};

// =============================================================================
// HELPER: Get suppression tags for a lead
// =============================================================================

async function getLeadSuppressionTags(leadId: string): Promise<string[]> {
  const result = await db
    .select({ slug: tags.slug })
    .from(leadTags)
    .innerJoin(tags, eq(leadTags.tagId, tags.id))
    .where(
      and(
        eq(leadTags.leadId, leadId),
        inArray(tags.slug, Object.values(SUPPRESSION_TAG_SLUGS))
      )
    );
  return result.map(r => r.slug);
}

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Approve a lead for campaign outreach
 * This is the ONLY way to get a lead into CAMPAIGN_READY status
 */
export async function approve(
  leadId: string,
  teamId: string
): Promise<LuciApprovalResult> {
  try {
    // 1. Fetch lead
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.teamId, teamId)))
      .limit(1);

    if (!lead) {
      return {
        success: false,
        lead_id: leadId,
        status: "FAILED",
        can_contact: false,
        reason: "Lead not found",
      };
    }

    // 2. Check for suppression tags
    const suppressionTags = await getLeadSuppressionTags(leadId);

    const hasOptOut = suppressionTags.includes(SUPPRESSION_TAG_SLUGS.OPTED_OUT);
    const hasDNC = suppressionTags.includes(SUPPRESSION_TAG_SLUGS.DNC);
    const hasWrongNumber = suppressionTags.includes(SUPPRESSION_TAG_SLUGS.WRONG_NUMBER);

    if (hasOptOut || hasDNC) {
      return {
        success: false,
        lead_id: leadId,
        status: "SUPPRESSED",
        can_contact: false,
        reason: hasOptOut ? "Lead opted out" : "Do not contact",
      };
    }

    // 3. Calculate contactability score
    const contactability = calculateContactability(lead, hasWrongNumber);

    if (!contactability.is_valid) {
      return {
        success: false,
        lead_id: leadId,
        status: "FAILED",
        can_contact: false,
        reason: "Invalid phone number",
      };
    }

    if (contactability.dnc || contactability.litigator) {
      return {
        success: false,
        lead_id: leadId,
        status: "SUPPRESSED",
        can_contact: false,
        reason: contactability.dnc ? "DNC list" : "Known litigator",
      };
    }

    if (contactability.score < LUCI_THRESHOLDS.CAMPAIGN_READY_MIN_SCORE) {
      return {
        success: false,
        lead_id: leadId,
        status: "FAILED",
        can_contact: false,
        reason: `Score too low: ${contactability.score}`,
      };
    }

    // 4. Build approved lead (metadata may contain enrichment data)
    const meta = (lead.metadata || {}) as Record<string, unknown>;

    const approvedLead: LuciApprovedLead = {
      lead_id: leadId,
      team_id: teamId,
      tenant_slug: lead.teamId, // TODO: Map to tenant slug
      source: lead.source || "import",

      business: {
        name: lead.company || (meta.businessName as string) || "",
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        zip: lead.zipCode || "",
        sic_code: (meta.sicCode as string) || null,
        industry: (meta.industry as string) || null,
      },

      owner: {
        first_name: lead.firstName || "",
        last_name: lead.lastName || "",
        name: `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
        mobile: lead.phone || "",
        email: lead.email || null,
      },

      contactability,

      campaign_context: {
        campaign_id: null,
        intent: "discovery",
        channel: "sms",
        worker_stage: "GIANNA",
      },

      constraints: {
        no_contact_reasons: [],
        compliance_locked: false,
        cooldown_until: null,
      },

      status: "CAMPAIGN_READY",
      traced_at: meta.enrichedAt ? new Date(meta.enrichedAt as string) : null,
      verified_at: meta.verifiedAt ? new Date(meta.verifiedAt as string) : null,
      approved_at: new Date(),
    };

    return {
      success: true,
      lead_id: leadId,
      status: "CAMPAIGN_READY",
      can_contact: true,
      approved_lead: approvedLead,
    };
  } catch (error) {
    console.error("[LUCI] Approval error:", error);
    return {
      success: false,
      lead_id: leadId,
      status: "FAILED",
      can_contact: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Recheck a lead when NEVA finds risk flags
 * LUCI has final authority to suppress or approve
 */
export async function recheck(
  request: LuciRecheckRequest
): Promise<LuciRecheckResult> {
  const { lead_id, team_id, risk_flags } = request;

  // If any serious risk flag, suppress
  if (risk_flags.legal || risk_flags.reputation) {
    await suppress(lead_id, team_id, "COMPLIANCE_HOLD");

    return {
      lead_id,
      previous_status: "CAMPAIGN_READY",
      new_status: "SUPPRESSED",
      suppression_reason: "COMPLIANCE_HOLD",
      action_taken: "SUPPRESSED",
      reviewed_at: new Date(),
    };
  }

  // Financial distress alone → hold for review but don't suppress
  if (risk_flags.financial_distress) {
    return {
      lead_id,
      previous_status: "CAMPAIGN_READY",
      new_status: "CAMPAIGN_READY",
      suppression_reason: null,
      action_taken: "HOLD_FOR_REVIEW",
      reviewed_at: new Date(),
    };
  }

  return {
    lead_id,
    previous_status: "CAMPAIGN_READY",
    new_status: "CAMPAIGN_READY",
    suppression_reason: null,
    action_taken: "APPROVED",
    reviewed_at: new Date(),
  };
}

/**
 * Suppress a lead - add to suppression list
 * Permanent suppressions (DNC, OPT_OUT, LITIGATOR) cannot be undone
 */
export async function suppress(
  leadId: string,
  teamId: string,
  reason: SuppressionReason
): Promise<void> {
  // Map reason to tag slug
  const tagSlug = reason === "OPT_OUT" ? SUPPRESSION_TAG_SLUGS.OPTED_OUT :
                  reason === "DNC" ? SUPPRESSION_TAG_SLUGS.DNC :
                  reason === "WRONG_NUMBER" ? SUPPRESSION_TAG_SLUGS.WRONG_NUMBER :
                  reason === "LITIGATOR" ? SUPPRESSION_TAG_SLUGS.LITIGATOR :
                  SUPPRESSION_TAG_SLUGS.COMPLIANCE_HOLD;

  // Find or create the suppression tag
  let [existingTag] = await db
    .select()
    .from(tags)
    .where(eq(tags.slug, tagSlug))
    .limit(1);

  if (!existingTag) {
    // Create the system tag if it doesn't exist
    const [newTag] = await db.insert(tags).values({
      name: reason.replace(/_/g, " ").toLowerCase(),
      slug: tagSlug,
      color: "#EF4444", // Red for suppression
      description: `Suppression: ${reason}`,
      isSystem: true,
      isActive: true,
    }).returning();
    existingTag = newTag;
  }

  // Check if tag already applied
  const [existingLeadTag] = await db
    .select()
    .from(leadTags)
    .where(and(eq(leadTags.leadId, leadId), eq(leadTags.tagId, existingTag.id)))
    .limit(1);

  if (!existingLeadTag) {
    // Apply suppression tag to lead
    await db.insert(leadTags).values({
      leadId,
      tagId: existingTag.id,
      isAutoTag: true,
      appliedBy: "LUCI",
    });
  }

  // Update lead status to suppressed
  await db
    .update(leads)
    .set({
      status: "suppressed",
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, leadId), eq(leads.teamId, teamId)));
}

/**
 * Check if it's within TCPA calling hours for a given timezone
 */
export function isWithinTCPAHours(timezone: string = "America/New_York"): boolean {
  const now = new Date();
  const localHour = parseInt(
    now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: timezone })
  );

  return localHour >= TCPA_CALLING_HOURS.START_HOUR &&
         localHour < TCPA_CALLING_HOURS.END_HOUR;
}

/**
 * Quick check if a lead can be contacted
 * Use this before sending any message
 */
export async function canContact(
  leadId: string,
  teamId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Check for suppression tags
  const suppressionTags = await getLeadSuppressionTags(leadId);

  if (suppressionTags.includes(SUPPRESSION_TAG_SLUGS.OPTED_OUT)) {
    return { allowed: false, reason: "Lead opted out" };
  }

  if (suppressionTags.includes(SUPPRESSION_TAG_SLUGS.DNC)) {
    return { allowed: false, reason: "Do not contact" };
  }

  if (suppressionTags.includes(SUPPRESSION_TAG_SLUGS.LITIGATOR)) {
    return { allowed: false, reason: "Known litigator" };
  }

  if (suppressionTags.includes(SUPPRESSION_TAG_SLUGS.COMPLIANCE_HOLD)) {
    return { allowed: false, reason: "Compliance hold" };
  }

  return { allowed: true };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateContactability(
  lead: any,
  hasWrongNumber: boolean
): LuciContactability {
  let score = 50; // Base score

  // Get enrichment data from metadata
  const meta = (lead.metadata || {}) as Record<string, unknown>;

  // Line type assessment (from enrichment metadata)
  const lineType = (meta.lineType as string) || "unknown";
  if (lineType === "mobile") {
    score += LUCI_THRESHOLDS.MOBILE_BONUS;
  } else if (lineType === "landline") {
    score += LUCI_THRESHOLDS.LANDLINE_PENALTY;
  } else if (lineType === "voip") {
    score += LUCI_THRESHOLDS.VOIP_PENALTY;
  }

  // Verification status (from enrichment metadata)
  if (meta.verifiedAt) {
    score += 15;
  }

  // Wrong number history
  if (hasWrongNumber) {
    score -= 50;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    line_type: lineType as "mobile" | "landline" | "voip" | "unknown",
    carrier: (meta.carrier as string) || null,
    is_valid: score > 20 && !hasWrongNumber,
    dnc: Boolean(meta.dnc),
    litigator: Boolean(meta.litigator),
    score,
  };
}

// =============================================================================
// LUCI CLASS - Data Pipeline Orchestration
// =============================================================================

/**
 * LUCI Class - Handles data ingestion and block processing for pipelines
 * Used by DataToSMSPipeline for structured batch processing
 */
export class LUCI {
  private manifests: Map<string, CampaignManifest> = new Map();
  private blockQueues: Map<string, ExecutionBlock[]> = new Map();

  /**
   * Ingest raw records and structure into execution blocks
   */
  ingest(
    records: RawIngestRecord[],
    options: { name: string; sourceFile: string; blockSize?: number }
  ): CampaignManifest {
    const blockSize = options.blockSize || 2000;
    const manifestId = `manifest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Split into blocks
    const blocks: ExecutionBlock[] = [];
    for (let i = 0; i < records.length; i += blockSize) {
      const blockRecords = records.slice(i, i + blockSize);
      blocks.push({
        id: `block_${manifestId}_${blocks.length}`,
        index: blocks.length,
        records: blockRecords,
        status: "pending",
      });
    }

    // Calculate estimated costs
    const estimatedCost = {
      tracerfy: records.length * 0.02,
      trestle: records.length * 0.09, // avg 3 phones @ $0.03
      total: records.length * 0.11,
    };

    const manifest: CampaignManifest = {
      id: manifestId,
      name: options.name,
      sourceFile: options.sourceFile,
      totalRecords: records.length,
      blocks,
      estimatedCost,
      createdAt: new Date(),
      status: "building",
    };

    this.manifests.set(manifestId, manifest);
    this.blockQueues.set(manifestId, [...blocks]);

    return manifest;
  }

  /**
   * Get next pending block for processing
   */
  getNextBlock(manifestId: string): ExecutionBlock | null {
    const queue = this.blockQueues.get(manifestId);
    if (!queue || queue.length === 0) return null;

    const block = queue.find(b => b.status === "pending");
    if (block) {
      block.status = "processing";
      block.startedAt = new Date();
    }
    return block || null;
  }

  /**
   * Mark block as completed
   */
  completeBlock(manifestId: string, blockId: string): void {
    const queue = this.blockQueues.get(manifestId);
    if (!queue) return;

    const block = queue.find(b => b.id === blockId);
    if (block) {
      block.status = "completed";
      block.completedAt = new Date();
    }

    // Check if all blocks completed
    const manifest = this.manifests.get(manifestId);
    if (manifest && queue.every(b => b.status === "completed")) {
      manifest.status = "completed";
    }
  }

  /**
   * Get manifest by ID
   */
  getManifest(manifestId: string): CampaignManifest | null {
    return this.manifests.get(manifestId) || null;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const luciService = {
  approve,
  recheck,
  suppress,
  canContact,
  isWithinTCPAHours,
};

export default luciService;
