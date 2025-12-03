import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";

interface ContactToEnrich {
  email?: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  domain?: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.APOLLO_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Apollo API key not configured" },
        { status: 400 }
      );
    }

    const { contacts } = await request.json() as { contacts: ContactToEnrich[] };

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "Contacts array is required" },
        { status: 400 }
      );
    }

    // Apollo bulk enrichment endpoint
    const response = await fetch(`${APOLLO_API_BASE}/people/bulk_match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        details: contacts.map((c) => ({
          email: c.email,
          first_name: c.first_name,
          last_name: c.last_name,
          organization_name: c.organization_name,
          domain: c.domain,
        })),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Bulk enrichment failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform results
    const results = (data.matches || []).map((match: any, index: number) => ({
      id: match.id || `match-${index}`,
      original: contacts[index],
      enriched: match
        ? {
            name: `${match.first_name || ""} ${match.last_name || ""}`.trim(),
            email: match.email,
            title: match.title,
            company: match.organization?.name,
            phone: match.phone_numbers?.[0]?.sanitized_number,
            linkedin: match.linkedin_url,
            location: `${match.city || ""}, ${match.state || ""}`.trim(),
          }
        : null,
      status: match ? "found" : "not_found",
    }));

    return NextResponse.json({
      success: true,
      total: contacts.length,
      matched: results.filter((r: any) => r.status === "found").length,
      results,
    });
  } catch (error: unknown) {
    console.error("Apollo bulk enrich error:", error);
    const message =
      error instanceof Error ? error.message : "Bulk enrichment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
