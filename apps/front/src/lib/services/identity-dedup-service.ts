/**
 * Identity Deduplication Service
 *
 * Prevents duplicate persona creation during enrichment.
 * Checks for existing records before creating new ones,
 * and merges data when matches are found.
 *
 * Integrates with:
 * - Skip Trace enrichment (RealEstateAPI)
 * - Apollo.io enrichment
 * - Manual lead creation
 */

import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, or, like, sql } from "drizzle-orm";
import {
  IdentityRecord,
  IdentityMatchResult,
  IdentityMergeConfig,
  DEFAULT_MERGE_CONFIG,
  matchIdentities,
  findMatches,
} from "@nextier/common";

// Simplified lead record for matching
interface LeadForMatching {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

// Result of deduplication check
export interface DedupCheckResult {
  isDuplicate: boolean;
  existingLeadId: string | null;
  matchScore: number;
  confidence: "high" | "medium" | "low" | "none";
  matchDetails: IdentityMatchResult | null;
  recommendation: "merge" | "create_new" | "review";
}

// Result of merge operation
export interface MergeResult {
  success: boolean;
  primaryLeadId: string;
  mergedFromIds: string[];
  mergedFields: string[];
  error?: string;
}

/**
 * Convert a lead record to an IdentityRecord for matching
 */
function leadToIdentityRecord(lead: LeadForMatching): IdentityRecord {
  const phones = lead.phone
    ? [
        {
          number: lead.phone,
          type: "unknown" as const,
          isPrimary: true,
          source: "lead",
        },
      ]
    : [];

  const emails = lead.email
    ? [
        {
          address: lead.email,
          type: "unknown" as const,
          isPrimary: true,
          source: "lead",
        },
      ]
    : [];

  const addresses =
    lead.address && lead.city && lead.state
      ? [
          {
            street: lead.address,
            city: lead.city,
            state: lead.state,
            zip: lead.zip || "",
            type: "unknown" as const,
            isCurrent: true,
            source: "lead",
          },
        ]
      : [];

  return {
    id: lead.id,
    sourceType: "business",
    sourceId: lead.id,
    firstName: lead.firstName || "",
    lastName: lead.lastName || "",
    phones,
    emails,
    addresses,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Find potential duplicates for a new record
 */
export async function checkForDuplicates(
  newRecord: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  },
  teamId?: string,
  config: IdentityMergeConfig = DEFAULT_MERGE_CONFIG,
): Promise<DedupCheckResult> {
  // Quick early check - if no identifying info, can't match
  if (!newRecord.phone && !newRecord.email && !newRecord.lastName) {
    return {
      isDuplicate: false,
      existingLeadId: null,
      matchScore: 0,
      confidence: "none",
      matchDetails: null,
      recommendation: "create_new",
    };
  }

  // Build search conditions for candidate leads
  const conditions: any[] = [];

  if (newRecord.phone) {
    const normalizedPhone = newRecord.phone.replace(/\D/g, "").slice(-10);
    conditions.push(like(leads.phone, `%${normalizedPhone}%`));
  }

  if (newRecord.email) {
    conditions.push(eq(leads.email, newRecord.email.toLowerCase()));
  }

  if (newRecord.lastName) {
    conditions.push(
      sql`LOWER(${leads.lastName}) = LOWER(${newRecord.lastName})`,
    );
  }

  if (conditions.length === 0) {
    return {
      isDuplicate: false,
      existingLeadId: null,
      matchScore: 0,
      confidence: "none",
      matchDetails: null,
      recommendation: "create_new",
    };
  }

  // Fetch candidate leads
  let candidates: LeadForMatching[];
  try {
    const query = db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        phone: leads.phone,
        email: leads.email,
        address: leads.address,
        city: leads.city,
        state: leads.state,
        zip: leads.zip,
      })
      .from(leads)
      .where(or(...conditions))
      .limit(50);

    candidates = await query;
  } catch (error) {
    console.error("[IdentityDedup] Failed to query candidates:", error);
    return {
      isDuplicate: false,
      existingLeadId: null,
      matchScore: 0,
      confidence: "none",
      matchDetails: null,
      recommendation: "create_new",
    };
  }

  if (candidates.length === 0) {
    return {
      isDuplicate: false,
      existingLeadId: null,
      matchScore: 0,
      confidence: "none",
      matchDetails: null,
      recommendation: "create_new",
    };
  }

