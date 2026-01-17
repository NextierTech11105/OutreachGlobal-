/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTACTABILITY ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Central orchestration service for lead contactability evaluation.
 * Combines Trestle Real Contact API with Tracerfy internal signals
 * to produce a unified ContactabilityProfile for routing decisions.
 *
 * FLOW:
 * 1. Receive lead data (name, phone, email, address, ip)
 * 2. Call Trestle Real Contact API with add-ons
 * 3. Fetch Tracerfy signals (DNC, carrier risk, spam reports)
 * 4. Build ContactabilityProfile with scores and risk tier
 * 5. Return profile for routing strategy consumption
 *
 * USAGE:
 * ```typescript
 * const profile = await evaluateLeadContactability({
 *   leadId: "lead_123",
 *   name: "John Doe",
 *   phone: "4259853735",
 *   email: "john@example.com",
 * });
 *
 * if (profile.riskTier === "BLOCK") {
 *   // Do not contact
 * }
 * ```
 */

import {
  getTrestleClient,
  type TrestleRealContactRequest,
  type TrestleRealContactResponse,
  type TrestleAddOn,
} from "../trestle";
import {
  buildContactabilityProfile,
  type ContactabilityProfile,
  type TracerfySignals,
  type RiskTier,
} from "../domain/contactability";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LeadContactabilityInput {
  /** Lead ID from NextTier */
  leadId: string;
  /** Full name (required for Trestle) */
  name: string;
  /** Phone number (required) */
  phone: string;
  /** Email address (optional) */
  email?: string;
  /** IP address for geo-validation (optional) */
  ipAddress?: string;
  /** Business name (optional) */
  businessName?: string;
  /** Address for address validation (optional) */
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  /** Override default add-ons */
  addOns?: TrestleAddOn[];
}

export interface ContactabilityResult {
  success: boolean;
  profile?: ContactabilityProfile;
  error?: string;
}

