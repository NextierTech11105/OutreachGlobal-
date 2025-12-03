import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";

// Check if Apollo is configured via env vars
export async function GET() {
  const apiKey = process.env.APOLLO_API_KEY;
  const configured = !!apiKey;

  if (!configured) {
    return NextResponse.json({ configured: false });
  }

  // Fetch usage stats from Apollo
  try {
    const response = await fetch(`${APOLLO_API_BASE}/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        configured: true,
        usage: {
          credits_used: data.credits_used || 0,
          credits_remaining: data.credits_remaining || data.organization?.available_credits || 0,
          searches_this_month: 0,
          enrichments_this_month: 0,
        },
      });
    }
  } catch (error) {
    console.error("Apollo status check error:", error);
  }

  return NextResponse.json({ configured: true });
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    // Test connection by doing a minimal search
    const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({ page: 1, per_page: 1 }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Invalid API key" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Connection successful",
      usage: {
        credits_used: 0,
        credits_remaining: data.pagination?.total_entries || 0,
      },
    });
  } catch (error: unknown) {
    console.error("Apollo test connection error:", error);
    const message = error instanceof Error ? error.message : "Connection test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
