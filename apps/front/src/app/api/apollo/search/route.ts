import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";
const APOLLO_API_KEY = process.env.APOLLO_IO_API_KEY || process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY || process.env.APOLLO_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const {
      query,
      company,
      title,
      page = 1,
      perPage = 25,
    } = await request.json();

    if (!APOLLO_API_KEY) {
      return NextResponse.json(
        { error: "Apollo API key not configured" },
        { status: 400 },
      );
    }

    // Build search parameters
    const searchParams: Record<string, unknown> = {
      page,
      per_page: perPage,
    };

    if (query) {
      searchParams.q_keywords = query;
    }

    if (company) {
      searchParams.q_organization_name = company;
    }

    if (title) {
      searchParams.person_titles = [title];
    }

    const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify(searchParams),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Search failed" },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Transform results to consistent format
    const results = (data.people || []).map(
      (person: {
        id: string;
        first_name?: string;
        last_name?: string;
        name?: string;
        title?: string;
        organization?: { name?: string };
        email?: string;
        phone_numbers?: Array<{ sanitized_number?: string }>;
        city?: string;
        state?: string;
        country?: string;
      }) => ({
        id: person.id,
        name:
          person.name ||
          `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        title: person.title || "",
        company: person.organization?.name || "",
        email: person.email || "",
        phone: person.phone_numbers?.[0]?.sanitized_number || "",
        location: [person.city, person.state, person.country]
          .filter(Boolean)
          .join(", "),
      }),
    );

    return NextResponse.json({
      success: true,
      results,
      pagination: {
        page: data.pagination?.page || page,
        perPage: data.pagination?.per_page || perPage,
        total: data.pagination?.total_entries || 0,
      },
    });
  } catch (error: unknown) {
    console.error("Apollo search error:", error);
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
