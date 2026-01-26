/**
 * SECTORS STATS API - Returns lead counts from database
 *
 * GET /api/sectors/stats
 * - Counts leads by pipeline status
 * - Returns total records, enriched, contacted
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { sql, count, eq, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      return NextResponse.json({
        sectors: {},
        totals: {
          totalRecords: 0,
          enriched: 0,
          contacted: 0,
          withPhone: 0,
          withMobile: 0,
          withEmail: 0,
        },
        pipeline: {
          raw: 0,
          skip_traced: 0,
          validated: 0,
          ready: 0,
          blocked: 0,
          sent: 0,
        },
        error: "Database not configured",
      });
    }

    // Get total counts
    const [totalResult] = await db
      .select({ count: count() })
      .from(leads);

    // Get counts by pipeline status
    const pipelineCounts = await db
      .select({
        status: leads.pipelineStatus,
        count: count(),
      })
      .from(leads)
      .groupBy(leads.pipelineStatus);

    // Get quality counts
    const [withPhoneResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(isNotNull(leads.phone));

    const [withMobileResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(isNotNull(leads.mobilePhone));

    const [withEmailResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(isNotNull(leads.email));

    // Get enriched count (skip_traced or higher)
    const [enrichedResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(
        sql`${leads.pipelineStatus} IN ('skip_traced', 'validated', 'ready', 'sent')`
      );

    // Get contacted/sent count
    const [contactedResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(eq(leads.pipelineStatus, "sent"));

    // Build pipeline stats
    const pipeline: Record<string, number> = {
      raw: 0,
      skip_traced: 0,
      validated: 0,
      ready: 0,
      blocked: 0,
      sent: 0,
    };

    pipelineCounts.forEach((row) => {
      if (row.status && row.status in pipeline) {
        pipeline[row.status] = row.count;
      } else if (row.status === "pending" || row.status === null) {
        pipeline.raw += row.count;
      }
    });

    return NextResponse.json({
      sectors: {
        all: {
          totalRecords: totalResult?.count || 0,
          enriched: enrichedResult?.count || 0,
          contacted: contactedResult?.count || 0,
        },
      },
      totals: {
        totalRecords: totalResult?.count || 0,
        enriched: enrichedResult?.count || 0,
        contacted: contactedResult?.count || 0,
        withPhone: withPhoneResult?.count || 0,
        withMobile: withMobileResult?.count || 0,
        withEmail: withEmailResult?.count || 0,
      },
      pipeline,
    });
  } catch (error) {
    console.error("[Sectors Stats] Error:", error);
    return NextResponse.json(
      {
        sectors: {},
        totals: {
          totalRecords: 0,
          enriched: 0,
          contacted: 0,
          withPhone: 0,
          withMobile: 0,
          withEmail: 0,
        },
        pipeline: {
          raw: 0,
          skip_traced: 0,
          validated: 0,
          ready: 0,
          blocked: 0,
          sent: 0,
        },
        error: error instanceof Error ? error.message : "Failed to get stats",
      },
      { status: 200 }
    );
  }
}
