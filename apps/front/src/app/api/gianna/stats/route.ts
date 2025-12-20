import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages, campaignAttempts } from "@/lib/db/schema";
import { count, eq, sql, and, or, gte, isNull, desc } from "drizzle-orm";

/**
 * GIANNA (The Opener) Stats Endpoint
 * Queries real data for initial outreach statistics
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured", database: "not_connected" },
        { status: 500 }
      );
    }

    // Get total initial messages sent
    const initialAttemptsResult = await db
      .select({ count: count() })
      .from(campaignAttempts)
      .where(
        and(
          teamId ? eq(campaignAttempts.teamId, teamId) : sql`true`,
          or(
            eq(campaignAttempts.campaignContext, "initial"),
            eq(campaignAttempts.campaignContext, "cold_outreach"),
            isNull(campaignAttempts.campaignContext)
          )
        )
      )
      .catch(() => [{ count: 0 }]);

    // Get responses to initial outreach
    const responsesResult = await db
      .select({ count: count() })
      .from(campaignAttempts)
      .where(
        and(
          teamId ? eq(campaignAttempts.teamId, teamId) : sql`true`,
          or(
            eq(campaignAttempts.campaignContext, "initial"),
            eq(campaignAttempts.campaignContext, "cold_outreach"),
            isNull(campaignAttempts.campaignContext)
          ),
          eq(campaignAttempts.responseReceived, true)
        )
      )
      .catch(() => [{ count: 0 }]);

    // Get emails captured (leads with email)
    const emailsCapturedResult = await db
      .select({ count: count() })
      .from(leads)
      .where(
        and(
          teamId ? eq(leads.teamId, teamId) : sql`true`,
          sql`${leads.email} IS NOT NULL AND ${leads.email} != ''`
        )
      )
      .catch(() => [{ count: 0 }]);

    // Get handoffs to SABRINA (interested leads)
    const handedToSabrinaResult = await db
      .select({ count: count() })
      .from(leads)
      .where(
        and(
          teamId ? eq(leads.teamId, teamId) : sql`true`,
          eq(leads.status, "qualified")
        )
      )
      .catch(() => [{ count: 0 }]);

    // Get handoffs to CATHY (no response leads)
    const handedToCathyResult = await db
      .select({ count: count() })
      .from(leads)
      .where(
        and(
          teamId ? eq(leads.teamId, teamId) : sql`true`,
          eq(leads.status, "contacted")
        )
      )
      .catch(() => [{ count: 0 }]);

    // Get opt-outs
    const optOutsResult = await db
      .select({ count: count() })
      .from(leads)
      .where(
        and(
          teamId ? eq(leads.teamId, teamId) : sql`true`,
          eq(leads.status, "unsubscribed")
        )
      )
      .catch(() => [{ count: 0 }]);

    // Calculate stats
    const totalSent = Number(initialAttemptsResult[0]?.count || 0);
    const responses = Number(responsesResult[0]?.count || 0);
    const emailsCaptured = Number(emailsCapturedResult[0]?.count || 0);
    const handedToSabrina = Number(handedToSabrinaResult[0]?.count || 0);
    const handedToCathy = Number(handedToCathyResult[0]?.count || 0);
    const optOuts = Number(optOutsResult[0]?.count || 0);
    const avgResponseRate = totalSent > 0 ? (responses / totalSent) * 100 : 0;

    return NextResponse.json({
      success: true,
      database: "postgresql",
      stats: {
        totalSent,
        responses,
        emailsCaptured,
        handedToSabrina,
        handedToCathy,
        optOuts,
        avgResponseRate,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GIANNA stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
        database: "error",
        stats: {
          totalSent: 0,
          responses: 0,
          emailsCaptured: 0,
          handedToSabrina: 0,
          handedToCathy: 0,
          optOuts: 0,
          avgResponseRate: 0,
        },
      },
      { status: 500 }
    );
  }
}
