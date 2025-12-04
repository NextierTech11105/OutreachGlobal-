import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";
const APOLLO_API_KEY = process.env.APOLLO_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    if (!APOLLO_API_KEY) {
      return NextResponse.json(
        { error: "Apollo API key not configured", hits: [], estimatedTotalHits: 0 },
        { status: 200 }
      );
    }

    const body = await request.json();
    const { name, state, industry, city } = body;

    // Build Apollo organization search parameters
    const searchParams: Record<string, unknown> = {
      page: 1,
      per_page: 25,
    };

    if (name) {
      searchParams.q_organization_name = name;
    }

    if (industry?.length) {
      // Apollo uses q_organization_keyword_tags for industry keywords
      searchParams.q_organization_keyword_tags = industry;
    }

    if (state?.length) {
      searchParams.organization_locations = state.map((s: string) => `United States, ${s}`);
    }

    if (city?.length) {
      // Combine city with state if available
      const cityLocations = city.map((c: string) => {
        if (state?.length) {
          return `${c}, ${state[0]}, United States`;
        }
        return `${c}, United States`;
      });
      searchParams.organization_locations = [
        ...(searchParams.organization_locations as string[] || []),
        ...cityLocations,
      ];
    }

    const response = await fetch(`${APOLLO_API_BASE}/mixed_companies/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify(searchParams),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Apollo company search error:", errorData);
      return NextResponse.json(
        { error: errorData.message || "Company search failed", hits: [], estimatedTotalHits: 0 },
        { status: 200 }
      );
    }

    const data = await response.json();

    // Transform Apollo organization results to match expected Company format
    const hits = (data.organizations || data.accounts || []).map((org: {
      id: string;
      name?: string;
      website_url?: string;
      primary_domain?: string;
      industry?: string;
      estimated_num_employees?: number;
      annual_revenue?: number;
      city?: string;
      state?: string;
      country?: string;
      phone?: string;
      linkedin_url?: string;
      founded_year?: number;
    }) => ({
      id: org.id,
      name: org.name || "",
      domain: org.primary_domain || org.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "",
      website: org.website_url || "",
      industry: org.industry || "",
      employees: org.estimated_num_employees || 0,
      revenue: org.annual_revenue ? org.annual_revenue * 100 : 0,
      city: org.city || "",
      state: org.state || "",
      country: org.country || "United States",
      phone: org.phone || "",
      linkedin_url: org.linkedin_url || "",
      founded_year: org.founded_year || 0,
    }));

    return NextResponse.json({
      hits,
      estimatedTotalHits: data.pagination?.total_entries || hits.length,
    });
  } catch (error: unknown) {
    console.error("Business list companies search error:", error);
    return NextResponse.json(
      { error: "Company search failed", hits: [], estimatedTotalHits: 0 },
      { status: 200 }
    );
  }
}
