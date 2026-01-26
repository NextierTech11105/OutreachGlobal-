/**
 * SMS QUEUE STATS API
 *
 * GET /api/sms/queue/stats
 * Returns SMS stats for dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getDashboardAnalytics, isConfigured } from "@/lib/signalhouse/client";

export async function GET(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json({
        sentToday: 0,
        scheduledToday: 0,
        activeSequences: 0,
        queueSize: 0,
        error: "SignalHouse not configured",
      });
    }

    // Get real stats from SignalHouse
    const analytics = await getDashboardAnalytics();

    if (analytics.success && analytics.data) {
      return NextResponse.json({
        sentToday: analytics.data.totalSent || 0,
        scheduledToday: 0, // Would need separate tracking
        activeSequences: 0, // Would need separate tracking
        queueSize: 0, // Would need separate tracking
        delivered: analytics.data.totalDelivered || 0,
        failed: analytics.data.totalFailed || 0,
        balance: analytics.data.balance || 0,
      });
    }

    return NextResponse.json({
      sentToday: 0,
      scheduledToday: 0,
      activeSequences: 0,
      queueSize: 0,
    });
  } catch (error) {
    console.error("[SMS Stats] Error:", error);
    return NextResponse.json({
      sentToday: 0,
      scheduledToday: 0,
      activeSequences: 0,
      queueSize: 0,
      error: error instanceof Error ? error.message : "Failed to get stats",
    });
  }
}
