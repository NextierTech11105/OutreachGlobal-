import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses, smsMessages, callLogs } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";
import { requireTenantContext } from "@/lib/api-auth";

/**
 * GET /api/reports/stats
 *
 * Returns real aggregated stats for the reports dashboard
 */
export async function GET() {
  try {
    const { userId } = await requireTenantContext();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get business/lead stats
    const businessStats = await db
      .select({
        total: sql<number>`count(*)`,
        totalLast30: sql<number>`count(*) filter (where ${businesses.createdAt} >= ${thirtyDaysAgo})`,
        totalPrevious30: sql<number>`count(*) filter (where ${businesses.createdAt} >= ${sixtyDaysAgo} and ${businesses.createdAt} < ${thirtyDaysAgo})`,
        smsReady: sql<number>`count(*) filter (where ${businesses.enrichmentStatus} = 'sms_ready')`,
        enriched: sql<number>`count(*) filter (where ${businesses.enrichmentStatus} = 'enriched')`,
        avgScore: sql<number>`round(avg(${businesses.score}))`,
      })
      .from(businesses)
      .where(eq(businesses.userId, userId));

    // Get SMS stats
    const smsStats = await db
      .select({
        total: sql<number>`count(*)`,
        totalLast30: sql<number>`count(*) filter (where ${smsMessages.createdAt} >= ${thirtyDaysAgo})`,
        delivered: sql<number>`count(*) filter (where ${smsMessages.status} = 'delivered')`,
        replies: sql<number>`count(*) filter (where ${smsMessages.direction} = 'inbound')`,
      })
      .from(smsMessages);

    // Get call stats
    const callStats = await db
      .select({
        total: sql<number>`count(*)`,
        totalLast30: sql<number>`count(*) filter (where ${callLogs.createdAt} >= ${thirtyDaysAgo})`,
        completed: sql<number>`count(*) filter (where ${callLogs.status} = 'completed')`,
        answered: sql<number>`count(*) filter (where ${callLogs.duration} > 0)`,
      })
      .from(callLogs);

    // Get booked leads as appointments proxy (leads with status 'booked')
    const bookedStats = await db
      .select({
        total: sql<number>`count(*) filter (where ${businesses.status} = 'booked')`,
      })
      .from(businesses)
      .where(eq(businesses.userId, userId));

    const business = businessStats[0] || {
      total: 0,
      totalLast30: 0,
      totalPrevious30: 0,
      smsReady: 0,
      enriched: 0,
      avgScore: 0,
    };
    const sms = smsStats[0] || {
      total: 0,
      totalLast30: 0,
      delivered: 0,
      replies: 0,
    };
    const calls = callStats[0] || {
      total: 0,
      totalLast30: 0,
      completed: 0,
      answered: 0,
    };
    const booked = bookedStats[0] || { total: 0 };

    // Calculate percentages
    const leadGrowth =
      business.totalPrevious30 > 0
        ? Math.round(
            ((business.totalLast30 - business.totalPrevious30) /
              business.totalPrevious30) *
              100,
          )
        : business.totalLast30 > 0
          ? 100
          : 0;

    const smsDeliveryRate =
      sms.total > 0 ? Math.round((sms.delivered / sms.total) * 100) : 0;

    const smsReplyRate =
      sms.total > 0 ? Math.round((sms.replies / sms.total) * 100) : 0;

    const callAnswerRate =
      calls.total > 0 ? Math.round((calls.answered / calls.total) * 100) : 0;

    // Calculate conversion rate (replies + booked / total outreach)
    const totalOutreach = Number(sms.total) + Number(calls.total);
    const totalConversions = Number(sms.replies) + Number(booked.total);
    const conversionRate =
      totalOutreach > 0
        ? Math.round((totalConversions / totalOutreach) * 100 * 10) / 10
        : 0;

    return NextResponse.json({
      success: true,
      stats: {
        leads: {
          total: Number(business.total) || 0,
          last30Days: Number(business.totalLast30) || 0,
          growthPercent: leadGrowth,
          smsReady: Number(business.smsReady) || 0,
          enriched: Number(business.enriched) || 0,
          avgScore: Number(business.avgScore) || 0,
        },
        sms: {
          total: Number(sms.total) || 0,
          last30Days: Number(sms.totalLast30) || 0,
          delivered: Number(sms.delivered) || 0,
          replies: Number(sms.replies) || 0,
          deliveryRate: smsDeliveryRate,
          replyRate: smsReplyRate,
        },
        calls: {
          total: Number(calls.total) || 0,
          last30Days: Number(calls.totalLast30) || 0,
          completed: Number(calls.completed) || 0,
          answered: Number(calls.answered) || 0,
          answerRate: callAnswerRate,
        },
        appointments: {
          total: Number(booked.total) || 0,
          last30Days: 0,
          upcoming: 0,
        },
        conversion: {
          rate: conversionRate,
          totalOutreach,
          totalConversions,
        },
      },
    });
  } catch (error) {
    console.error("[Reports Stats API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 },
    );
  }
}
