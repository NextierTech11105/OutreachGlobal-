import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buckets, leads } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * PROPERTY ID BUCKET API
 *
 * Manages property ID storage for economical batch processing:
 * - Save 800K+ property IDs from search (no credits)
 * - Track distress signals and filters
 * - On-demand enrichment in 2K campaign blocks
 * - Monitor field changes over time
 *
 * Workflow:
 * 1. POST /api/property/bucket - Create bucket with IDs
 * 2. GET /api/property/bucket?id=xxx - Get bucket details
 * 3. POST /api/property/bucket/process - Enrich 2K block
 */

// Bucket creation payload
interface CreateBucketPayload {
  name: string;
  description?: string;
  filters: Record<string, unknown>;
  propertyIds: string[];
  signals?: {
    preForeclosure: number;
    taxLien: number;
    highEquity: number;
    vacant: number;
    absenteeOwner: number;
    reverseMortgage: number;
  };
}

// POST - Create a new bucket with property IDs
export async function POST(request: NextRequest) {
  try {
    const payload: CreateBucketPayload = await request.json();
    const { name, description, filters, propertyIds, signals } = payload;

    if (!name || !propertyIds || propertyIds.length === 0) {
      return NextResponse.json(
        {
          error: "Bucket name and at least one property ID required",
        },
        { status: 400 },
      );
    }

    // For now, use a placeholder user ID (in prod, get from auth)
    const userId = "system";

    // Create the bucket
    const [bucket] = await db
      .insert(buckets)
      .values({
        userId,
        name,
        description: description || `${propertyIds.length} properties`,
        source: "real-estate",
        filters: {
          ...filters,
          signals,
          savedAt: new Date().toISOString(),
        },
        totalLeads: propertyIds.length,
        enrichedLeads: 0,
        queuedLeads: 0,
        contactedLeads: 0,
        enrichmentStatus: "pending",
        enrichmentProgress: {
          total: propertyIds.length,
          processed: 0,
          successful: 0,
          failed: 0,
        },
      })
      .returning();

    // Create lead records for each property ID (just IDs, no enrichment yet)
    // Batch insert for performance
    const BATCH_SIZE = 1000;
    let insertedCount = 0;

    for (let i = 0; i < propertyIds.length; i += BATCH_SIZE) {
      const batch = propertyIds.slice(i, i + BATCH_SIZE);

      await db.insert(leads).values(
        batch.map((propertyId) => ({
          bucketId: bucket.id,
          userId,
          source: "real-estate",
          status: "new",
          propertyId,
          enrichmentStatus: "pending",
        })),
      );

      insertedCount += batch.length;
    }

    console.log(
      `[Bucket] Created "${name}" with ${insertedCount} property IDs`,
    );

    return NextResponse.json({
      success: true,
      bucket: {
        id: bucket.id,
        name: bucket.name,
        description: bucket.description,
        totalLeads: propertyIds.length,
        enrichmentStatus: "pending",
        filters,
        signals,
      },
      stats: {
        inserted: insertedCount,
        total: propertyIds.length,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create bucket";
    console.error("[Bucket] Create error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - List buckets or get specific bucket
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get("id");
    const userId = "system"; // Placeholder

    if (bucketId) {
      // Get specific bucket with stats
      const [bucket] = await db
        .select()
        .from(buckets)
        .where(eq(buckets.id, bucketId));

      if (!bucket) {
        return NextResponse.json(
          { error: "Bucket not found" },
          { status: 404 },
        );
      }

      // Get lead stats
      const leadStats = await db
        .select({
          total: sql<number>`count(*)`,
          enriched: sql<number>`count(*) filter (where enrichment_status = 'completed')`,
          withPhones: sql<number>`count(*) filter (where phone is not null)`,
          contacted: sql<number>`count(*) filter (where status != 'new')`,
        })
        .from(leads)
        .where(eq(leads.bucketId, bucketId));

      return NextResponse.json({
        success: true,
        bucket: {
          ...bucket,
          stats: leadStats[0],
        },
      });
    }

    // List all buckets (don't filter by userId to show all system buckets)
    const allBuckets = await db
      .select({
        id: buckets.id,
        name: buckets.name,
        description: buckets.description,
        source: buckets.source,
        totalLeads: buckets.totalLeads,
        enrichedLeads: buckets.enrichedLeads,
        queuedLeads: buckets.queuedLeads,
        contactedLeads: buckets.contactedLeads,
        enrichmentStatus: buckets.enrichmentStatus,
        createdAt: buckets.createdAt,
        updatedAt: buckets.updatedAt,
      })
      .from(buckets)
      .orderBy(sql`${buckets.createdAt} DESC`)
      .limit(100);

    return NextResponse.json({
      success: true,
      buckets: allBuckets,
      count: allBuckets.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get buckets";
    console.error("[Bucket] Get error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update bucket (add more IDs, update metadata)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get("id");
    const payload = await request.json();
    const userId = "system";

    if (!bucketId) {
      return NextResponse.json(
        { error: "Bucket ID required" },
        { status: 400 },
      );
    }

    // Get existing bucket
    const [existing] = await db
      .select()
      .from(buckets)
      .where(eq(buckets.id, bucketId));

    if (!existing) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    // Add new property IDs if provided
    if (
      payload.propertyIds &&
      Array.isArray(payload.propertyIds) &&
      payload.propertyIds.length > 0
    ) {
      const BATCH_SIZE = 1000;
      let insertedCount = 0;

      for (let i = 0; i < payload.propertyIds.length; i += BATCH_SIZE) {
        const batch = payload.propertyIds.slice(i, i + BATCH_SIZE);

        await db.insert(leads).values(
          batch.map((propertyId: string) => ({
            bucketId,
            userId,
            source: "real-estate",
            status: "new",
            propertyId,
            enrichmentStatus: "pending",
          })),
        );

        insertedCount += batch.length;
      }

      // Update bucket total
      await db
        .update(buckets)
        .set({
          totalLeads: sql`${buckets.totalLeads} + ${insertedCount}`,
          updatedAt: new Date(),
        })
        .where(eq(buckets.id, bucketId));

      console.log(`[Bucket] Added ${insertedCount} IDs to "${existing.name}"`);
    }

    // Update metadata if provided
    if (payload.name || payload.description) {
      await db
        .update(buckets)
        .set({
          ...(payload.name && { name: payload.name }),
          ...(payload.description && { description: payload.description }),
          updatedAt: new Date(),
        })
        .where(eq(buckets.id, bucketId));
    }

    // Get updated bucket
    const [updated] = await db
      .select()
      .from(buckets)
      .where(eq(buckets.id, bucketId));

    return NextResponse.json({
      success: true,
      bucket: updated,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update bucket";
    console.error("[Bucket] Update error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Remove a bucket and all its leads
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get("id");

    if (!bucketId) {
      return NextResponse.json(
        { error: "Bucket ID required" },
        { status: 400 },
      );
    }

    // Get bucket info before deleting
    const [existing] = await db
      .select()
      .from(buckets)
      .where(eq(buckets.id, bucketId));

    if (!existing) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    // Delete bucket (leads are deleted via cascade)
    await db.delete(buckets).where(eq(buckets.id, bucketId));

    console.log(
      `[Bucket] Deleted "${existing.name}" with ${existing.totalLeads} leads`,
    );

    return NextResponse.json({
      success: true,
      deleted: {
        id: existing.id,
        name: existing.name,
        totalLeads: existing.totalLeads,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete bucket";
    console.error("[Bucket] Delete error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
