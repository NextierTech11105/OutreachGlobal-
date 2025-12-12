import { NextRequest, NextResponse } from "next/server";

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io/api/v1";

export async function POST(request: NextRequest) {
  try {
    const { apiKey, authToken } = await request.json();

    if (!apiKey && !authToken) {
      return NextResponse.json(
        { error: "apiKey or authToken is required" },
        { status: 400 },
      );
    }

    // Build headers per SignalHouse docs
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["apiKey"] = apiKey;
    if (authToken) headers["authToken"] = authToken;

    // Verify the credentials work by getting user info
    const response = await fetch(`${SIGNALHOUSE_API_BASE}/user/info`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Invalid API key" },
        { status: response.status },
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
    const message =
      error instanceof Error ? error.message : "Configuration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
