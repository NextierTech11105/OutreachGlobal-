import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    // Verify the API key works by checking user info
    const response = await fetch(`${APOLLO_API_BASE}/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Invalid API key" },
        { status: response.status }
      );
    }

    // In a real implementation, save the API key to database
    // await db.settings.upsert({ key: 'APOLLO_API_KEY', value: apiKey });

    return NextResponse.json({
      success: true,
      message: "Apollo.io API key configured successfully",
    });
  } catch (error: unknown) {
    console.error("Apollo configure error:", error);
    const message = error instanceof Error ? error.message : "Configuration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
