import { NextRequest, NextResponse } from "next/server";

/**
 * SIGNALHOUSE ANALYTICS API
 * ═══════════════════════════════════════════════════════════════════════════════
 * Fetches analytics data from SignalHouse.io API
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const SIGNALHOUSE_API_URL =
  process.env.SIGNALHOUSE_API_URL || "https://api.signalhouse.io";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SIGNALHOUSE_AUTH_TOKEN = process.env.SIGNALHOUSE_AUTH_TOKEN || "";
const SIGNALHOUSE_SUB_GROUP_ID = process.env.SIGNALHOUSE_SUB_GROUP_ID || "";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);

    if (!SIGNALHOUSE_API_KEY) {
      // Return mock data if API key not configured
      return NextResponse.json({
        success: true,
        stats: getMockStats(days),
        source: "mock",
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch from SignalHouse API
    const response = await fetch(
      `${SIGNALHOUSE_API_URL}/v1/analytics?` +
        new URLSearchParams({
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          sub_group_id: SIGNALHOUSE_SUB_GROUP_ID,
        }),
      {
        headers: {
          "apiKey": SIGNALHOUSE_API_KEY,
          "authToken": SIGNALHOUSE_AUTH_TOKEN,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      // Fall back to mock data on API error
      console.error(
        "[SignalHouse Analytics] API error:",
        await response.text(),
      );
      return NextResponse.json({
        success: true,
        stats: getMockStats(days),
        source: "mock",
      });
    }

    const data = await response.json();

    // Transform SignalHouse response to our format
    const stats = {
      balance: data.balance || 0,
      outboundSMS: data.outbound_sms || 0,
      outboundMMS: data.outbound_mms || 0,
      inboundSMS: data.inbound_sms || 0,
      inboundMMS: data.inbound_mms || 0,
      deliveryRate: data.delivery_rate || 0,
      optOutRate: data.opt_out_rate || 0,
      responseRate: calculateResponseRate(
        data.inbound_sms || 0,
        data.outbound_sms || 0,
      ),
      failedCount: data.failed_count || 0,
      failureRate: data.failure_rate || 0,
      uniqueClicks: data.unique_clicks || 0,
      clickthroughRate: data.clickthrough_rate || 0,
      avgMessagesPerDay: Math.round(
        (data.outbound_sms || 0) / Math.max(1, days),
      ),
      totalSegments: data.total_segments || 0,
    };

    return NextResponse.json({
      success: true,
      stats,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      source: "api",
    });
  } catch (error) {
    console.error("[SignalHouse Analytics] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function calculateResponseRate(inbound: number, outbound: number): number {
  if (outbound === 0) return 0;
  return Math.round((inbound / outbound) * 1000) / 10;
}

function getMockStats(days: number) {
  const baseOutbound = days * 2000;
  const responseRate = 15;
  const deliveryRate = 97;

  return {
    balance: 94.5,
    outboundSMS: baseOutbound,
    outboundMMS: Math.floor(baseOutbound * 0.02),
    inboundSMS: Math.floor(baseOutbound * (responseRate / 100)),
    inboundMMS: Math.floor(baseOutbound * 0.005),
    deliveryRate,
    optOutRate: 0.5,
    responseRate,
    failedCount: Math.floor(baseOutbound * 0.03),
    failureRate: 3,
    uniqueClicks: Math.floor(baseOutbound * 0.05),
    clickthroughRate: 5,
    avgMessagesPerDay: 2000,
    totalSegments: Math.floor(baseOutbound * 1.1),
  };
}
