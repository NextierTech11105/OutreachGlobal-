/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LEAD ENRICHMENT API - Phone & Email via Tracerfy ($0.02/lead)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * B2B Flow:
 *   RealEstateAPI (property + owner data) → Tracerfy (phone + email)
 *
 * Endpoints:
 *   POST /api/enrich           - Enrich single lead or batch
 *   GET  /api/enrich?status    - Check balance and usage
 *
 * Cost: $0.02/lead for mobiles + emails (normal trace)
 *       $0.15/lead for deep enrichment (enhanced trace)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  TracerfyClient,
  TracerfyNormalResult,
  TraceJobInput,
  extractPhones,
  extractEmails,
} from "@/lib/tracerfy";
import {
  TRACERFY_COST_PER_LEAD,
  TRACERFY_ENHANCED_COST_PER_LEAD,
  DAILY_SKIP_TRACE_LIMIT,
  BATCH_SIZE,
} from "@/config/constants";

const tracerfy = new TracerfyClient();

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY FILTER - Skip LLCs, Trusts, Corporations (can't contact)
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

interface EnrichInput {
  // Required for skip trace
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  // Optional mailing address (if different)
  mailAddress?: string;
  mailCity?: string;
  mailState?: string;
  mailZip?: string;
  // Optional tracking
  id?: string;
  propertyId?: string;
}

interface EnrichResult {
  id?: string;
  ownerName: string;
  // Primary mobile for SMS
  mobile?: string;
  // All mobiles found
  mobiles: string[];
  // All emails found
  emails: string[];
  primaryEmail?: string;
  // Status
  success: boolean;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Check status and balance
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const analytics = await tracerfy.getAnalytics();
    const usageStats = getUsage();

    return NextResponse.json({
      success: true,
      provider: "tracerfy",
      balance: analytics.balance,
      costPerLead: TRACERFY_COST_PER_LEAD,
      enhancedCostPerLead: TRACERFY_ENHANCED_COST_PER_LEAD,
      usage: usageStats,
      stats: {
        totalQueues: analytics.total_queues,
        propertiesTraced: analytics.properties_traced,
        pending: analytics.queues_pending,
        completed: analytics.queues_completed,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get status",
      configured: !!process.env.TRACERFY_API_TOKEN,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Enrich leads with phone/email
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support single or batch
    const leads: EnrichInput[] = body.leads || (body.firstName ? [body] : []);
    const enhanced = body.enhanced === true;

    if (leads.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Provide leads array or single lead with firstName, lastName, address, city, state",
          example: {
            firstName: "John",
            lastName: "Smith",
            address: "123 Main St",
            city: "Miami",
            state: "FL",
          },
        },
        { status: 400 },
      );
    }

    // Check usage limit
    const usageStats = getUsage();
    if (usageStats.remaining < leads.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Daily limit reached. Remaining: ${usageStats.remaining}`,
          usage: usageStats,
        },
        { status: 429 },
      );
    }

    // Filter out entities and prepare trace inputs
    const traceInputs: TraceJobInput[] = [];
    const skipped: { id?: string; name: string; reason: string }[] = [];
    const idMap: Map<number, string> = new Map();

    for (let i = 0; i < leads.length && i < BATCH_SIZE; i++) {
      const lead = leads[i];
      const fullName = [lead.firstName, lead.lastName]
        .filter(Boolean)
        .join(" ");

      // Skip entities (LLCs, Trusts, etc.)
      if (isEntity(fullName)) {
        skipped.push({
          id: lead.id,
          name: fullName,
          reason: "Entity owner - cannot skip trace",
        });
        continue;
      }

      // Validate required fields
      if (!lead.firstName && !lead.lastName) {
        skipped.push({ id: lead.id, name: "", reason: "Missing name" });
        continue;
      }
      if (!lead.address || !lead.city || !lead.state) {
        skipped.push({
          id: lead.id,
          name: fullName,
          reason: "Missing address",
        });
        continue;
      }

      idMap.set(traceInputs.length, lead.id || lead.propertyId || `lead_${i}`);

      traceInputs.push({
        first_name: lead.firstName || "",
        last_name: lead.lastName || "",
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip: lead.zip,
        mail_address: lead.mailAddress || lead.address,
        mail_city: lead.mailCity || lead.city,
        mail_state: lead.mailState || lead.state,
        mailing_zip: lead.mailZip,
      });
    }

    if (traceInputs.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        skipped,
        message: "All leads were filtered (entities or missing data)",
      });
    }

    // Check Tracerfy balance
    const analytics = await tracerfy.getAnalytics();
    const creditsNeeded = traceInputs.length * (enhanced ? 15 : 1);

    if (analytics.balance < creditsNeeded) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient Tracerfy credits",
          balance: analytics.balance,
          needed: creditsNeeded,
          leads: traceInputs.length,
        },
        { status: 402 },
      );
    }

    // Start trace job
    const job = await tracerfy.beginTrace(
      traceInputs,
      enhanced ? "enhanced" : "normal",
    );

    console.log(
      `[Enrich] Started trace: queue=${job.queue_id}, leads=${traceInputs.length}`,
    );

    // Wait for results (with timeout)
    const queue = await tracerfy.waitForQueue(job.queue_id, 3000, 120000);

    if (!queue.download_url) {
      return NextResponse.json({
        success: false,
        error: "Trace job did not complete",
        queueId: job.queue_id,
      });
    }

    // Get results
    const traceResults = (await tracerfy.getQueueResults(
      queue.id,
    )) as TracerfyNormalResult[];

    // Process results
    const results: EnrichResult[] = traceResults.map((result, idx) => {
      const phones = extractPhones(result);
      const emails = extractEmails(result);
      const mobiles = phones
        .filter((p) => p.type === "Mobile")
        .map((p) => p.number);

      return {
        id: idMap.get(idx),
        ownerName: [result.first_name, result.last_name]
          .filter(Boolean)
          .join(" "),
        mobile: mobiles[0],
        mobiles,
        emails,
        primaryEmail: emails[0],
        success: mobiles.length > 0 || emails.length > 0,
      };
    });

    // Update usage
    usage.count += traceInputs.length;

    // Stats
    const withMobile = results.filter((r) => r.mobile).length;
    const withEmail = results.filter((r) => r.primaryEmail).length;
    const costPerLead = enhanced
      ? TRACERFY_ENHANCED_COST_PER_LEAD
      : TRACERFY_COST_PER_LEAD;

    return NextResponse.json({
      success: true,
      results,
      skipped,
      stats: {
        processed: results.length,
        withMobile,
        withEmail,
        mobileRate: Math.round((withMobile / results.length) * 100),
        emailRate: Math.round((withEmail / results.length) * 100),
        cost: (results.length * costPerLead).toFixed(2),
      },
      usage: getUsage(),
    });
  } catch (error) {
    console.error("[Enrich] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Enrichment failed",
      },
      { status: 500 },
    );
  }
}
