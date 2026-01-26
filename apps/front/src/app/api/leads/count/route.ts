/**
 * Leads Count API - Get count and preview for bulk operations
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { leads, teams } from "@/lib/db/schema";
import { eq, and, or, sql, not, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") || "all";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 2000);

    // Check if user is team owner - owners can see all leads
    let isOwner = false;
    if (teamId) {
      const teamResult = await db
        .select({ ownerId: teams.ownerId })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
      isOwner = teamResult[0]?.ownerId === userId;
    }

    // Build query based on source
    // For team owners or if no teamId match: show all leads with phones
    // For regular members: filter by teamId
    let whereConditions: ReturnType<typeof eq>[] = [
      isNotNull(leads.phone),
      not(eq(leads.status, "opted_out")),
    ];

    // Only filter by teamId for non-owners
    if (teamId && !isOwner) {
      whereConditions.push(eq(leads.teamId, teamId));
    }

    // Add source-specific filters
    switch (source) {
      case "responded":
        // GREEN tag - leads who responded
        whereConditions.push(sql`'responded' = ANY(tags)`);
        break;
      case "gold":
        // GOLD label - email + mobile captured
        whereConditions.push(sql`'gold_label' = ANY(tags)`);
        break;
      case "hot":
        whereConditions.push(eq(leads.status, "hot_lead"));
        break;
      case "warm":
        whereConditions.push(
          or(eq(leads.status, "warm"), eq(leads.status, "interested"))!
        );
        break;
      case "ready":
        whereConditions.push(eq(leads.pipelineStatus, "ready"));
        break;
      case "validated":
        whereConditions.push(eq(leads.pipelineStatus, "validated"));
        break;
      case "all":
        // All active leads with phone
        break;
      default:
        break;
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(...whereConditions));

    const totalCount = countResult[0]?.count || 0;

    // Get preview leads (first 5 for preview)
    const preview = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        phone: leads.phone,
        company: leads.company,
      })
      .from(leads)
      .where(and(...whereConditions))
      .limit(5);

    // Return count capped at limit
    const effectiveCount = Math.min(totalCount, limit);

    return NextResponse.json({
      success: true,
      count: effectiveCount,
      totalAvailable: totalCount,
      source,
      limit,
      preview,
    });
  } catch (error) {
    console.error("[Leads Count] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Count failed" },
      { status: 500 }
    );
  }
}
