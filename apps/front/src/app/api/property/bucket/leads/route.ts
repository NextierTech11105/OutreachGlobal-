import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

/**
 * BUCKET LEADS API
 *
 * Fetch leads from a bucket with filtering options:
 * - needsApollo: Get leads that haven't been Apollo enriched yet
 * - needsSkipTrace: Get leads without phone numbers
 * - limit: Number of leads to return
 */

// GET - Fetch leads from a bucket
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get("bucketId");
    const limitParam = searchParams.get("limit");
    const needsApollo = searchParams.get("needsApollo") === "true";
    const needsSkipTrace = searchParams.get("needsSkipTrace") === "true";
    const enrichedOnly = searchParams.get("enrichedOnly") === "true";

    if (!bucketId) {
      return NextResponse.json({ error: "bucketId required" }, { status: 400 });
    }

    const limit = Math.min(parseInt(limitParam || "50"), 500);

    // Build query conditions
    const conditions = [eq(leads.bucketId, bucketId)];

    if (needsApollo) {
      // Leads that have been enriched (have property data) but no Apollo data
      conditions.push(eq(leads.enrichmentStatus, "completed"));
      conditions.push(isNull(leads.apolloEnrichedAt));
    }

    if (needsSkipTrace) {
      // Leads without phone numbers
      conditions.push(isNull(leads.phone));
    }

    if (enrichedOnly) {
      // Only fully enriched leads
      conditions.push(eq(leads.enrichmentStatus, "completed"));
    }

    const leadsData = await db
      .select({
        id: leads.id,
        propertyId: leads.propertyId,
        firstName: leads.firstName,
        lastName: leads.lastName,
        owner1FirstName: leads.owner1FirstName,
        owner1LastName: leads.owner1LastName,
        phone: leads.phone,
        email: leads.email,
        company: leads.company,
        enrichmentStatus: leads.enrichmentStatus,
        apolloEnrichedAt: leads.apolloEnrichedAt,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(and(...conditions))
      .limit(limit)
      .orderBy(sql`${leads.createdAt} ASC`);

    // Get total count for this filter
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      leads: leadsData,
      count: leadsData.length,
      totalMatching: countResult?.count || 0,
      filters: {
        bucketId,
        needsApollo,
        needsSkipTrace,
        enrichedOnly,
        limit,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch leads";
    console.error("[BucketLeads] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