export interface BatchContactabilityResult {
  total: number;
  processed: number;
  profiles: ContactabilityProfile[];
  errors: Array<{ leadId: string; error: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACERFY SIGNALS FETCHER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch Tracerfy signals for a phone/email from internal event history
 *
 * TODO: Integrate with actual Tracerfy database/API
 * This is a placeholder that returns default "clean" signals
 */
async function fetchTracerfySignals(
  phone: string,
  email?: string
): Promise<TracerfySignals> {
  // TODO: Query Tracerfy database for:
  // - DNC list membership
  // - Carrier lookup results
  // - Spam report count
  // - Previous contact attempts and outcomes
  // - Right-party verification status

  // Placeholder: Return clean signals
  // In production, this would query your Tracerfy tables
  console.log(
    `[ContactabilityEngine] Fetching Tracerfy signals for phone=${phone}, email=${email || "none"}`
  );

  return {
    dnc: false,
    carrierRisk: "LOW",
    spamReports: 0,
    lastSuccessfulContactAt: null,
    outboundAttemptCount: 0,
    answerRate: undefined,
    rightPartyVerified: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EVALUATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Evaluate a lead's contactability by combining Trestle + Tracerfy
 *
 * @param input - Lead data including name, phone, email, address
 * @returns ContactabilityResult with profile or error
 */
export async function evaluateLeadContactability(
  input: LeadContactabilityInput
): Promise<ContactabilityResult> {
  try {
    console.log(
      `[ContactabilityEngine] Evaluating lead ${input.leadId}: ${input.phone}`
    );

    // Build Trestle request
    const trestleRequest: TrestleRealContactRequest = {
      name: input.name,
      phone: input.phone,
      email: input.email,
      businessName: input.businessName,
      ipAddress: input.ipAddress,
      addOns: input.addOns || [
        "litigator_checks",
        "email_checks_deliverability",
        "email_checks_age",
      ],
    };

    // Add address if provided
    if (input.address) {
      trestleRequest.address = {
        street_line_1: input.address.street,
        city: input.address.city,
        state_code: input.address.state,
        postal_code: input.address.zip,
        country_code: input.address.country || "US",
      };
    }

    // Call Trestle API
    const client = getTrestleClient();
    const trestleResponse = await client.realContact(trestleRequest);

    // Check for Trestle API error
    if (trestleResponse.error) {
      console.error(
        `[ContactabilityEngine] Trestle error for ${input.leadId}:`,
        trestleResponse.error
      );
      return {
        success: false,
        error: `Trestle API error: ${trestleResponse.error.message}`,
      };
    }

    // Fetch Tracerfy signals
    const tracerfySignals = await fetchTracerfySignals(input.phone, input.email);

    // Build unified profile
    const profile = buildContactabilityProfile(
      input.leadId,
      trestleResponse,
      tracerfySignals
    );

    console.log(
      `[ContactabilityEngine] Lead ${input.leadId} evaluated: ` +
        `score=${profile.overallContactabilityScore}, tier=${profile.riskTier}`
    );

    return {
      success: true,
      profile,
    };
  } catch (error) {
    console.error(
      `[ContactabilityEngine] Error evaluating lead ${input.leadId}:`,
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Evaluate multiple leads in batch with rate limiting
 *
 * @param inputs - Array of lead data
 * @param batchSize - Number of concurrent requests (default 5)
 * @param delayMs - Delay between batches (default 500ms)
 * @returns BatchContactabilityResult with all profiles and errors
 */
export async function evaluateBatchContactability(
  inputs: LeadContactabilityInput[],
  batchSize = 5,
  delayMs = 500
): Promise<BatchContactabilityResult> {
  const result: BatchContactabilityResult = {
    total: inputs.length,
    processed: 0,
    profiles: [],
    errors: [],
  };

  console.log(
    `[ContactabilityEngine] Starting batch evaluation of ${inputs.length} leads`
  );

  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((input) => evaluateLeadContactability(input))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const evalResult = batchResults[j];
      const input = batch[j];

      if (evalResult.success && evalResult.profile) {
        result.profiles.push(evalResult.profile);
      } else {
        result.errors.push({
          leadId: input.leadId,
          error: evalResult.error || "Unknown error",
        });
      }

      result.processed++;
    }

    // Delay between batches to avoid rate limiting
    if (i + batchSize < inputs.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(
    `[ContactabilityEngine] Batch complete: ${result.profiles.length} success, ${result.errors.length} errors`
  );

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick check if a lead should be blocked (litigator or DNC)
 * Useful for fast filtering before full evaluation
 */
export function isBlocked(profile: ContactabilityProfile): boolean {
  return profile.riskTier === "BLOCK";
}

/**
 * Quick check if a lead is safe for all outreach channels
 */
export function isSafe(profile: ContactabilityProfile): boolean {
  return profile.riskTier === "SAFE";
}

/**
 * Check if lead meets minimum contactability threshold
 */
export function meetsMinimumThreshold(
  profile: ContactabilityProfile,
  minScore = 50
): boolean {
  return (
    profile.overallContactabilityScore >= minScore &&
    profile.riskTier !== "BLOCK"
  );
}

/**
 * Get leads grouped by risk tier
 */
export function groupByRiskTier(
  profiles: ContactabilityProfile[]
): Record<RiskTier, ContactabilityProfile[]> {
  return {
    SAFE: profiles.filter((p) => p.riskTier === "SAFE"),
    ELEVATED: profiles.filter((p) => p.riskTier === "ELEVATED"),
    HIGH: profiles.filter((p) => p.riskTier === "HIGH"),
    BLOCK: profiles.filter((p) => p.riskTier === "BLOCK"),
  };
}

/**
 * Calculate batch statistics
 */
export function calculateBatchStats(profiles: ContactabilityProfile[]): {
  total: number;
  averageScore: number;
  tierBreakdown: Record<RiskTier, number>;
  contactableCount: number;
  blockRate: number;
} {
  const total = profiles.length;
  if (total === 0) {
    return {
      total: 0,
      averageScore: 0,
      tierBreakdown: { SAFE: 0, ELEVATED: 0, HIGH: 0, BLOCK: 0 },
      contactableCount: 0,
      blockRate: 0,
    };
  }

  const grouped = groupByRiskTier(profiles);
  const tierBreakdown = {
    SAFE: grouped.SAFE.length,
    ELEVATED: grouped.ELEVATED.length,
    HIGH: grouped.HIGH.length,
    BLOCK: grouped.BLOCK.length,
  };

  const totalScore = profiles.reduce(
    (sum, p) => sum + p.overallContactabilityScore,
    0
  );
  const averageScore = Math.round(totalScore / total);

  const contactableCount = tierBreakdown.SAFE + tierBreakdown.ELEVATED;
  const blockRate = Math.round((tierBreakdown.BLOCK / total) * 100);

  return {
    total,
    averageScore,
    tierBreakdown,
    contactableCount,
    blockRate,
  };
}

console.log("[ContactabilityEngine] Service loaded");
