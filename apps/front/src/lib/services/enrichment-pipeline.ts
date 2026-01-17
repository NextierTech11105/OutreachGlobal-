/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LEAD LAB - A NextTier Solution
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Enrichment Pipeline - Lead Data Enhancement & Contactability Scoring
 *
 * Pipeline Order:
 * 1. USBizData CSV Import (raw data)
 * 2. Perplexity Verification (is business active? verify owner)
 * 3. Tracerfy Skip Trace ($0.02/record) → DATA ENGINE (phones, emails)
 * 4. Trestle Real Contact ($0.03/record) → CONTACTABILITY ENGINE (grades, scores)
 * 5. ContactabilityProfile → Risk Tier + Routing Strategy
 * 6. Lead ID Assignment + Campaign Registration (ONLY if contactable)
 * 7. Ready for THE LOOP
 *
 * COST: $0.05/lead (Tracerfy $0.02 + Trestle $0.03)
 *
 * DATA ENGINE (Tracerfy) returns:
 * - primary_phone + primary_phone_type
 * - mobile_1 through mobile_5 (labeled as Mobile)
 * - landline_1 through landline_3 (labeled as Landline)
 * - email_1 through email_5
 *
 * CONTACTABILITY ENGINE (Trestle) returns:
 * - phone.is_valid, phone.activity_score (0-100), phone.line_type
 * - phone.name_match, phone.contact_grade (A-F)
 * - email.is_valid, email.contact_grade, email.is_deliverable
 * - litigator_checks.phone.is_litigator_risk (TCPA critical)
 *
 * RISK TIERS:
 * - SAFE: Green light for all outreach channels
 * - ELEVATED: Proceed with caution, may need manual review
 * - HIGH: Limit to low-touch channels (email nurture)
 * - BLOCK: Do not contact (litigator, DNC, severe risk)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  getTracerfyClient,
  extractPhones,
  extractEmails,
  type TracerfyNormalResult,
} from "@/lib/tracerfy";
import {
  getTrestleClient,
  isPhoneContactable,
  hasLitigatorRisk,
  calculateContactabilityScore,
  mapLineType,
  type TrestleAddOn,
} from "@/lib/trestle";
import {
  evaluateLeadContactability,
  type ContactabilityResult,
} from "@/lib/services/contactability-engine";
import {
  decideRouting,
  getRouteDescription,
  type RouteDecision,
} from "@/lib/services/routing-strategy";
import type {
  ContactabilityProfile,
  RiskTier,
} from "@/lib/domain/contactability";
import {
  verifyBusiness,
  researchOwner,
  type BusinessVerification,
  type OwnerResearch,
} from "@/lib/ai/perplexity-scanner";
import {
  TRESTLE_COST_PER_CONTACT,
  TRESTLE_GOOD_ACTIVITY_SCORE,
  TRESTLE_PASSING_GRADES,
  TRESTLE_DEFAULT_ADDONS,
} from "@/config/constants";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RawLead {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  company?: string;
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  source: string;
  [key: string]: unknown;
}

export interface EnrichedPhone {
  number: string;
  type: "Mobile" | "Landline" | "Unknown";
  isPrimary: boolean;
  source: "tracerfy" | "import" | "manual";
  verified: boolean;
}

export interface EnrichedLead extends RawLead {
  // Enrichment status
  enrichmentStatus: "pending" | "verified" | "enriched" | "failed";
  enrichedAt?: Date;

  // Business verification (Perplexity)
  businessVerification?: BusinessVerification;
  isBusinessActive?: boolean;

  // Owner verification (Perplexity)
  ownerVerification?: OwnerResearch;
  verifiedOwnerName?: string;

  // Phone enrichment (Tracerfy)
  phones: EnrichedPhone[];
  primaryPhone?: EnrichedPhone;
  mobileCount: number;
  landlineCount: number;

  // Email enrichment (Tracerfy)
  emails: string[];
  primaryEmail?: string;

  // Mailing address (Tracerfy)
  mailingAddress?: {
    address: string;
    city: string;
    state: string;
    zip?: string;
  };

  // Trestle validation (contactability scoring)
  trestleValidation?: {
    phoneActivityScore?: number; // 0-100 (70+ good, 30- bad)
    phoneContactGrade?: string; // A-F
    phoneLineType?: string; // Mobile, Landline, FixedVOIP, etc.
    phoneNameMatch?: boolean;
    phoneIsValid?: boolean;
    emailIsValid?: boolean;
    emailContactGrade?: string; // A-F
    emailNameMatch?: boolean;
    emailIsDeliverable?: boolean;
    emailAgeScore?: number;
    isLitigatorRisk?: boolean; // TCPA litigator flag - CRITICAL
    validatedAt?: Date;
  };

