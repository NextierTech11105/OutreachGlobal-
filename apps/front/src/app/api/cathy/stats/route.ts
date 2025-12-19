import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  leads,
  smsMessages,
  campaignAttempts,
} from "@/lib/db/schema";
import { count, eq, sql, and, or, gte, isNull, desc } from "drizzle-orm";

/**
 * Cathy (The Nudger) Stats Endpoint
 * CONNECTED TO: DigitalOcean Managed PostgreSQL
 * Queries real data for nudge/follow-up statistics
 */

// Nudge contexts in campaignAttempts
const NUDGE_CONTEXTS = ["follow_up", "retarget", "nurture", "ghost"];

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Database not configured", database: "not_connected" },
        { status: 500 }
      );
    }

    // Get total nudge attempts (follow-up, retarget, nurture campaigns)
    const nudgeAttemptsResult = await db
      .select({ count: count() })
      .from(campaignAttempts)
      .where(
        or(
          eq(campaignAttempts.campaignContext, "follow_up"),
          eq(campaignAttempts.campaignContext, "retarget"),
          eq(campaignAttempts.campaignContext, "nurture"),
          eq(campaignAttempts.campaignContext, "ghost")
        )
      )
      .catch(() => [{ count: 0 }]);

    // Get nudge responses (follow-up attempts that got responses)
    const nudgeResponsesResult = await db
      .select({ count: count() })
      .from(campaignAttempts)
      .where(
        and(
          or(
            eq(campaignAttempts.campaignContext, "follow_up"),
            eq(campaignAttempts.campaignContext, "retarget"),
            eq(campaignAttempts.campaignContext, "nurture"),
            eq(campaignAttempts.campaignContext, "ghost")
          ),
          eq(campaignAttempts.responseReceived, true)
        )
      )
      .catch(() => [{ count: 0 }]);

    // Get leads in nudge queue (contacted but no response, not contacted recently)
    // These are leads with status 'contacted' or have campaign attempts but no response
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const leadsInQueueResult = await db
      .select({ count: count() })
      .from(leads)
      .where(
        and(
          eq(leads.status, "contacted"),
          or(
            isNull(leads.updatedAt),
            sql`${leads.updatedAt} < ${oneDayAgo}`
          )
        )
      )
      .catch(() => [{ count: 0 }]);

    // Get stats by campaign context for sequences
    const contextStatsResult = await db
      .select({
        context: campaignAttempts.campaignContext,
        total: count(),
        responses: sql<number>`SUM(CASE WHEN ${campaignAttempts.responseReceived} = true THEN 1 ELSE 0 END)`,
      })
      .from(campaignAttempts)
      .where(
        or(
          eq(campaignAttempts.campaignContext, "follow_up"),
          eq(campaignAttempts.campaignContext, "retarget"),
          eq(campaignAttempts.campaignContext, "nurture"),
          eq(campaignAttempts.campaignContext, "ghost")
        )
      )
      .groupBy(campaignAttempts.campaignContext)
      .catch(() => []);

    // Get recent nudge activity
    const recentNudges = await db
      .select({
        id: campaignAttempts.id,
        context: campaignAttempts.campaignContext,
        leadId: campaignAttempts.leadId,
        status: campaignAttempts.status,
        responseReceived: campaignAttempts.responseReceived,
        createdAt: campaignAttempts.createdAt,
      })
      .from(campaignAttempts)
      .where(
        or(
          eq(campaignAttempts.campaignContext, "follow_up"),
          eq(campaignAttempts.campaignContext, "retarget"),
          eq(campaignAttempts.campaignContext, "nurture"),
          eq(campaignAttempts.campaignContext, "ghost")
        )
      )
      .orderBy(desc(campaignAttempts.createdAt))
      .limit(10)
      .catch(() => []);

    // Get nudges sent today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayNudgesResult = await db
      .select({ count: count() })
      .from(campaignAttempts)
      .where(
        and(
          or(
            eq(campaignAttempts.campaignContext, "follow_up"),
            eq(campaignAttempts.campaignContext, "retarget"),
            eq(campaignAttempts.campaignContext, "nurture"),
            eq(campaignAttempts.campaignContext, "ghost")
          ),
          gte(campaignAttempts.createdAt, todayStart)
        )
      )
      .catch(() => [{ count: 0 }]);

    // Calculate totals
    const totalNudgesSent = Number(nudgeAttemptsResult[0]?.count || 0);
    const totalResponses = Number(nudgeResponsesResult[0]?.count || 0);
    const leadsInQueue = Number(leadsInQueueResult[0]?.count || 0);
    const todayNudges = Number(todayNudgesResult[0]?.count || 0);
    const responseRate = totalNudgesSent > 0
      ? ((totalResponses / totalNudgesSent) * 100).toFixed(1)
      : "0.0";

    // Build sequence stats from context data
    const sequenceStats = contextStatsResult.map((stat) => ({
      context: stat.context,
      nudgesSent: Number(stat.total || 0),
      responses: Number(stat.responses || 0),
      responseRate: stat.total > 0
        ? ((Number(stat.responses || 0) / Number(stat.total)) * 100).toFixed(1)
        : "0.0",
    }));

    return NextResponse.json({
      success: true,
      database: "postgresql",
      stats: {
        // Main dashboard stats
        leadsInQueue,
        totalNudgesSent,
        totalResponses,
        responseRate: parseFloat(responseRate),
        todayNudges,

        // Sequence-level breakdown
        sequenceStats,

        // For template stats - we'd need a templates table
        // For now, derive from SMS data
        templateStats: [],
      },
      recentActivity: recentNudges.map((nudge) => ({
        id: String(nudge.id),
        type: `Nudge: ${nudge.context}`,
        leadId: nudge.leadId,
        status: nudge.status,
        gotResponse: nudge.responseReceived,
        time: nudge.createdAt.toISOString(),
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cathy stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Cathy stats",
        database: "error",
        stats: {
          leadsInQueue: 0,
          totalNudgesSent: 0,
          totalResponses: 0,
          responseRate: 0,
          todayNudges: 0,
          sequenceStats: [],
          templateStats: [],
        },
        recentActivity: [],
      },
      { status: 500 }
    );
  }
}
