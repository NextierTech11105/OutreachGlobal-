import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * INBOX STATS API
 * Returns message counts by status/direction from sms_messages table
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "7d";

    // Calculate date ranges
    let currentDaysBack = 7;
    if (timeRange === "24h") currentDaysBack = 1;
    if (timeRange === "7d") currentDaysBack = 7;
    if (timeRange === "30d") currentDaysBack = 30;

    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - currentDaysBack);

    const previousStart = new Date();
    previousStart.setDate(previousStart.getDate() - currentDaysBack * 2);

    // Get current period counts by status and direction
    const currentResult = await db.execute(sql`
      SELECT
        direction,
        status,
        COUNT(*) as count
      FROM sms_messages
      WHERE created_at >= ${currentStart.toISOString()}
      GROUP BY direction, status
    `);

    // Get previous period counts
    const previousResult = await db.execute(sql`
      SELECT
        direction,
        status,
        COUNT(*) as count
      FROM sms_messages
      WHERE created_at >= ${previousStart.toISOString()}
        AND created_at < ${currentStart.toISOString()}
      GROUP BY direction, status
    `);

    // Build stats
    let inboundCount = 0;
    let outboundCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;
    let prevInbound = 0;
    let prevOutbound = 0;

    // Process previous period
    if (previousResult.rows) {
      for (const row of previousResult.rows) {
        const direction = row.direction as string;
        const count = Number(row.count) || 0;
        if (direction === "inbound") prevInbound += count;
        else prevOutbound += count;
      }
    }

    // Process current period
    if (currentResult.rows) {
      for (const row of currentResult.rows) {
        const direction = row.direction as string;
        const status = row.status as string;
        const count = Number(row.count) || 0;

        if (direction === "inbound") {
          inboundCount += count;
        } else {
          outboundCount += count;
        }

        if (status === "delivered") deliveredCount += count;
        if (status === "failed" || status === "undelivered") failedCount += count;
      }
    }

    // Calculate changes
    const inboundChange = prevInbound === 0
      ? (inboundCount > 0 ? 100 : 0)
      : Math.round(((inboundCount - prevInbound) / prevInbound) * 100);

    const outboundChange = prevOutbound === 0
      ? (outboundCount > 0 ? 100 : 0)
      : Math.round(((outboundCount - prevOutbound) / prevOutbound) * 100);

    const totalMessages = inboundCount + outboundCount;
    const deliveryRate = outboundCount > 0
      ? Math.round((deliveredCount / outboundCount) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      stats: {
        inbound: inboundCount,
        outbound: outboundCount,
        delivered: deliveredCount,
        failed: failedCount,
        total: totalMessages,
      },
      changes: {
        inbound: inboundChange,
        outbound: outboundChange,
      },
      summary: {
        total: totalMessages,
        responses: inboundCount,
        sent: outboundCount,
        deliveryRate,
        responseRate: outboundCount > 0
          ? Math.round((inboundCount / outboundCount) * 100)
          : 0,
      },
      timeRange,
    });
  } catch (error) {
    console.error("[Inbox Stats] Error:", error);
    return NextResponse.json({
      success: true,
      stats: {
        inbound: 0,
        outbound: 0,
        delivered: 0,
        failed: 0,
        total: 0,
      },
      changes: {
        inbound: 0,
        outbound: 0,
      },
      summary: {
        total: 0,
        responses: 0,
        sent: 0,
        deliveryRate: 0,
        responseRate: 0,
      },
      timeRange: "7d",
    });
  }
}