  // Overall contactability
  isContactable?: boolean;
  contactabilityScore?: number; // 0-100

  // Lead Lab Contactability Profile (full profile from ContactabilityEngine)
  contactabilityProfile?: ContactabilityProfile;
  riskTier?: RiskTier;

  // Routing decision (from RoutingStrategy)
  routingDecision?: RouteDecision;
  routingDescription?: string;

  // Pipeline metadata
  pipelineStage: "import" | "verify" | "enrich" | "validate" | "ready" | "in_loop";
  costToEnrich: number;
}

export interface EnrichmentResult {
  success: boolean;
  lead: EnrichedLead;
  cost: number;
  steps: Array<{
    step: string;
    status: "success" | "failed" | "skipped";
    duration: number;
    details?: string;
  }>;
}

export interface PipelineConfig {
  verifyBusiness: boolean;
  researchOwner: boolean;
  skipTrace: boolean;
  skipTraceType: "normal" | "enhanced";
  preferMobile: boolean;
  // Trestle Real Contact validation (Step 4)
  trestleValidation: boolean;
  trestleAddOns: TrestleAddOn[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  verifyBusiness: true,
  researchOwner: true,
  skipTrace: true,
  skipTraceType: "normal",
  preferMobile: true,
  // Trestle validation ON by default - critical for TCPA compliance
  trestleValidation: true,
  trestleAddOns: [...TRESTLE_DEFAULT_ADDONS] as TrestleAddOn[],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENRICHMENT PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run full enrichment pipeline on a lead
 */
export async function enrichLead(
  rawLead: RawLead,
  config: Partial<PipelineConfig> = {},
): Promise<EnrichmentResult> {
  const pipelineConfig = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  const steps: EnrichmentResult["steps"] = [];
  let totalCost = 0;

  // Initialize enriched lead
  const lead: EnrichedLead = {
    ...rawLead,
    enrichmentStatus: "pending",
    phones: [],
    mobileCount: 0,
    landlineCount: 0,
    emails: [],
    pipelineStage: "import",
    costToEnrich: 0,
  };

  // If we already have a phone from import, add it
  if (rawLead.phone) {
    lead.phones.push({
      number: rawLead.phone,
      type: "Unknown",
      isPrimary: true,
      source: "import",
      verified: false,
    });
  }

  // If we already have an email from import, add it
  if (rawLead.email) {
    lead.emails.push(rawLead.email);
    lead.primaryEmail = rawLead.email;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Business Verification (Perplexity)
  // ═══════════════════════════════════════════════════════════════════════════

  if (pipelineConfig.verifyBusiness && lead.company) {
    const startTime = Date.now();
    try {
      lead.pipelineStage = "verify";
      const verification = await verifyBusiness(
        lead.company,
        lead.address
          ? `${lead.address}, ${lead.city}, ${lead.state}`
          : undefined,
      );

      lead.businessVerification = verification;
      lead.isBusinessActive = verification.isActive;

      // If Perplexity found owner info, store it
      if (verification.owner?.name) {
        lead.verifiedOwnerName = verification.owner.name;
      }

      steps.push({
        step: "Business Verification",
        status: "success",
        duration: Date.now() - startTime,
        details: `${verification.isActive ? "Active" : "Inactive"} (${Math.round(verification.confidence * 100)}% confidence)`,
      });
    } catch (error) {
      steps.push({
        step: "Business Verification",
        status: "failed",
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : "Failed",
      });
    }
  } else {
    steps.push({
      step: "Business Verification",
      status: "skipped",
      duration: 0,
      details: "No company name or disabled",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Owner Research (Perplexity)
  // ═══════════════════════════════════════════════════════════════════════════

  if (pipelineConfig.researchOwner && lead.company) {
    const startTime = Date.now();
    try {
      const ownerResearch = await researchOwner(
        lead.company,
        lead.firstName && lead.lastName
          ? `${lead.firstName} ${lead.lastName}`
          : undefined,
      );

      lead.ownerVerification = ownerResearch;

      if (ownerResearch.found && ownerResearch.ownerName) {
        lead.verifiedOwnerName = ownerResearch.ownerName;
        // Update name if we found a better one
        const nameParts = ownerResearch.ownerName.split(" ");
        if (nameParts.length >= 2) {
          lead.firstName = nameParts[0];
          lead.lastName = nameParts.slice(1).join(" ");
        }
      }

      steps.push({
        step: "Owner Research",
        status: ownerResearch.found ? "success" : "failed",
        duration: Date.now() - startTime,
        details: ownerResearch.found
          ? `Found: ${ownerResearch.ownerName} (${ownerResearch.ownerTitle})`
          : "Owner not found",
      });
    } catch (error) {
      steps.push({
        step: "Owner Research",
        status: "failed",
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : "Failed",
      });
    }
  } else {
    steps.push({
      step: "Owner Research",
      status: "skipped",
      duration: 0,
      details: "No company name or disabled",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Skip Trace (Tracerfy) - $0.02/record
  // ═══════════════════════════════════════════════════════════════════════════

  if (
    pipelineConfig.skipTrace &&
    lead.address &&
    lead.firstName &&
    lead.lastName
  ) {
    const startTime = Date.now();
    try {
      lead.pipelineStage = "enrich";
      const client = getTracerfyClient();

      // Start trace job
      const traceResponse = await client.beginTrace(
        [
          {
            address: lead.address || "",
            city: lead.city || "",
            state: lead.state || "",
            zip: lead.zip,
            first_name: lead.firstName || "",
            last_name: lead.lastName || "",
            mail_address: lead.address || "",
            mail_city: lead.city || "",
            mail_state: lead.state || "",
          },
        ],
        pipelineConfig.skipTraceType,
      );

      // Wait for results (with timeout)
      const queue = await client.waitForQueue(
        traceResponse.queue_id,
        3000,
        60000,
      );

      if (queue.download_url) {
        // Get results
        const results = await client.getQueueResults(traceResponse.queue_id);

        if (results.length > 0) {
          const result = results[0] as TracerfyNormalResult;

          // Extract phones with type labels
          const phones = extractPhones(result);
          lead.phones = phones.map((p, idx) => ({
            number: p.number,
            type: p.type as EnrichedPhone["type"],
            isPrimary: idx === 0,
            source: "tracerfy" as const,
            verified: true,
          }));

          // Count by type
          lead.mobileCount = lead.phones.filter(
            (p) => p.type === "Mobile",
          ).length;
          lead.landlineCount = lead.phones.filter(
            (p) => p.type === "Landline",
          ).length;

          // Set primary phone (prefer mobile)
          if (pipelineConfig.preferMobile) {
            lead.primaryPhone =
              lead.phones.find((p) => p.type === "Mobile") || lead.phones[0];
          } else {
            lead.primaryPhone = lead.phones[0];
          }

          // Extract emails
          const emails = extractEmails(result);
          lead.emails = emails;
          lead.primaryEmail = emails[0];

          // Mailing address
          if (result.mail_address) {
            lead.mailingAddress = {
              address: result.mail_address,
              city: result.mail_city,
              state: result.mail_state,
            };
          }

          // Track cost
          const cost =
            pipelineConfig.skipTraceType === "enhanced" ? 0.15 : 0.02;
          totalCost += cost;
          lead.costToEnrich = cost;
        }
      }

      lead.enrichmentStatus = "enriched";
      lead.enrichedAt = new Date();

      steps.push({
        step: "Skip Trace (Tracerfy)",
        status: "success",
        duration: Date.now() - startTime,
        details: `Found ${lead.phones.length} phones (${lead.mobileCount} mobile, ${lead.landlineCount} landline), ${lead.emails.length} emails`,
      });
    } catch (error) {
      steps.push({
        step: "Skip Trace (Tracerfy)",
        status: "failed",
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : "Failed",
      });
    }
  } else {
    steps.push({
      step: "Skip Trace (Tracerfy)",
      status: "skipped",
      duration: 0,
      details:
        "Missing required fields (address, firstName, lastName) or disabled",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Trestle Real Contact Validation ($0.03/record)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // This is the CONTACTABILITY ENGINE - validates that phones are:
  // - Active (activity score 70+)
  // - Contactable (grade A, B, or C)
  // - NOT a TCPA litigator risk
  //
  // Only leads passing this gate get assigned Lead IDs and registered for campaigns.
  //

  if (pipelineConfig.trestleValidation && lead.phones.length > 0) {
    const startTime = Date.now();
    try {
      lead.pipelineStage = "validate";
      const trestleClient = getTrestleClient();

      // Get primary phone to validate (prefer mobile)
      const phoneToValidate = lead.primaryPhone || lead.phones[0];
      const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();

      // Call Trestle Real Contact API
      const validation = await trestleClient.realContact({
        name: fullName,
        phone: phoneToValidate.number,
        email: lead.primaryEmail,
        businessName: lead.company,
        address: lead.address
          ? {
              street_line_1: lead.address,
              city: lead.city,
              state_code: lead.state,
              postal_code: lead.zip,
              country_code: "US",
            }
          : undefined,
        addOns: pipelineConfig.trestleAddOns,
      });

      // Store validation results
      lead.trestleValidation = {
        phoneActivityScore: validation.phone.activityScore ?? undefined,
        phoneContactGrade: validation.phone.contactGrade ?? undefined,
        phoneLineType: validation.phone.lineType ?? undefined,
        phoneNameMatch: validation.phone.nameMatch ?? undefined,
        phoneIsValid: validation.phone.isValid ?? undefined,
        isLitigatorRisk:
          validation.addOns?.litigatorChecks?.phoneIsLitigatorRisk ?? undefined,
        validatedAt: new Date(),
      };

      // Add email validation if we have email
      if (validation.email) {
        lead.trestleValidation.emailIsValid =
          validation.email.isValid ?? undefined;
        lead.trestleValidation.emailContactGrade =
          validation.email.contactGrade ?? undefined;
        lead.trestleValidation.emailNameMatch =
          validation.email.nameMatch ?? undefined;
      }
      if (validation.addOns?.emailChecks) {
        lead.trestleValidation.emailIsDeliverable =
          validation.addOns.emailChecks.isDeliverable ?? undefined;
        lead.trestleValidation.emailAgeScore =
          validation.addOns.emailChecks.ageScore ?? undefined;
      }

      // Calculate overall contactability
      lead.contactabilityScore = calculateContactabilityScore(validation);
      lead.isContactable =
        isPhoneContactable(
          validation,
          TRESTLE_GOOD_ACTIVITY_SCORE,
          [...TRESTLE_PASSING_GRADES]
        ) && !hasLitigatorRisk(validation);

      // Update phone with verified line type from Trestle
      if (phoneToValidate && validation.phone.lineType) {
        phoneToValidate.type = mapLineType(validation.phone.lineType);
        phoneToValidate.verified = validation.phone.isValid ?? false;
      }

      // ─────────────────────────────────────────────────────────────────────────
      // LEAD LAB: Build full ContactabilityProfile and routing decision
      // ─────────────────────────────────────────────────────────────────────────
      const contactabilityResult = await evaluateLeadContactability({
        leadId: lead.id,
        name: fullName,
        phone: phoneToValidate.number,
        email: lead.primaryEmail,
        businessName: lead.company,
        address: lead.address
          ? {
              street: lead.address,
              city: lead.city,
              state: lead.state,
              zip: lead.zip,
            }
          : undefined,
        addOns: pipelineConfig.trestleAddOns,
      });

      if (contactabilityResult.success && contactabilityResult.profile) {
        lead.contactabilityProfile = contactabilityResult.profile;
        lead.riskTier = contactabilityResult.profile.riskTier;
        lead.contactabilityScore = contactabilityResult.profile.overallContactabilityScore;
        lead.isContactable = contactabilityResult.profile.riskTier !== "BLOCK";

        // Determine routing strategy
        lead.routingDecision = decideRouting(contactabilityResult.profile);
        lead.routingDescription = getRouteDescription(lead.routingDecision);
      }

      // Track cost
      totalCost += TRESTLE_COST_PER_CONTACT;

      // Build step details
      const litigatorWarning = lead.trestleValidation.isLitigatorRisk
        ? " LITIGATOR RISK!"
        : "";
      const riskTierInfo = lead.riskTier ? ` | Risk: ${lead.riskTier}` : "";
      steps.push({
        step: "Trestle Real Contact Validation",
        status: "success",
        duration: Date.now() - startTime,
        details: `Grade: ${validation.phone.contactGrade || "N/A"}, Score: ${validation.phone.activityScore ?? "N/A"}, Contactable: ${lead.isContactable ? "YES" : "NO"}${riskTierInfo}${litigatorWarning}`,
      });
    } catch (error) {
      steps.push({
        step: "Trestle Real Contact Validation",
        status: "failed",
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : "Failed",
      });
    }
  } else {
    steps.push({
      step: "Trestle Real Contact Validation",
      status: "skipped",
      duration: 0,
      details: pipelineConfig.trestleValidation
        ? "No phones to validate"
        : "Trestle validation disabled",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINALIZE
  // ═══════════════════════════════════════════════════════════════════════════

  // Determine final status
  if (lead.phones.length > 0 || lead.emails.length > 0) {
    lead.enrichmentStatus = "enriched";
    lead.pipelineStage = "ready";
  } else if (lead.businessVerification || lead.ownerVerification) {
    lead.enrichmentStatus = "verified";
  } else {
    lead.enrichmentStatus = "failed";
  }

  return {
    success: lead.enrichmentStatus !== "failed",
    lead,
    cost: totalCost,
    steps,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enrich a batch of leads
 */
export async function enrichBatch(
  leads: RawLead[],
  config: Partial<PipelineConfig> = {},
  onProgress?: (completed: number, total: number) => void,
): Promise<{
  results: EnrichmentResult[];
  summary: {
    total: number;
    enriched: number;
    verified: number;
    failed: number;
    totalCost: number;
    avgCostPerLead: number;
  };
}> {
  const results: EnrichmentResult[] = [];
  let totalCost = 0;

  for (let i = 0; i < leads.length; i++) {
    const result = await enrichLead(leads[i], config);
    results.push(result);
    totalCost += result.cost;

    if (onProgress) {
      onProgress(i + 1, leads.length);
    }

    // Rate limit - 1 second between leads for Perplexity
    if (config.verifyBusiness || config.researchOwner) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const enriched = results.filter(
    (r) => r.lead.enrichmentStatus === "enriched",
  ).length;
  const verified = results.filter(
    (r) => r.lead.enrichmentStatus === "verified",
  ).length;
  const failed = results.filter(
    (r) => r.lead.enrichmentStatus === "failed",
  ).length;

  return {
    results,
    summary: {
      total: leads.length,
      enriched,
      verified,
      failed,
      totalCost,
      avgCostPerLead: leads.length > 0 ? totalCost / leads.length : 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK PHONE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick validation of phone type using format heuristics
 * (For when you just need basic validation without skip trace)
 */
export function quickValidatePhone(phone: string): {
  isValid: boolean;
  formatted: string;
  likelyType: "Mobile" | "Landline" | "Unknown";
} {
  const cleaned = phone.replace(/\D/g, "");

  // Invalid if too short or too long
  if (cleaned.length < 10 || cleaned.length > 11) {
    return { isValid: false, formatted: phone, likelyType: "Unknown" };
  }

  // Format as +1XXXXXXXXXX
  const formatted = cleaned.length === 10 ? `+1${cleaned}` : `+${cleaned}`;

  // Mobile heuristic: area codes often associated with mobile
  // This is imperfect - Tracerfy skip trace is the real source of truth
  const areaCode = cleaned.slice(
    cleaned.length === 11 ? 1 : 0,
    cleaned.length === 11 ? 4 : 3,
  );

  // Can't reliably determine mobile vs landline from number alone
  // Return Unknown - use Tracerfy for actual line type
  return {
    isValid: true,
    formatted,
    likelyType: "Unknown",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE COST CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

export const ENRICHMENT_COSTS = {
  perplexityVerify: 0, // Free (API key based)
  perplexityResearch: 0, // Free (API key based)
  tracerfyNormal: 0.02, // $0.02/record
  tracerfyEnhanced: 0.15, // $0.15/record
  trestleRealContact: 0.03, // $0.03/record
};

/**
 * Estimate enrichment cost for a batch
 */
export function estimateEnrichmentCost(
  leadCount: number,
  config: Partial<PipelineConfig> = {},
): {
  tracerfyCost: number;
  trestleCost: number;
  perplexityCost: number;
  totalCost: number;
  costPerLead: number;
} {
  const pipelineConfig = { ...DEFAULT_PIPELINE_CONFIG, ...config };

  const tracerfyCost = pipelineConfig.skipTrace
    ? leadCount * (pipelineConfig.skipTraceType === "enhanced" ? 0.15 : 0.02)
    : 0;

  const trestleCost = pipelineConfig.trestleValidation
    ? leadCount * ENRICHMENT_COSTS.trestleRealContact
    : 0;

  const perplexityCost = 0; // Free with API key

  const totalCost = tracerfyCost + trestleCost + perplexityCost;

  return {
    tracerfyCost,
    trestleCost,
    perplexityCost,
    totalCost,
    costPerLead: leadCount > 0 ? totalCost / leadCount : 0,
  };
}

console.log("[Enrichment Pipeline] Loaded - Ready to enrich leads");
