import { NextRequest, NextResponse } from "next/server";

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io/api/v1";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SIGNALHOUSE_AUTH_TOKEN = process.env.SIGNALHOUSE_AUTH_TOKEN || "";

// Build auth headers per SignalHouse docs
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (SIGNALHOUSE_API_KEY) headers["apiKey"] = SIGNALHOUSE_API_KEY;
  if (SIGNALHOUSE_AUTH_TOKEN) headers["authToken"] = SIGNALHOUSE_AUTH_TOKEN;
  return headers;
}

export async function GET(request: NextRequest) {
  try {
    if (!SIGNALHOUSE_API_KEY && !SIGNALHOUSE_AUTH_TOKEN) {
      return NextResponse.json(
        { error: "SignalHouse credentials not configured" },
        { status: 400 }
      );
    }

    // Get dashboard analytics
    const analyticsResponse = await fetch(
      `${SIGNALHOUSE_API_BASE}/analytics/dashboardAnalytics`,
      {
        method: "GET",
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
