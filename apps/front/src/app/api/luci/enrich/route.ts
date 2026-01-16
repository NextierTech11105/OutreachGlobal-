/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LUCI ENRICHMENT API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LUCI is the Data Acquisition & Enrichment Specialist.
 *
 * Pipeline:
 *   1. Property data from RealEstateAPI (search by location/criteria)
 *   2. Owner contact info via Tracerfy skip trace ($0.02/lead)
 *   3. Enriched leads ready for GIANNA SMS outreach
 *
 * Endpoints:
 *   POST /api/luci/enrich       - Enrich property IDs with owner contact info
 *   GET  /api/luci/enrich       - Check enrichment status
 */

import { NextRequest, NextResponse } from "next/server";
import { realEstateApi } from "@/lib/services/real-estate-api";
import {
  TracerfyClient,
  TracerfyNormalResult,
  TraceJobInput,
  extractPhones,
  extractEmails,
} from "@/lib/tracerfy";
import {
  TRACERFY_COST_PER_LEAD,
  DAILY_SKIP_TRACE_LIMIT,
  BATCH_SIZE,
} from "@/config/constants";
import { Logger } from "@/lib/logger";

const log = new Logger("LUCI");
const tracerfy = new TracerfyClient();

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY FILTER
// ═══════════════════════════════════════════════════════════════════════════════

const ENTITY_PATTERNS = [
  /\bllc\b/i,
  /\binc\b/i,
  /\bcorp\b/i,
  /\bltd\b/i,
  /\btrust\b/i,
  /\btrustee\b/i,
  /\bestate\b/i,
  /\bbank\b/i,
  /\bhoa\b/i,
  /\bassociation\b/i,
];

function isEntity(name: string): boolean {
  if (!name) return false;
  return ENTITY_PATTERNS.some((p) => p.test(name));
}

// ═══════════════════════════════════════════════════════════════════════════════
// USAGE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

const usage = { date: "", count: 0 };

