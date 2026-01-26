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
    const type = searchParams.get("type") || "stats";

    if (!SIGNALHOUSE_API_KEY) {
      // Return mock data if API key not configured
      const mockStats = getMockStats(days);
      return NextResponse.json({
        success: true,
        stats: mockStats,
        analytics: {
          totalSent: mockStats.outboundSMS,
          totalDelivered: Math.floor(mockStats.outboundSMS * 0.97),
          totalFailed: mockStats.failedCount,
          deliveryRate: mockStats.deliveryRate,
          failureRate: mockStats.failureRate,
          uniqueClicks: mockStats.uniqueClicks,
          clickthroughRate: mockStats.clickthroughRate,
        },
        wallet: { balance: mockStats.balance, currency: "USD" },
        source: "mock",
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch analytics and wallet in parallel
    const [analyticsResponse, walletResponse] = await Promise.all([
      fetch(
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
      ),
      fetch(`${SIGNALHOUSE_API_URL}/v1/wallet/summary`, {
        headers: {
          "apiKey": SIGNALHOUSE_API_KEY,
          "authToken": SIGNALHOUSE_AUTH_TOKEN,
          "Content-Type": "application/json",
        },
      }),
    ]);

    // Get wallet data
    let wallet = { balance: 0, currency: "USD" };
    if (walletResponse.ok) {
      const walletData = await walletResponse.json();
      wallet = {
        balance: walletData.balance || walletData.data?.balance || 0,
        currency: walletData.currency || walletData.data?.currency || "USD",
      };
    } else {
      console.error("[SignalHouse Wallet] API error:", await walletResponse.text());
    }

    if (!analyticsResponse.ok) {
      // Fall back to mock data on API error but keep real wallet
      console.error(
        "[SignalHouse Analytics] API error:",
        await analyticsResponse.text(),
      );
      const mockStats = getMockStats(days);
      return NextResponse.json({
        success: true,
        stats: { ...mockStats, balance: wallet.balance },
        analytics: {
          totalSent: mockStats.outboundSMS,
          totalDelivered: Math.floor(mockStats.outboundSMS * 0.97),
          totalFailed: mockStats.failedCount,
          deliveryRate: mockStats.deliveryRate,
          failureRate: mockStats.failureRate,
          uniqueClicks: mockStats.uniqueClicks,
          clickthroughRate: mockStats.clickthroughRate,
        },
        wallet,
        source: "partial",
      });
    }

    const data = await analyticsResponse.json();

    // Transform SignalHouse response to our format
    const stats = {
      balance: wallet.balance,
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

    // Analytics object for SMSDashboard
    const analytics = {
      totalSent: data.outbound_sms || 0,
      totalDelivered: data.delivered_count || Math.floor((data.outbound_sms || 0) * (data.delivery_rate || 97) / 100),
      totalFailed: data.failed_count || 0,
      deliveryRate: data.delivery_rate || 0,
      failureRate: data.failure_rate || 0,
      uniqueClicks: data.unique_clicks || 0,
      clickthroughRate: data.clickthrough_rate || 0,
    };

    return NextResponse.json({
      success: true,
      stats,
      analytics,
      wallet,
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
