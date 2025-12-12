import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buckets, leads } from "@/lib/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

/**
 * BUCKET BATCH PROCESSOR
 *
 * Enriches property IDs from a bucket in economical blocks:
 * - 250 properties per batch (API limit)
 * - 2,000 per micro-campaign block
 * - 5,000 per day per phone number
 *
 * Process:
 * 1. Fetch pending property IDs from bucket
 * 2. Call PropertyDetail API for full data + skip trace
 * 3. Update lead records with enriched data
 * 4. Track progress for resume capability
 */

const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const PROPERTY_DETAIL_URL = "https://api.realestateapi.com/v2/PropertyDetail";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v2/SkipTrace";

// Processing limits
const BATCH_SIZE = 250;
const MICRO_CAMPAIGN_LIMIT = 2000;
const DAILY_LIMIT = 5000;

// POST - Process a batch from the bucket
export async function POST(request: NextRequest) {
  try {
    const { bucketId, limit, skipTrace = true } = await request.json();

    if (!bucketId) {
      return NextResponse.json(
        { error: "Bucket ID required" },
        { status: 400 },
      );
    }

    if (!REALESTATE_API_KEY) {
      return NextResponse.json(
        { error: "REALESTATE_API_KEY not configured" },
        { status: 500 },
      );
    }

    // Get bucket
    const [bucket] = await db
      .select()
      .from(buckets)
      .where(eq(buckets.id, bucketId));

    if (!bucket) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    // Determine how many to process (respect limits)
    const requestedLimit = Math.min(
      limit || MICRO_CAMPAIGN_LIMIT,
      MICRO_CAMPAIGN_LIMIT,
    );

    // Get pending leads from bucket
    const pendingLeads = await db
      .select({
        id: leads.id,
        propertyId: leads.propertyId,
      })
      .from(leads)
      .where(
        and(
          eq(leads.bucketId, bucketId),
          eq(leads.enrichmentStatus, "pending"),
        ),
      )
      .limit(requestedLimit);

    if (pendingLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending leads to process",
        stats: {
          processed: 0,
          remaining: 0,
        },
      });
    }

    console.log(
      `[Bucket Process] Processing ${pendingLeads.length} leads from "${bucket.name}"`,
    );

    // Mark as processing
    await db
      .update(buckets)
      .set({
        enrichmentStatus: "processing",
        queuedAt: new Date(),
      })
      .where(eq(buckets.id, bucketId));

    // Process in batches of 250
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      withPhones: 0,
      withEmails: 0,
      errors: [] as string[],
    };

    const CONCURRENCY = 10;

    for (let i = 0; i < pendingLeads.length; i += BATCH_SIZE) {
      const batch = pendingLeads.slice(i, i + BATCH_SIZE);
      console.log(
        `[Bucket Process] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} leads`,
      );

      // Process batch with concurrency limit
      for (let j = 0; j < batch.length; j += CONCURRENCY) {
        const concurrent = batch.slice(j, j + CONCURRENCY);

        const batchResults = await Promise.all(
          concurrent.map(
            async (lead: { id: string; propertyId: string | null }) => {
              try {
                // 1. Fetch property detail
                const detailRes = await fetch(PROPERTY_DETAIL_URL, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": REALESTATE_API_KEY,
                  },
                  body: JSON.stringify({ id: lead.propertyId }),
                });

                if (!detailRes.ok) {
                  throw new Error(`Detail API returned ${detailRes.status}`);
                }

                const detailData = await detailRes.json();
                const property = detailData.data || detailData;

                // 2. Skip trace the owner
                let skipTraceData = null;
                if (skipTrace) {
                  const ownerInfo = property.ownerInfo || property;
                  const propInfo = property.propertyInfo || property;
                  const address = propInfo.address || property.address;

                  const firstName =
                    ownerInfo.owner1FirstName || property.owner1FirstName || "";
                  const lastName =
                    ownerInfo.owner1LastName || property.owner1LastName || "";

                  // Build skip trace request (flat address format)
                  const skipTraceBody: Record<string, unknown> = {};
                  if (firstName) skipTraceBody.first_name = firstName;
                  if (lastName) skipTraceBody.last_name = lastName;

                  if (typeof address === "string") {
                    skipTraceBody.address = address;
                  } else if (address) {
                    if (address.address || address.street)
                      skipTraceBody.address = address.address || address.street;
                    if (address.city) skipTraceBody.city = address.city;
                    if (address.state) skipTraceBody.state = address.state;
                    if (address.zip) skipTraceBody.zip = address.zip;
                  }

                  skipTraceBody.match_requirements = { phones: true };

                  if (Object.keys(skipTraceBody).length > 1) {
                    try {
                      const stRes = await fetch(SKIP_TRACE_URL, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "x-api-key": REALESTATE_API_KEY,
                          Accept: "application/json",
                        },
                        body: JSON.stringify(skipTraceBody),
                      });

                      if (stRes.ok) {
                        const stData = await stRes.json();
                        const identity = stData.output?.identity || {};

                        // Extract phones (skip DNC and disconnected)
                        const phones: string[] = [];
                        if (identity.phones && Array.isArray(identity.phones)) {
                          for (const p of identity.phones) {
                            if (p.doNotCall === true || p.isConnected === false)
                              continue;
                            const num =
                              p.phone ||
                              p.phoneDisplay?.replace(/\D/g, "") ||
                              "";
                            if (num) phones.push(num);
                          }
                        }

                        // Extract emails
                        const emails: string[] = [];
                        if (identity.emails && Array.isArray(identity.emails)) {
                          for (const e of identity.emails) {
                            if (e.email) emails.push(e.email);
                          }
                        }

                        skipTraceData = {
                          phones,
                          emails,
                          ownerName:
                            identity.names?.[0]?.fullName ||
                            `${firstName} ${lastName}`.trim(),
                          mailingAddress: identity.address?.formattedAddress,
                        };
                      }
                    } catch (stErr) {
                      console.error(
                        `[Bucket Process] Skip trace error for ${lead.propertyId}:`,
                        stErr,
                      );
                    }
                  }
                }

                // 3. Update lead record with enriched data
                const propInfo = property.propertyInfo || property;
                const ownerInfo = property.ownerInfo || property;
                const mortgageInfo = property.mortgageInfo || {};
                const address = propInfo.address || property.address || {};

                await db
                  .update(leads)
                  .set({
                    // Property address
                    propertyAddress:
                      typeof address === "string"
                        ? address
                        : address.address || address.street,
                    propertyCity:
                      typeof address === "object" ? address.city : undefined,
                    propertyState:
                      typeof address === "object" ? address.state : undefined,
                    propertyZip:
                      typeof address === "object" ? address.zip : undefined,
                    propertyCounty:
                      typeof address === "object" ? address.county : undefined,
                    latitude: property.latitude?.toString(),
                    longitude: property.longitude?.toString(),

                    // Property characteristics
                    propertyType:
                      propInfo.propertyType || property.propertyType,
                    bedrooms: propInfo.bedrooms || property.bedrooms,
                    bathrooms:
                      propInfo.bathrooms?.toString() ||
                      property.bathrooms?.toString(),
                    sqft: propInfo.squareFeet || property.sqft,
                    lotSizeSqft: propInfo.lotSize || property.lotSize,
                    yearBuilt: propInfo.yearBuilt || property.yearBuilt,

                    // Valuation
                    estimatedValue: property.avm || property.estimatedValue,
                    assessedValue:
                      property.taxMarketValue || property.assessedValue,
                    taxAmount: property.taxAmount,
                    estimatedEquity:
                      property.equity || property.estimatedEquity,
                    equityPercent: property.equityPercent?.toString(),

                    // Mortgage
                    mtg1Amount: mortgageInfo.loanAmount || property.mtg1Amount,
                    mtg1LoanType:
                      mortgageInfo.loanType || property.mtg1LoanType,
                    mtg1Lender: mortgageInfo.lender || property.mtg1Lender,

                    // Owner info
                    owner1FirstName:
                      ownerInfo.owner1FirstName || property.owner1FirstName,
                    owner1LastName:
                      ownerInfo.owner1LastName || property.owner1LastName,
                    ownerType: ownerInfo.ownerType || property.ownerType,
                    ownerOccupied:
                      ownerInfo.ownerOccupied ?? property.ownerOccupied,
                    absenteeOwner: !(
                      ownerInfo.ownerOccupied ?? property.ownerOccupied
                    ),

                    // Distress flags
                    preForeclosure: property.preForeclosure || false,
                    foreclosure: property.foreclosure || false,
                    taxLien: property.taxLien || false,
                    taxDelinquent: property.taxDelinquent || false,
                    vacant: property.vacant || false,
                    highEquity:
                      (property.equityPercent &&
                        Number(property.equityPercent) >= 50) ||
                      property.highEquity ||
                      false,
                    freeClear: property.freeClear || false,

                    // Skip trace data
                    phone: skipTraceData?.phones?.[0] || null,
                    secondaryPhone: skipTraceData?.phones?.[1] || null,
                    email: skipTraceData?.emails?.[0] || null,
                    mailingAddress: skipTraceData?.mailingAddress || null,
                    firstName:
                      skipTraceData?.ownerName?.split(" ")[0] ||
                      ownerInfo.owner1FirstName,
                    lastName:
                      skipTraceData?.ownerName?.split(" ").slice(1).join(" ") ||
                      ownerInfo.owner1LastName,

                    // Status
                    enrichmentStatus: "completed",
                    enrichedAt: new Date(),
                    skipTracedAt: skipTraceData ? new Date() : null,
                    updatedAt: new Date(),
                  })
                  .where(eq(leads.id, lead.id));

                return {
                  success: true,
                  hasPhone: (skipTraceData?.phones?.length || 0) > 0,
                  hasEmail: (skipTraceData?.emails?.length || 0) > 0,
                };
              } catch (err: unknown) {
                const msg =
                  err instanceof Error ? err.message : "Unknown error";
                console.error(
                  `[Bucket Process] Error for ${lead.propertyId}:`,
                  msg,
                );

                // Mark as failed
                await db
                  .update(leads)
                  .set({
                    enrichmentStatus: "failed",
                    enrichmentError: msg,
                    updatedAt: new Date(),
                  })
                  .where(eq(leads.id, lead.id));

                return { success: false, error: msg };
              }
            },
          ),
        );

        // Aggregate results
        for (const r of batchResults) {
          results.processed++;
          if (r.success) {
            results.successful++;
            if (r.hasPhone) results.withPhones++;
            if (r.hasEmail) results.withEmails++;
          } else {
            results.failed++;
            if (r.error) results.errors.push(r.error);
          }
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < pendingLeads.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Update bucket progress
    const remainingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.bucketId, bucketId),
          eq(leads.enrichmentStatus, "pending"),
        ),
      );

    const remaining = remainingCount[0]?.count || 0;

    await db
      .update(buckets)
      .set({
        enrichedLeads: sql`${buckets.enrichedLeads} + ${results.successful}`,
        enrichmentStatus: remaining === 0 ? "completed" : "processing",
        enrichmentProgress: {
          total: bucket.totalLeads,
          processed: (bucket.enrichedLeads || 0) + results.processed,
          successful: (bucket.enrichedLeads || 0) + results.successful,
          failed: results.failed,
        },
        lastEnrichedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(buckets.id, bucketId));

    console.log(
      `[Bucket Process] Completed: ${results.successful}/${results.processed}, ${results.withPhones} with phones`,
    );

    return NextResponse.json({
      success: true,
      bucketId,
      bucketName: bucket.name,
      stats: {
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        withPhones: results.withPhones,
        withEmails: results.withEmails,
        remaining,
      },
      limits: {
        batchSize: BATCH_SIZE,
        microCampaignLimit: MICRO_CAMPAIGN_LIMIT,
        dailyLimit: DAILY_LIMIT,
      },
      errors:
        results.errors.length > 0 ? results.errors.slice(0, 10) : undefined,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Processing failed";
    console.error("[Bucket Process] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get processing status for a bucket
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get("id");

    if (!bucketId) {
      return NextResponse.json(
        { error: "Bucket ID required" },
        { status: 400 },
      );
    }

    const [bucket] = await db
      .select()
      .from(buckets)
      .where(eq(buckets.id, bucketId));

    if (!bucket) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    // Get detailed stats
    const stats = await db
      .select({
        pending: sql<number>`count(*) filter (where enrichment_status = 'pending')`,
        processing: sql<number>`count(*) filter (where enrichment_status = 'processing')`,
        completed: sql<number>`count(*) filter (where enrichment_status = 'completed')`,
        failed: sql<number>`count(*) filter (where enrichment_status = 'failed')`,
        withPhones: sql<number>`count(*) filter (where phone is not null)`,
        withEmails: sql<number>`count(*) filter (where email is not null)`,
        contacted: sql<number>`count(*) filter (where status != 'new')`,
      })
      .from(leads)
      .where(eq(leads.bucketId, bucketId));

    return NextResponse.json({
      success: true,
      bucket: {
        id: bucket.id,
        name: bucket.name,
        enrichmentStatus: bucket.enrichmentStatus,
        enrichmentProgress: bucket.enrichmentProgress,
      },
      stats: stats[0],
      limits: {
        batchSize: BATCH_SIZE,
        microCampaignLimit: MICRO_CAMPAIGN_LIMIT,
        dailyLimit: DAILY_LIMIT,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get status";
    console.error("[Bucket Process] Status error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
