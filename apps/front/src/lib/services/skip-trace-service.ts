/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIFIED SKIP TRACE SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Orchestrates the skip trace pipeline:
 *   RealEstateAPI (property data) → Tracerfy (phone/email enrichment) → SignalHouse (SMS)
 *
 * PROVIDER COSTS:
 * - Tracerfy: $0.02/lead (1 credit) - DEFAULT (phones + emails only)
 * - RealEstateAPI: $0.10-0.25/lead - FALLBACK (full skip trace with relatives, etc.)
 *
 * This service uses Tracerfy as the primary provider for cost efficiency.
 */

import {
  TracerfyClient,
  TracerfyNormalResult,
  TraceJobInput,
  extractPhones,
  extractEmails,
} from "@/lib/tracerfy";
import { realEstateApi } from "@/lib/services/real-estate-api";
import {
  TRACERFY_COST_PER_LEAD,
  DAILY_SKIP_TRACE_LIMIT,
  BATCH_SIZE,
} from "@/config/constants";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SkipTraceProvider = "tracerfy" | "realestateapi";

export interface SkipTraceInput {
  propertyId?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface SkipTraceResult {
  propertyId?: string;
  ownerName: string;
  firstName?: string;
  lastName?: string;
  // Primary mobile for SMS campaigns
  primaryMobile?: string;
  // All phones found
  phones: Array<{ number: string; type: string }>;
  // Emails
  emails: string[];
  primaryEmail?: string;
  // Original property address
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  // Status
  success: boolean;
  error?: string;
  provider: SkipTraceProvider;
  cost: number;
}

export interface BatchSkipTraceResult {
  results: SkipTraceResult[];
  stats: {
    total: number;
    successful: number;
    withMobile: number;
    withEmail: number;
    errors: number;
    totalCost: number;
  };
  provider: SkipTraceProvider;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY FILTER - Skip LLCs, Trusts, Corporations
// ═══════════════════════════════════════════════════════════════════════════════

const ENTITY_PATTERNS = [
  /\bllc\b/i,
  /\bl\.l\.c\b/i,
  /\binc\b/i,
  /\bincorporated\b/i,
  /\bcorp\b/i,
  /\bcorporation\b/i,
  /\bcompany\b/i,
  /\b& co\b/i,
  /\blp\b/i,
  /\bllp\b/i,
  /\blimited partnership\b/i,
  /\bltd\b/i,
  /\blimited\b/i,
  /\btrust\b/i,
  /\btrustee\b/i,
  /\brevocable\b/i,
  /\birrevocable\b/i,
  /\bestate\b/i,
  /\bdeceased\b/i,
  /\bbank\b/i,
  /\bcredit union\b/i,
  /\bhoa\b/i,
  /\bhomeowners\b/i,
  /\bassociation\b/i,
];

function isEntityOwner(name: string): boolean {
  if (!name) return false;
  return ENTITY_PATTERNS.some((pattern) => pattern.test(name));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY USAGE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

const dailyUsage = { date: "", count: 0 };

function getUsage(): { count: number; remaining: number; date: string } {
  const today = new Date().toISOString().split("T")[0];
  if (dailyUsage.date !== today) {
    dailyUsage.date = today;
    dailyUsage.count = 0;
  }
  return {
    date: dailyUsage.date,
    count: dailyUsage.count,
    remaining: DAILY_SKIP_TRACE_LIMIT - dailyUsage.count,
  };
}

function incrementUsage(amount: number): boolean {
  const usage = getUsage();
  if (usage.remaining < amount) return false;
  dailyUsage.count += amount;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKIP TRACE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class SkipTraceService {
  private tracerfy: TracerfyClient;

  constructor() {
    this.tracerfy = new TracerfyClient();
  }

  /**
   * Get property owner info from RealEstateAPI
   */
  async getPropertyOwner(propertyId: string): Promise<{
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    isEntity: boolean;
    mailAddress?: string;
    mailCity?: string;
    mailState?: string;
    mailZip?: string;
  } | null> {
    try {
      const detail = await realEstateApi.getPropertyDetail(propertyId);
      const data = detail.data;

      if (!data) return null;

      const firstName = data.owner1FirstName || "";
      const lastName = data.owner1LastName || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ");

      // Check if entity
      if (isEntityOwner(fullName) || data.corporateOwned) {
        return {
          firstName,
          lastName,
          address: data.address?.address || "",
          city: data.address?.city || "",
          state: data.address?.state || "",
          zip: data.address?.zip || "",
          isEntity: true,
        };
      }

      return {
        firstName,
        lastName,
        address: data.address?.address || "",
        city: data.address?.city || "",
        state: data.address?.state || "",
        zip: data.address?.zip || "",
        isEntity: false,
        mailAddress: data.mailAddress?.address,
        mailCity: data.mailAddress?.city,
        mailState: data.mailAddress?.state,
        mailZip: data.mailAddress?.zip,
      };
    } catch (err) {
      console.error(`[SkipTraceService] Failed to get property ${propertyId}:`, err);
      return null;
    }
  }

  /**
   * Skip trace a single person using Tracerfy
   */
  async skipTraceSingle(input: SkipTraceInput): Promise<SkipTraceResult> {
    // If property ID provided, get owner info first
    let traceData = {
      firstName: input.firstName || "",
      lastName: input.lastName || "",
      address: input.address || "",
      city: input.city || "",
      state: input.state || "",
      zip: input.zip || "",
      mailAddress: input.address || "",
      mailCity: input.city || "",
      mailState: input.state || "",
    };

    if (input.propertyId) {
      const owner = await this.getPropertyOwner(input.propertyId);

      if (!owner) {
        return {
          propertyId: input.propertyId,
          ownerName: "",
          phones: [],
          emails: [],
          success: false,
          error: "Property not found",
          provider: "tracerfy",
          cost: 0,
        };
      }

      if (owner.isEntity) {
        return {
          propertyId: input.propertyId,
          ownerName: [owner.firstName, owner.lastName].filter(Boolean).join(" "),
          phones: [],
          emails: [],
          success: false,
          error: "Entity owner (LLC/Trust/Corp) - cannot skip trace",
          provider: "tracerfy",
          cost: 0,
        };
      }

      traceData = {
        firstName: input.firstName || owner.firstName,
        lastName: input.lastName || owner.lastName,
        address: input.address || owner.address,
        city: input.city || owner.city,
        state: input.state || owner.state,
        zip: input.zip || owner.zip,
        mailAddress: owner.mailAddress || owner.address,
        mailCity: owner.mailCity || owner.city,
        mailState: owner.mailState || owner.state,
      };
    }

    // Validate we have enough info
    if (!traceData.firstName && !traceData.lastName) {
      return {
        propertyId: input.propertyId,
        ownerName: "",
        phones: [],
        emails: [],
        success: false,
        error: "Missing owner name",
        provider: "tracerfy",
        cost: 0,
      };
    }

    if (!traceData.address || !traceData.city || !traceData.state) {
      return {
        propertyId: input.propertyId,
        ownerName: [traceData.firstName, traceData.lastName].filter(Boolean).join(" "),
        phones: [],
        emails: [],
        success: false,
        error: "Missing address info",
        provider: "tracerfy",
        cost: 0,
      };
    }

    try {
      // Use Tracerfy for skip trace
      const traceInput: TraceJobInput = {
        address: traceData.address,
        city: traceData.city,
        state: traceData.state,
        zip: traceData.zip,
        first_name: traceData.firstName,
        last_name: traceData.lastName,
        mail_address: traceData.mailAddress,
        mail_city: traceData.mailCity,
        mail_state: traceData.mailState,
      };

      // For single traces, we use sync polling
      const job = await this.tracerfy.beginTrace([traceInput], "normal");
      const queue = await this.tracerfy.waitForQueue(job.queue_id, 2000, 60000);

      if (!queue.download_url) {
        throw new Error("No results available");
      }

      const results = (await this.tracerfy.getQueueResults(
        queue.id
      )) as TracerfyNormalResult[];

      if (results.length === 0) {
        return {
          propertyId: input.propertyId,
          ownerName: [traceData.firstName, traceData.lastName].filter(Boolean).join(" "),
          phones: [],
          emails: [],
          success: false,
          error: "No match found",
          provider: "tracerfy",
          cost: TRACERFY_COST_PER_LEAD,
        };
      }

      const result = results[0];
      const phones = extractPhones(result);
      const emails = extractEmails(result);
      const primaryMobile = phones.find((p) => p.type === "Mobile")?.number;

      incrementUsage(1);

      return {
        propertyId: input.propertyId,
        ownerName: [result.first_name || traceData.firstName, result.last_name || traceData.lastName]
          .filter(Boolean)
          .join(" "),
        firstName: result.first_name || traceData.firstName,
        lastName: result.last_name || traceData.lastName,
        primaryMobile,
        phones,
        emails,
        primaryEmail: emails[0],
        address: result.address || traceData.address,
        city: result.city || traceData.city,
        state: result.state || traceData.state,
        success: phones.length > 0,
        provider: "tracerfy",
        cost: TRACERFY_COST_PER_LEAD,
      };
    } catch (err) {
      console.error("[SkipTraceService] Tracerfy error:", err);
      return {
        propertyId: input.propertyId,
        ownerName: [traceData.firstName, traceData.lastName].filter(Boolean).join(" "),
        phones: [],
        emails: [],
        success: false,
        error: err instanceof Error ? err.message : "Skip trace failed",
        provider: "tracerfy",
        cost: 0,
      };
    }
  }

  /**
   * Batch skip trace using Tracerfy (async with webhook)
   * Returns queue ID for webhook processing
   */
  async skipTraceBatchAsync(
    propertyIds: string[]
  ): Promise<{
    queueId: number;
    recordCount: number;
    estimatedCost: number;
    skippedEntities: number;
  }> {
    const traceInputs: TraceJobInput[] = [];
    let skippedEntities = 0;

    // Get owner info for all properties
    for (const propertyId of propertyIds.slice(0, BATCH_SIZE)) {
      const owner = await this.getPropertyOwner(propertyId);

      if (!owner) continue;

      if (owner.isEntity) {
        skippedEntities++;
        continue;
      }

      if (!owner.firstName && !owner.lastName) continue;
      if (!owner.address || !owner.city || !owner.state) continue;

      traceInputs.push({
        address: owner.address,
        city: owner.city,
        state: owner.state,
        zip: owner.zip,
        first_name: owner.firstName,
        last_name: owner.lastName,
        mail_address: owner.mailAddress || owner.address,
        mail_city: owner.mailCity || owner.city,
        mail_state: owner.mailState || owner.state,
        mailing_zip: owner.mailZip,
      });
    }

    if (traceInputs.length === 0) {
      throw new Error("No valid records to trace");
    }

    // Check daily limit
    const usage = getUsage();
    if (usage.remaining < traceInputs.length) {
      throw new Error(
        `Daily limit would be exceeded. Remaining: ${usage.remaining}, Requested: ${traceInputs.length}`
      );
    }

    // Start async trace job - results come via webhook
    const job = await this.tracerfy.beginTrace(traceInputs, "normal");

    console.log(
      `[SkipTraceService] Started batch trace: queue=${job.queue_id}, records=${traceInputs.length}, skipped=${skippedEntities}`
    );

    return {
      queueId: job.queue_id,
      recordCount: traceInputs.length,
      estimatedCost: traceInputs.length * TRACERFY_COST_PER_LEAD,
      skippedEntities,
    };
  }

  /**
   * Process webhook results from Tracerfy
   */
  processWebhookResults(results: TracerfyNormalResult[]): SkipTraceResult[] {
    const processed: SkipTraceResult[] = [];

    for (const result of results) {
      const phones = extractPhones(result);
      const emails = extractEmails(result);
      const primaryMobile = phones.find((p) => p.type === "Mobile")?.number;

      processed.push({
        ownerName: [result.first_name, result.last_name].filter(Boolean).join(" "),
        firstName: result.first_name,
        lastName: result.last_name,
        primaryMobile,
        phones,
        emails,
        primaryEmail: emails[0],
        address: result.address,
        city: result.city,
        state: result.state,
        success: phones.length > 0,
        provider: "tracerfy",
        cost: TRACERFY_COST_PER_LEAD,
      });
    }

    // Update usage
    incrementUsage(processed.length);

    return processed;
  }

  /**
   * Get current usage stats
   */
  getUsageStats() {
    const usage = getUsage();
    return {
      ...usage,
      limit: DAILY_SKIP_TRACE_LIMIT,
      batchSize: BATCH_SIZE,
      costPerLead: TRACERFY_COST_PER_LEAD,
      provider: "tracerfy" as SkipTraceProvider,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let skipTraceService: SkipTraceService | null = null;

export function getSkipTraceService(): SkipTraceService {
  if (!skipTraceService) {
    skipTraceService = new SkipTraceService();
  }
  return skipTraceService;
}
