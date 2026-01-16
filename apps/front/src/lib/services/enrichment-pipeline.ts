/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHMENT PIPELINE - Lead Data Enhancement
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Pipeline Order:
 * 1. USBizData CSV Import (raw data)
 * 2. Perplexity Verification (is business active? verify owner)
 * 3. Tracerfy Skip Trace ($0.02/record - phones with line type, emails)
 * 4. Ready for THE LOOP
 *
 * Tracerfy returns:
 * - primary_phone + primary_phone_type
 * - mobile_1 through mobile_5 (labeled as Mobile)
 * - landline_1 through landline_3 (labeled as Landline)
 * - email_1 through email_5
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
  verifyBusiness,
  researchOwner,
  type BusinessVerification,
  type OwnerResearch,
} from "@/lib/ai/perplexity-scanner";

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

  // Pipeline metadata
  pipelineStage: "import" | "verify" | "enrich" | "ready" | "in_loop";
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
};

/**
 * Estimate enrichment cost for a batch
 */
export function estimateEnrichmentCost(
  leadCount: number,
  config: Partial<PipelineConfig> = {},
): {
  tracerfyCost: number;
  perplexityCost: number;
  totalCost: number;
  costPerLead: number;
} {
  const pipelineConfig = { ...DEFAULT_PIPELINE_CONFIG, ...config };

  const tracerfyCost = pipelineConfig.skipTrace
    ? leadCount * (pipelineConfig.skipTraceType === "enhanced" ? 0.15 : 0.02)
    : 0;

  const perplexityCost = 0; // Free with API key

  const totalCost = tracerfyCost + perplexityCost;

  return {
    tracerfyCost,
    perplexityCost,
    totalCost,
    costPerLead: leadCount > 0 ? totalCost / leadCount : 0,
  };
}

console.log("[Enrichment Pipeline] Loaded - Ready to enrich leads");