  // Convert new record to IdentityRecord
  const newIdentity: IdentityRecord = {
    id: "new",
    sourceType: "business",
    sourceId: "new",
    firstName: newRecord.firstName || "",
    lastName: newRecord.lastName || "",
    phones: newRecord.phone
      ? [
          {
            number: newRecord.phone,
            type: "unknown",
            isPrimary: true,
            source: "new",
          },
        ]
      : [],
    emails: newRecord.email
      ? [
          {
            address: newRecord.email,
            type: "unknown",
            isPrimary: true,
            source: "new",
          },
        ]
      : [],
    addresses:
      newRecord.address && newRecord.city && newRecord.state
        ? [
            {
              street: newRecord.address,
              city: newRecord.city,
              state: newRecord.state,
              zip: newRecord.zip || "",
              type: "unknown",
              isCurrent: true,
              source: "new",
            },
          ]
        : [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Convert candidates to IdentityRecords
  const candidateIdentities = candidates.map(leadToIdentityRecord);

  // Find matches
  const matches = findMatches(newIdentity, candidateIdentities, config);

  if (matches.length === 0) {
    return {
      isDuplicate: false,
      existingLeadId: null,
      matchScore: 0,
      confidence: "none",
      matchDetails: null,
      recommendation: "create_new",
    };
  }

  // Get best match
  const bestMatch = matches[0];

  // Determine recommendation
  let recommendation: "merge" | "create_new" | "review";
  if (bestMatch.overallScore >= config.autoMergeThreshold) {
    recommendation = "merge";
  } else if (bestMatch.overallScore >= config.reviewThreshold) {
    recommendation = "review";
  } else {
    recommendation = "create_new";
  }

  return {
    isDuplicate: bestMatch.shouldMerge,
    existingLeadId: bestMatch.targetId,
    matchScore: bestMatch.overallScore,
    confidence: bestMatch.confidence,
    matchDetails: bestMatch,
    recommendation,
  };
}

/**
 * Merge enrichment data into an existing lead
 */
export async function mergeEnrichmentData(
  existingLeadId: string,
  enrichmentData: {
    phone?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    customFields?: Record<string, unknown>;
  },
  source: "skip_trace" | "apollo" | "manual",
): Promise<MergeResult> {
  try {
    // Get existing lead
    const existingLead = await db.query.leads.findFirst({
      where: eq(leads.id, existingLeadId),
    });

    if (!existingLead) {
      return {
        success: false,
        primaryLeadId: existingLeadId,
        mergedFromIds: [],
        mergedFields: [],
        error: "Existing lead not found",
      };
    }

    // Build update data - only fill in missing fields
    const updateData: Record<string, unknown> = {};
    const mergedFields: string[] = [];

    // Phone - prefer mobile, or fill if missing
    if (enrichmentData.phone && !existingLead.phone) {
      updateData.phone = enrichmentData.phone;
      mergedFields.push("phone");
    }

    // Email - fill if missing
    if (enrichmentData.email && !existingLead.email) {
      updateData.email = enrichmentData.email;
      mergedFields.push("email");
    }

    // Address - fill if missing
    if (enrichmentData.address && !existingLead.address) {
      updateData.address = enrichmentData.address;
      updateData.city = enrichmentData.city;
      updateData.state = enrichmentData.state;
      updateData.zip = enrichmentData.zip;
      mergedFields.push("address");
    }

    // Custom fields - merge with existing
    if (enrichmentData.customFields) {
      const existingCustom =
        (existingLead.customFields as Record<string, unknown>) || {};
      updateData.customFields = {
        ...existingCustom,
        ...enrichmentData.customFields,
        [`${source}EnrichedAt`]: new Date().toISOString(),
        enrichmentHistory: [
          ...((existingCustom.enrichmentHistory as unknown[]) || []),
          { source, timestamp: new Date().toISOString() },
        ],
      };
      mergedFields.push("customFields");
    }

    // Only update if there's something to merge
    if (Object.keys(updateData).length === 0) {
      return {
        success: true,
        primaryLeadId: existingLeadId,
        mergedFromIds: [],
        mergedFields: [],
      };
    }

    // Update the lead
    updateData.updatedAt = new Date();
    await db.update(leads).set(updateData).where(eq(leads.id, existingLeadId));

    console.log(
      `[IdentityDedup] Merged ${source} data into lead ${existingLeadId}: ${mergedFields.join(", ")}`,
    );

    return {
      success: true,
      primaryLeadId: existingLeadId,
      mergedFromIds: [],
      mergedFields,
    };
  } catch (error) {
    console.error("[IdentityDedup] Merge failed:", error);
    return {
      success: false,
      primaryLeadId: existingLeadId,
      mergedFromIds: [],
      mergedFields: [],
      error: error instanceof Error ? error.message : "Merge failed",
    };
  }
}

/**
 * Check for duplicate and optionally merge before creating
 * Returns existing lead ID if duplicate, null if should create new
 */
export async function dedupBeforeCreate(
  newRecord: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    customFields?: Record<string, unknown>;
  },
  source: "skip_trace" | "apollo" | "manual" = "manual",
  teamId?: string,
): Promise<{
  shouldCreate: boolean;
  existingLeadId: string | null;
  merged: boolean;
  dedupResult: DedupCheckResult;
}> {
  // Check for duplicates
  const dedupResult = await checkForDuplicates(newRecord, teamId);

  if (!dedupResult.isDuplicate) {
    return {
      shouldCreate: true,
      existingLeadId: null,
      merged: false,
      dedupResult,
    };
  }

  // Auto-merge if high confidence
  if (dedupResult.recommendation === "merge" && dedupResult.existingLeadId) {
    const mergeResult = await mergeEnrichmentData(
      dedupResult.existingLeadId,
      newRecord,
      source,
    );

    return {
      shouldCreate: false,
      existingLeadId: dedupResult.existingLeadId,
      merged: mergeResult.success,
      dedupResult,
    };
  }

  // For review cases, don't create but also don't merge
  if (dedupResult.recommendation === "review") {
    return {
      shouldCreate: false,
      existingLeadId: dedupResult.existingLeadId,
      merged: false,
      dedupResult,
    };
  }

  // Low confidence - create new
  return {
    shouldCreate: true,
    existingLeadId: null,
    merged: false,
    dedupResult,
  };
}

/**
 * Get deduplication stats
 */
export async function getDedupStats(): Promise<{
  totalLeads: number;
  potentialDuplicates: number;
  lastChecked: string;
}> {
  try {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads);

    return {
      totalLeads: Number(countResult[0]?.count || 0),
      potentialDuplicates: 0, // Would need a background job to calculate
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      totalLeads: 0,
      potentialDuplicates: 0,
      lastChecked: new Date().toISOString(),
    };
  }
}
