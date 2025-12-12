import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";
const APOLLO_API_KEY = process.env.APOLLO_IO_API_KEY || process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY || process.env.APOLLO_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    if (!APOLLO_API_KEY) {
      return NextResponse.json(
        {
          error: "Apollo API key not configured",
          hits: [],
          estimatedTotalHits: 0,
        },
        { status: 200 },
      );
    }

    const body = await request.json();
    const {
      searchQuery,
      state,
      title,
      company_name,
      company_domain,
      industry,
    } = body;

    // Build Apollo search parameters
    const searchParams: Record<string, unknown> = {
      page: 1,
      per_page: 25,
    };

    if (searchQuery) {
      searchParams.q_keywords = searchQuery;
    }

    if (title?.length) {
      searchParams.person_titles = title;
    }

    if (company_name?.length) {
      searchParams.q_organization_name = company_name[0];
    }

    if (company_domain?.length) {
      searchParams.organization_domains = company_domain;
    }

    if (industry?.length) {
      searchParams.organization_industry_tag_ids = industry;
    }

    if (state?.length) {
      searchParams.person_locations = state.map(
        (s: string) => `United States, ${s}`,
      );
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
      console.error("Apollo search error:", errorData);
      return NextResponse.json(
        {
          error: errorData.message || "Search failed",
          hits: [],
          estimatedTotalHits: 0,
        },
        { status: 200 },
      );
    }

    const data = await response.json();

    // Transform Apollo results to match expected format
    const hits = (data.people || []).map(
      (person: {
        id: string;
        first_name?: string;
        last_name?: string;
        name?: string;
        title?: string;
        email?: string;
        phone_numbers?: Array<{ sanitized_number?: string }>;
        city?: string;
        state?: string;
        country?: string;
        organization?: {
          name?: string;
          website_url?: string;
          estimated_num_employees?: number;
          industry?: string;
          annual_revenue?: number;
        };
        linkedin_url?: string;
      }) => ({
        id: person.id,
        name:
          person.name ||
          `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        title: person.title || null,
        email: person.email || null,
        phone: person.phone_numbers?.[0]?.sanitized_number || null,
        address: null,
        city: person.city || null,
        state: person.state || null,
        company_name: person.organization?.name || null,
        company_domain:
          person.organization?.website_url
            ?.replace(/^https?:\/\//, "")
            .replace(/\/$/, "") || null,
        employees: person.organization?.estimated_num_employees || null,
        industry: person.organization?.industry || null,
        revenue: person.organization?.annual_revenue
          ? person.organization.annual_revenue * 100
          : null,
        linkedin_url: person.linkedin_url || null,
      }),
    );

    return NextResponse.json({
      hits,
      estimatedTotalHits: data.pagination?.total_entries || hits.length,
    });
  } catch (error: unknown) {
    console.error("Business list search error:", error);
    return NextResponse.json(
      { error: "Search failed", hits: [], estimatedTotalHits: 0 },
      { status: 200 },
    );
  }
}
