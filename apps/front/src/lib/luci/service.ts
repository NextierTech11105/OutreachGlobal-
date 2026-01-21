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
import { leads, leadSignals } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import type {
  LuciApprovedLead,
  LuciApprovalResult,
  LuciRecheckRequest,
  LuciRecheckResult,
  LuciStatus,
  LuciContactability,
  SuppressionReason,
} from "./types";
import { LUCI_THRESHOLDS, PERMANENT_SUPPRESSIONS, TCPA_CALLING_HOURS } from "./constants";

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

    // 2. Check for suppression signals (append-only, never deleted)
    const suppressionSignals = await db
      .select()
      .from(leadSignals)
      .where(
        and(
          eq(leadSignals.leadId, leadId),
          eq(leadSignals.teamId, teamId)
        )
      );

    const hasOptOut = suppressionSignals.some(s => s.signalType === "OPTED_OUT");
    const hasDNC = suppressionSignals.some(s => s.signalType === "DO_NOT_CONTACT");
    const hasWrongNumber = suppressionSignals.some(s => s.signalType === "WRONG_NUMBER");

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

    // 4. Build approved lead
    const approvedLead: LuciApprovedLead = {
      lead_id: leadId,
      team_id: teamId,
      tenant_slug: lead.teamId, // TODO: Map to tenant slug
      source: lead.source || "import",

      business: {
        name: lead.businessName || "",
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        zip: lead.zip || "",
        sic_code: lead.sicCode || null,
        industry: lead.industry || null,
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
      traced_at: lead.enrichedAt || null,
      verified_at: lead.verifiedAt || null,
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
  // Map reason to signal type
  const signalType = reason === "OPT_OUT" ? "OPTED_OUT" :
                     reason === "DNC" ? "DO_NOT_CONTACT" :
                     reason === "WRONG_NUMBER" ? "WRONG_NUMBER" :
                     "DO_NOT_CONTACT";

  // Insert suppression signal (append-only)
  await db.insert(leadSignals).values({
    teamId,
    leadId,
    signalType,
    signalValue: reason,
    confidence: 1.0,
    source: "LUCI",
    createdAt: new Date(),
  });

  // Update lead state to suppressed
  await db
    .update(leads)
    .set({
      state: "suppressed",
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
  // Check for suppression signals
  const suppressionSignals = await db
    .select()
    .from(leadSignals)
    .where(
      and(
        eq(leadSignals.leadId, leadId),
        eq(leadSignals.teamId, teamId)
      )
    );

  const hasOptOut = suppressionSignals.some(s => s.signalType === "OPTED_OUT");
  const hasDNC = suppressionSignals.some(s => s.signalType === "DO_NOT_CONTACT");

  if (hasOptOut) {
    return { allowed: false, reason: "Lead opted out" };
  }

  if (hasDNC) {
    return { allowed: false, reason: "Do not contact" };
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

  // Line type assessment
  const lineType = lead.lineType || "unknown";
  if (lineType === "mobile") {
    score += LUCI_THRESHOLDS.MOBILE_BONUS;
  } else if (lineType === "landline") {
    score += LUCI_THRESHOLDS.LANDLINE_PENALTY;
  } else if (lineType === "voip") {
    score += LUCI_THRESHOLDS.VOIP_PENALTY;
  }

  // Verification status
  if (lead.verifiedAt) {
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
    carrier: lead.carrier || null,
    is_valid: score > 20 && !hasWrongNumber,
    dnc: lead.dnc || false,
    litigator: lead.litigator || false,
    score,
  };
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
