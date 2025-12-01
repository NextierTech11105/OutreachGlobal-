import { NextRequest, NextResponse } from "next/server";

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io/api/v1";

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    // Verify the API key works by getting user info
    const response = await fetch(`${SIGNALHOUSE_API_BASE}/user/info`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Invalid API key" },
        { status: response.status }
      );
    }

    // In a real implementation, you would save the API key to your database
    // or environment configuration. For now, we just verify it works.

    // You could save to a settings table:
    // await db.settings.upsert({ key: 'SIGNALHOUSE_API_KEY', value: apiKey });

    return NextResponse.json({
      success: true,
      message: "SignalHouse API key configured successfully",
    });
  } catch (error: unknown) {
    console.error("SignalHouse configure error:", error);
    const message = error instanceof Error ? error.message : "Configuration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
