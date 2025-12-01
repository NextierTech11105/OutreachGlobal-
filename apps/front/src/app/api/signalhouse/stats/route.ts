import { NextRequest, NextResponse } from "next/server";

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io/api/v1";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";

export async function GET(request: NextRequest) {
  try {
    if (!SIGNALHOUSE_API_KEY) {
      return NextResponse.json(
        { error: "SignalHouse API key not configured" },
        { status: 400 }
      );
    }

    // Get dashboard analytics
    const analyticsResponse = await fetch(
      `${SIGNALHOUSE_API_BASE}/analytics/dashboardAnalytics`,
      {
        method: "GET",
        headers: {
          "x-api-key": SIGNALHOUSE_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!analyticsResponse.ok) {
      const errorData = await analyticsResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Failed to fetch analytics" },
        { status: analyticsResponse.status }
      );
    }

    const analytics = await analyticsResponse.json();

    // Get wallet/usage summary
    const walletResponse = await fetch(
      `${SIGNALHOUSE_API_BASE}/wallet/summary`,
      {
        method: "GET",
        headers: {
          "x-api-key": SIGNALHOUSE_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    let walletData = null;
    if (walletResponse.ok) {
      walletData = await walletResponse.json();
    }

    return NextResponse.json({
      success: true,
      analytics,
      wallet: walletData,
    });
  } catch (error: unknown) {
    console.error("SignalHouse stats error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
