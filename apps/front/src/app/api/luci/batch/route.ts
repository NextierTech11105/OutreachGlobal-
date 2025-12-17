/**
 * LUCI Batch Processing
 *
 * Processes data in batches:
 * - 100 records at a time
 * - Up to 1,000 per campaign (max)
 * - Pause between batches
 * - Resume from where left off
 *
 * This is LUCI's workhorse for large-scale data processing
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses, leads, contacts } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, asc, sql, gt, isNull, or } from "drizzle-orm";
import { apiAuth } from "@/lib/api-auth";

// Constants
const BATCH_SIZE = 100; // Process 100 at a time
const MAX_PER_CAMPAIGN = 1000; // Max 1,000 per campaign
const PAUSE_BETWEEN_BATCHES_MS = 2000; // 2 second pause between batches

// RealEstateAPI
const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v1/SkipTrace";
const PROPERTY_SEARCH_URL = "https://api.realestateapi.com/v2/PropertySearch";

// Job status tracking (in production, use Redis or DB)
const jobStatus: Record<
  string,
  {
    status: "running" | "paused" | "completed" | "error";
    totalProcessed: number;
    totalBatches: number;
    currentBatch: number;
    lastProcessedId: string | null;
    results: any;
    startedAt: string;
    pausedAt?: string;
    completedAt?: string;
    error?: string;
  }
> = {};

// ============================================================
// AUTO-TAGGING (same as pipeline)
// ============================================================

const BLUE_COLLAR_SIC = [
  "15",
  "16",
  "17",
  "07",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "42",
  "49",
  "75",
  "76",
];
const TECH_INTEGRATION_SIC = [
  "50",
  "51",
  "60",
  "61",
  "63",
  "64",
  "73",
  "80",
  "82",
  "87",
];

function generateTags(biz: {
  sicCode: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  yearsInBusiness: number | null;
  yearEstablished: number | null;
  ownerName: string | null;
}): { tags: string[]; priority: "high" | "medium" | "low"; score: number } {
  const tags: string[] = [];
  let score = 0;
  const sicPrefix = biz.sicCode?.substring(0, 2) || "";

  if (BLUE_COLLAR_SIC.includes(sicPrefix)) {
    tags.push("blue-collar");
    score += 1;
    if (
      biz.employeeCount &&
      biz.employeeCount >= 5 &&
      biz.employeeCount <= 50
    ) {
      tags.push("acquisition-target");
      score += 2;
    }
    if (
      biz.annualRevenue &&
      biz.annualRevenue >= 500000 &&
      biz.annualRevenue <= 10000000
    ) {
      tags.push("sweet-spot-revenue");
      score += 2;
    }
  }

  if (TECH_INTEGRATION_SIC.includes(sicPrefix)) {
    tags.push("tech-integration");
    score += 1;
    if (biz.employeeCount && biz.employeeCount >= 20) {
      tags.push("scale-ready");
      score += 1;
    }
  }

  if (
    biz.yearsInBusiness &&
    biz.yearsInBusiness >= 5 &&
    biz.yearsInBusiness <= 15
  ) {
    tags.push("exit-prep-timing");
    score += 1;
  }

  if (biz.yearEstablished) {
    const age = new Date().getFullYear() - biz.yearEstablished;
    if (age >= 20) {
      tags.push("mature-ownership");
      tags.push("potential-exit");
      score += 2;
    }
    if (age >= 30) {
      tags.push("succession-planning");
      score += 1;
    }
  }

  if (
    biz.employeeCount &&
    biz.employeeCount >= 10 &&
    biz.employeeCount <= 100 &&
    biz.annualRevenue &&
    biz.annualRevenue >= 1000000
  ) {
    tags.push("expansion-candidate");
    score += 1;
  }

  if (biz.ownerName) {
    tags.push("owner-identified");
    score += 1;
  }

  let priority: "high" | "medium" | "low" = "low";
  if (score >= 5) priority = "high";
  else if (score >= 3) priority = "medium";

  return { tags, priority, score };
}

// ============================================================
// SKIP TRACE
// ============================================================

async function skipTraceOwner(
  firstName: string,
  lastName: string,
  address: string,
  city: string,
  state: string,
  zip: string,
) {
  if (!REALESTATE_API_KEY)
    return { phones: [], emails: [], mailingAddress: null };

  try {
    const response = await fetch(SKIP_TRACE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        address,
        city,
        state,
        zip,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const result = data.data || data;

      const phones = (result.phones || result.phone_numbers || []).map(
        (p: any) => {
          const phoneObj = typeof p === "string" ? { number: p } : p;
          const lineType = (
            phoneObj.line_type ||
            phoneObj.type ||
            ""
          ).toLowerCase();
          let type: "mobile" | "landline" | "unknown" = "unknown";
          if (lineType.includes("mobile") || lineType.includes("cell"))
            type = "mobile";
          else if (lineType.includes("land") || lineType.includes("voip"))
            type = "landline";
          return { number: phoneObj.number || phoneObj.phone || p, type };
        },
      );

      const emails = (result.emails || []).map((e: any) =>
        typeof e === "string" ? e : e.email,
      );

      return { phones, emails, mailingAddress: result.mailing_address || null };
    }
  } catch (error) {
    console.error("[LUCI Batch] Skip trace error:", error);
  }

  return { phones: [], emails: [], mailingAddress: null };
}

// ============================================================
// FIND PROPERTIES OWNED BY PERSON
// ============================================================

async function findPropertiesOwned(
  firstName: string,
  lastName: string,
  state?: string,
) {
  if (!REALESTATE_API_KEY) return [];

  try {
    const response = await fetch(PROPERTY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({
        owner_first_name: firstName,
        owner_last_name: lastName,
        state,
        limit: 10,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return (data.data || data.properties || []).map((p: any) => ({
        address: p.address || p.property_address || "",
        city: p.city || "",
        state: p.state || "",
        estimatedValue: p.estimated_value || null,
        estimatedEquity: p.estimated_equity || null,
        propertyType: p.property_type || "Unknown",
      }));
    }
  } catch (error) {
    console.error("[LUCI Batch] Property search error:", error);
  }

  return [];
}

// ============================================================
// BATCH PROCESSOR
// ============================================================

async function processBatch(
  userId: string,
  jobId: string,
  options: {
    skipTrace: boolean;
    crossReference: boolean;
    tagFilter?: string[];
    lastId?: string;
  },
): Promise<{
  processed: number;
  results: any[];
  lastId: string | null;
  hasMore: boolean;
}> {
  // Build query for next batch
  const conditions = [eq(businesses.userId, userId)];

  // Resume from last processed ID
  if (options.lastId) {
    conditions.push(gt(businesses.id, options.lastId));
  }

  const batch = await db
    .select({
      id: businesses.id,
      companyName: businesses.companyName,
      ownerFirstName: businesses.ownerFirstName,
      ownerLastName: businesses.ownerLastName,
      ownerName: businesses.ownerName,
      ownerPhone: businesses.ownerPhone,
      ownerEmail: businesses.ownerEmail,
      address: businesses.address,
      city: businesses.city,
      state: businesses.state,
      zip: businesses.zip,
      sicCode: businesses.sicCode,
      employeeCount: businesses.employeeCount,
      annualRevenue: businesses.annualRevenue,
      yearEstablished: businesses.yearEstablished,
      yearsInBusiness: businesses.yearsInBusiness,
    })
    .from(businesses)
    .where(and(...conditions))
    .orderBy(asc(businesses.id))
    .limit(BATCH_SIZE);

  if (batch.length === 0) {
    return { processed: 0, results: [], lastId: null, hasMore: false };
  }

  const results = [];

  for (const biz of batch) {
    // Generate tags
    const { tags, priority, score } = generateTags({
      sicCode: biz.sicCode,
      employeeCount: biz.employeeCount,
      annualRevenue: biz.annualRevenue,
      yearsInBusiness: biz.yearsInBusiness,
      yearEstablished: biz.yearEstablished,
      ownerName: biz.ownerName,
    });

    // Filter by tags if specified
    if (options.tagFilter && options.tagFilter.length > 0) {
      if (!options.tagFilter.some((t) => tags.includes(t))) {
        continue; // Skip this business
      }
    }

    const enrichedData: any = {
      businessId: biz.id,
      companyName: biz.companyName,
      ownerName:
        biz.ownerName ||
        `${biz.ownerFirstName || ""} ${biz.ownerLastName || ""}`.trim(),
      tags,
      priority,
      score,
    };

    // Skip trace the owner (person, not company!)
    if (options.skipTrace && biz.ownerName) {
      const firstName = biz.ownerFirstName || biz.ownerName.split(" ")[0] || "";
      const lastName =
        biz.ownerLastName || biz.ownerName.split(" ").slice(1).join(" ") || "";

      if (firstName) {
        const skipResult = await skipTraceOwner(
          firstName,
          lastName,
          biz.address || "",
          biz.city || "",
          biz.state || "",
          biz.zip || "",
        );
        enrichedData.phones = skipResult.phones;
        enrichedData.emails = skipResult.emails;
        enrichedData.mailingAddress = skipResult.mailingAddress;
        enrichedData.mobilePhone = skipResult.phones.find(
          (p) => p.type === "mobile",
        )?.number;
        enrichedData.skipTraced = true;

        // Cross-reference properties
        if (options.crossReference) {
          const properties = await findPropertiesOwned(
            firstName,
            lastName,
            biz.state || undefined,
          );
          enrichedData.propertiesOwned = properties;
          enrichedData.propertyCount = properties.length;
          enrichedData.totalPropertyValue = properties.reduce(
            (sum, p) => sum + (p.estimatedValue || 0),
            0,
          );

          if (properties.length > 0) {
            tags.push("property-owner");
            if (properties.length >= 3) tags.push("multi-property-owner");
          }
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    results.push(enrichedData);
  }

  const lastId = batch[batch.length - 1]?.id || null;

  return {
    processed: batch.length,
    results,
    lastId,
    hasMore: batch.length === BATCH_SIZE,
  };
}

// ============================================================
// API ENDPOINTS
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const {
      action,
      jobId,
      // Start options
      skipTrace = true,
      crossReference = true,
      tagFilter,
      maxRecords = MAX_PER_CAMPAIGN, // Default 1000
    } = body;

    // ============================================================
    // ACTION: START - Start a new batch job
    // ============================================================
    if (action === "start") {
      const newJobId = `luci-${Date.now()}`;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(businesses)
        .where(eq(businesses.userId, userId));

      const totalRecords = Math.min(countResult?.count || 0, maxRecords);
      const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);

      jobStatus[newJobId] = {
        status: "running",
        totalProcessed: 0,
        totalBatches,
        currentBatch: 0,
        lastProcessedId: null,
        results: {
          processed: 0,
          tagged: 0,
          skipTraced: 0,
          propertiesFound: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0,
          records: [],
        },
        startedAt: new Date().toISOString(),
      };

      // Process first batch immediately
      const firstBatch = await processBatch(userId, newJobId, {
        skipTrace,
        crossReference,
        tagFilter,
      });

      jobStatus[newJobId].currentBatch = 1;
      jobStatus[newJobId].totalProcessed = firstBatch.processed;
      jobStatus[newJobId].lastProcessedId = firstBatch.lastId;
      jobStatus[newJobId].results.records.push(...firstBatch.results);
      jobStatus[newJobId].results.processed = firstBatch.results.length;

      // Count priorities
      firstBatch.results.forEach((r) => {
        if (r.priority === "high") jobStatus[newJobId].results.highPriority++;
        else if (r.priority === "medium")
          jobStatus[newJobId].results.mediumPriority++;
        else jobStatus[newJobId].results.lowPriority++;
        if (r.skipTraced) jobStatus[newJobId].results.skipTraced++;
        if (r.propertyCount)
          jobStatus[newJobId].results.propertiesFound += r.propertyCount;
      });

      if (
        !firstBatch.hasMore ||
        jobStatus[newJobId].totalProcessed >= maxRecords
      ) {
        jobStatus[newJobId].status = "completed";
        jobStatus[newJobId].completedAt = new Date().toISOString();
      } else {
        jobStatus[newJobId].status = "paused";
        jobStatus[newJobId].pausedAt = new Date().toISOString();
      }

      return NextResponse.json({
        success: true,
        jobId: newJobId,
        status: jobStatus[newJobId].status,
        batchSize: BATCH_SIZE,
        maxPerCampaign: maxRecords,
        batch: {
          number: 1,
          of: totalBatches,
          processed: firstBatch.processed,
          hasMore: firstBatch.hasMore,
        },
        results: {
          processed: jobStatus[newJobId].results.processed,
          highPriority: jobStatus[newJobId].results.highPriority,
          mediumPriority: jobStatus[newJobId].results.mediumPriority,
          skipTraced: jobStatus[newJobId].results.skipTraced,
        },
        message: `Batch 1/${totalBatches} complete. ${firstBatch.hasMore ? "Call 'continue' to process next batch." : "Job complete!"}`,
      });
    }

    // ============================================================
    // ACTION: CONTINUE - Continue processing next batch
    // ============================================================
    if (action === "continue") {
      if (!jobId || !jobStatus[jobId]) {
        return NextResponse.json(
          { error: "Invalid or expired jobId" },
          { status: 400 },
        );
      }

      const job = jobStatus[jobId];

      if (job.status === "completed") {
        return NextResponse.json({
          success: true,
          jobId,
          status: "completed",
          message: "Job already completed",
          results: job.results,
        });
      }

      // Pause between batches
      await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_BATCHES_MS));

      job.status = "running";

      const batch = await processBatch(userId, jobId, {
        skipTrace,
        crossReference,
        tagFilter,
        lastId: job.lastProcessedId || undefined,
      });

      job.currentBatch++;
      job.totalProcessed += batch.processed;
      job.lastProcessedId = batch.lastId;
      job.results.records.push(...batch.results);
      job.results.processed += batch.results.length;

      batch.results.forEach((r) => {
        if (r.priority === "high") job.results.highPriority++;
        else if (r.priority === "medium") job.results.mediumPriority++;
        else job.results.lowPriority++;
        if (r.skipTraced) job.results.skipTraced++;
        if (r.propertyCount) job.results.propertiesFound += r.propertyCount;
      });

      if (!batch.hasMore || job.totalProcessed >= maxRecords) {
        job.status = "completed";
        job.completedAt = new Date().toISOString();
      } else {
        job.status = "paused";
        job.pausedAt = new Date().toISOString();
      }

      return NextResponse.json({
        success: true,
        jobId,
        status: job.status,
        batch: {
          number: job.currentBatch,
          of: job.totalBatches,
          processed: batch.processed,
          hasMore: batch.hasMore,
        },
        totalProcessed: job.totalProcessed,
        results: {
          processed: job.results.processed,
          highPriority: job.results.highPriority,
          mediumPriority: job.results.mediumPriority,
          skipTraced: job.results.skipTraced,
          propertiesFound: job.results.propertiesFound,
        },
        message:
          job.status === "completed"
            ? `Job complete! Processed ${job.totalProcessed} records.`
            : `Batch ${job.currentBatch}/${job.totalBatches} complete. Call 'continue' for next batch.`,
      });
    }

    // ============================================================
    // ACTION: STATUS - Get job status
    // ============================================================
    if (action === "status") {
      if (!jobId || !jobStatus[jobId]) {
        return NextResponse.json(
          { error: "Invalid or expired jobId" },
          { status: 400 },
        );
      }

      const job = jobStatus[jobId];

      return NextResponse.json({
        success: true,
        jobId,
        status: job.status,
        progress: {
          batch: job.currentBatch,
          of: job.totalBatches,
          processed: job.totalProcessed,
          percent: Math.round((job.currentBatch / job.totalBatches) * 100),
        },
        results: {
          processed: job.results.processed,
          highPriority: job.results.highPriority,
          mediumPriority: job.results.mediumPriority,
          lowPriority: job.results.lowPriority,
          skipTraced: job.results.skipTraced,
          propertiesFound: job.results.propertiesFound,
        },
        timing: {
          startedAt: job.startedAt,
          pausedAt: job.pausedAt,
          completedAt: job.completedAt,
        },
      });
    }

    // ============================================================
    // ACTION: RESULTS - Get full results
    // ============================================================
    if (action === "results") {
      if (!jobId || !jobStatus[jobId]) {
        return NextResponse.json(
          { error: "Invalid or expired jobId" },
          { status: 400 },
        );
      }

      const job = jobStatus[jobId];

      return NextResponse.json({
        success: true,
        jobId,
        status: job.status,
        summary: {
          processed: job.results.processed,
          highPriority: job.results.highPriority,
          mediumPriority: job.results.mediumPriority,
          lowPriority: job.results.lowPriority,
          skipTraced: job.results.skipTraced,
          propertiesFound: job.results.propertiesFound,
        },
        records: job.results.records,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: start, continue, status, results" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[LUCI Batch] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    agent: "LUCI",
    endpoint: "Batch Processor",
    batchSize: BATCH_SIZE,
    maxPerCampaign: MAX_PER_CAMPAIGN,
    pauseBetweenBatches: `${PAUSE_BETWEEN_BATCHES_MS}ms`,
    actions: {
      start:
        "POST { action: 'start', skipTrace, crossReference, tagFilter, maxRecords }",
      continue: "POST { action: 'continue', jobId }",
      status: "POST { action: 'status', jobId }",
      results: "POST { action: 'results', jobId }",
    },
    workflow: [
      "1. POST { action: 'start' } - Starts job, processes first 100",
      "2. Job pauses automatically",
      "3. POST { action: 'continue', jobId } - Process next 100",
      "4. Repeat until 1,000 reached or no more data",
      "5. POST { action: 'results', jobId } - Get all results",
    ],
  });
}