function getUsage() {
  const today = new Date().toISOString().split("T")[0];
  if (usage.date !== today) {
    usage.date = today;
    usage.count = 0;
  }
  return {
    date: usage.date,
    used: usage.count,
    remaining: DAILY_SKIP_TRACE_LIMIT - usage.count,
    limit: DAILY_SKIP_TRACE_LIMIT,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface EnrichedLead {
  propertyId: string;
  // Property info
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType?: string;
  estimatedValue?: number;
  // Owner info
  ownerName: string;
  firstName: string;
  lastName: string;
  ownerOccupied: boolean;
  // Contact info (from Tracerfy)
  mobile?: string;
  mobiles: string[];
  emails: string[];
  primaryEmail?: string;
  // Status
  enriched: boolean;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Check enrichment status
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const analytics = await tracerfy.getAnalytics();
    const usageStats = getUsage();

    return NextResponse.json({
      success: true,
      worker: "LUCI",
      domain: "data",
      status: "online",
      enrichmentProvider: "tracerfy",
      propertyProvider: "realestateapi",
      credits: analytics.balance,
      costPerLead: TRACERFY_COST_PER_LEAD,
      usage: usageStats,
      endpoints: {
        enrich: "POST /api/luci/enrich { propertyIds: [...] }",
        search:
          "POST /api/luci/enrich { search: { zip, absentee_owner, etc } }",
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      worker: "LUCI",
      error: error instanceof Error ? error.message : "Status check failed",
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Enrich property IDs with contact info
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyIds, search, teamId } = body;

    // Option 1: Enrich specific property IDs
    // Option 2: Search for properties then enrich
    let idsToEnrich: string[] = propertyIds || [];

    if (search && !propertyIds) {
      // Search RealEstateAPI for property IDs
      log.info("Searching for properties", { search });

      try {
        const searchResult = await realEstateApi.searchProperties({
          ...search,
          ids_only: true,
          size: Math.min(search.size || BATCH_SIZE, BATCH_SIZE),
        });

        idsToEnrich = (searchResult.data || []).map((id) => String(id));
        log.info("Found properties", { count: idsToEnrich.length });
      } catch (err) {
        log.error("Property search failed", { error: err });
        return NextResponse.json(
          { success: false, error: "Property search failed" },
          { status: 500 },
        );
      }
    }

    if (idsToEnrich.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Provide propertyIds array or search criteria",
          example: {
            byIds: { propertyIds: ["id1", "id2", "..."] },
            bySearch: {
              search: { zip: "33101", absentee_owner: true, size: 100 },
            },
          },
        },
        { status: 400 },
      );
    }

    // Check usage limit
    const usageStats = getUsage();
    const toProcess = idsToEnrich.slice(
      0,
      Math.min(BATCH_SIZE, usageStats.remaining),
    );

    if (toProcess.length === 0) {
      return NextResponse.json(
        { success: false, error: "Daily limit reached", usage: usageStats },
        { status: 429 },
      );
    }

    log.info("Starting enrichment", {
      requested: idsToEnrich.length,
      processing: toProcess.length,
      teamId,
    });

    // Step 1: Get property details from RealEstateAPI
    const propertyDetails =
      await realEstateApi.getPropertyDetailsBatch(toProcess);

    // Step 2: Prepare trace inputs (filter entities)
    const traceInputs: TraceJobInput[] = [];
    const skipped: { id: string; reason: string }[] = [];
    const propertyMap = new Map<
      number,
      { id: string; detail: (typeof propertyDetails)[0] }
    >();

    for (const detail of propertyDetails) {
      const data = detail.data;
      if (!data) continue;

      const firstName = data.owner1FirstName || "";
      const lastName = data.owner1LastName || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ");

      // Skip entities
      if (isEntity(fullName) || data.corporateOwned) {
        skipped.push({ id: data.id, reason: "Entity owner" });
        continue;
      }

      // Skip if no name
      if (!firstName && !lastName) {
        skipped.push({ id: data.id, reason: "Missing owner name" });
        continue;
      }

      // Skip if no address
      if (
        !data.address?.address ||
        !data.address?.city ||
        !data.address?.state
      ) {
        skipped.push({ id: data.id, reason: "Missing address" });
        continue;
      }

      propertyMap.set(traceInputs.length, { id: data.id, detail });

      traceInputs.push({
        first_name: firstName,
        last_name: lastName,
        address: data.address.address,
        city: data.address.city,
        state: data.address.state,
        zip: data.address.zip,
        mail_address: data.mailAddress?.address || data.address.address,
        mail_city: data.mailAddress?.city || data.address.city,
        mail_state: data.mailAddress?.state || data.address.state,
        mailing_zip: data.mailAddress?.zip,
      });
    }

    if (traceInputs.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        skipped,
        message: "No valid leads to enrich (all filtered)",
      });
    }

    // Check Tracerfy balance
    const analytics = await tracerfy.getAnalytics();
    if (analytics.balance < traceInputs.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient Tracerfy credits",
          balance: analytics.balance,
          needed: traceInputs.length,
        },
        { status: 402 },
      );
    }

    // Step 3: Run Tracerfy skip trace
    log.info("Starting Tracerfy trace", { leads: traceInputs.length });

    const job = await tracerfy.beginTrace(traceInputs, "normal");
    const queue = await tracerfy.waitForQueue(job.queue_id, 3000, 180000);

    if (!queue.download_url) {
      return NextResponse.json({
        success: false,
        error: "Trace job did not complete",
        queueId: job.queue_id,
      });
    }

    // Step 4: Get and process results
    const traceResults = (await tracerfy.getQueueResults(
      queue.id,
    )) as TracerfyNormalResult[];

    const enrichedLeads: EnrichedLead[] = traceResults.map((result, idx) => {
      const phones = extractPhones(result);
      const emails = extractEmails(result);
      const mobiles = phones
        .filter((p) => p.type === "Mobile")
        .map((p) => p.number);
      const propData = propertyMap.get(idx);
      const data = propData?.detail?.data;

      return {
        propertyId: propData?.id || "",
        address: data?.address?.address || result.address,
        city: data?.address?.city || result.city,
        state: data?.address?.state || result.state,
        zip: data?.address?.zip || "",
        propertyType: data?.propertyType,
        estimatedValue: data?.estimatedValue,
        ownerName: [result.first_name, result.last_name]
          .filter(Boolean)
          .join(" "),
        firstName: result.first_name,
        lastName: result.last_name,
        ownerOccupied: data?.ownerOccupied || false,
        mobile: mobiles[0],
        mobiles,
        emails,
        primaryEmail: emails[0],
        enriched: mobiles.length > 0 || emails.length > 0,
      };
    });

    // Update usage
    usage.count += traceInputs.length;

    // Stats
    const withMobile = enrichedLeads.filter((l) => l.mobile).length;
    const withEmail = enrichedLeads.filter((l) => l.primaryEmail).length;
    const totalCost = traceInputs.length * TRACERFY_COST_PER_LEAD;

    log.info("Enrichment complete", {
      total: enrichedLeads.length,
      withMobile,
      withEmail,
      cost: `$${totalCost.toFixed(2)}`,
    });

    return NextResponse.json({
      success: true,
      worker: "LUCI",
      results: enrichedLeads,
      skipped,
      stats: {
        processed: enrichedLeads.length,
        skipped: skipped.length,
        withMobile,
        withEmail,
        mobileRate: Math.round((withMobile / enrichedLeads.length) * 100),
        emailRate: Math.round((withEmail / enrichedLeads.length) * 100),
        cost: totalCost.toFixed(2),
      },
      usage: getUsage(),
      remaining: idsToEnrich.length - toProcess.length,
      teamId,
    });
  } catch (error) {
    log.error("Enrichment failed", {
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      {
        success: false,
        worker: "LUCI",
        error: error instanceof Error ? error.message : "Enrichment failed",
      },
      { status: 500 },
    );
  }
}
