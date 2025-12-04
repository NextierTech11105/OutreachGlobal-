import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";

// Check if Apollo is configured via env vars
export async function GET() {
  const apiKey = process.env.APOLLO_API_KEY;
  const configured = !!apiKey;

  if (!configured) {
    return NextResponse.json({ configured: false });
  }

  // Fetch usage stats from Apollo using their credit info endpoint
  try {
    // First try /users/me for basic info
    const meResponse = await fetch(`${APOLLO_API_BASE}/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
    });

    if (meResponse.ok) {
      const meData = await meResponse.json();

      // Apollo returns credits info in different places depending on plan
      const creditsUsed = meData.credits_used || meData.organization?.credits_used || 0;
      const creditsRemaining = meData.credits_remaining ||
                               meData.organization?.credits_remaining ||
                               meData.organization?.available_credits ||
                               meData.team?.credits_remaining || 0;

      // Try to get more detailed usage stats
      let searchCount = 0;
      let enrichCount = 0;

      // Some Apollo plans expose usage stats
      if (meData.usage) {
        searchCount = meData.usage.searches || meData.usage.search_count || 0;
        enrichCount = meData.usage.enrichments || meData.usage.enrich_count || 0;
      }

      return NextResponse.json({
        configured: true,
        usage: {
          credits_used: creditsUsed,
          credits_remaining: creditsRemaining,
          searches_this_month: searchCount,
          enrichments_this_month: enrichCount,
        },
        user: {
          email: meData.email,
          name: meData.name || `${meData.first_name || ""} ${meData.last_name || ""}`.trim(),
          organization: meData.organization?.name || meData.team?.name,
        },
      });
    } else {
      const errorText = await meResponse.text();
      console.error("Apollo /users/me failed:", meResponse.status, errorText);
    }
  } catch (error) {
    console.error("Apollo status check error:", error);
  }

  // Return configured but no usage data if we couldn't fetch it
  return NextResponse.json({
    configured: true,
    usage: {
      credits_used: 0,
      credits_remaining: 0,
      searches_this_month: 0,
      enrichments_this_month: 0,
    },
  });
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
