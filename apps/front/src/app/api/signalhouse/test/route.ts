import { NextRequest, NextResponse } from "next/server";

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = body.apiKey || process.env.SIGNALHOUSE_API_KEY;
    const authToken = body.authToken || process.env.SIGNALHOUSE_AUTH_TOKEN;

    if (!apiKey && !authToken) {
      return NextResponse.json(
        { error: "API key or auth token is required" },
        { status: 400 },
      );
    }

    // Build auth headers - try authToken (JWT) first, then apiKey
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authToken) {
      // JWT token auth (preferred)
      headers["authToken"] = authToken;
    }
    if (apiKey) {
      // API key auth (header name is "apiKey" per SignalHouse docs)
      headers["apiKey"] = apiKey;
    }

    // Test connection by getting wallet summary
    const response = await fetch(`${SIGNALHOUSE_API_BASE}/wallet/summary`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Invalid API key or connection failed";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return NextResponse.json(
        { error: errorMessage, status: response.status },
        { status: response.status },
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Connection successful",
      wallet: data,
    });
  } catch (error: unknown) {
    console.error("SignalHouse test connection error:", error);
    const message =
      error instanceof Error ? error.message : "Connection test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
