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

    // Test connection by getting user info
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
        { error: errorData.message || "Invalid API key or connection failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Connection successful",
      user: data,
    });
  } catch (error: unknown) {
    console.error("SignalHouse test connection error:", error);
    const message = error instanceof Error ? error.message : "Connection test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
