import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";
const APOLLO_API_KEY =
  process.env.APOLLO_IO_API_KEY ||
  process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY ||
  process.env.APOLLO_API_KEY ||
  "";

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

    // Apollo.io requires api_key in the request body, NOT in headers
    const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...searchParams,
        api_key: APOLLO_API_KEY,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Apollo search error:", response.status, errorData);
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
    interface ApolloPerson {
      id: string;
      first_name?: string;
      last_name?: string;
      name?: string;
      title?: string;
      email?: string;
      phone_numbers?: Array<{
        sanitized_number?: string;
        raw_number?: string;
        type?: string;
      }>;
      city?: string;
      state?: string;
      country?: string;
      organization?: {
        name?: string;
        website_url?: string;
        primary_domain?: string;
        estimated_num_employees?: number;
        industry?: string;
        industries?: string[];
        annual_revenue?: number;
        street_address?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
        raw_address?: string;
        phone?: string;
        sanitized_phone?: string;
      };
      linkedin_url?: string;
    }

    const hits = (data.people || []).map((person: ApolloPerson) => {
      const org = person.organization;
      // Get phone - try org phone first, then person phones
      const phones = person.phone_numbers || [];
      const phone =
        phones.find((p) => p.type === "work_direct" || p.type === "work")
          ?.sanitized_number ||
        org?.sanitized_phone ||
        org?.phone ||
        phones[0]?.sanitized_number ||
        phones[0]?.raw_number ||
        null;

      // Get address from organization
      const address = org?.street_address || org?.raw_address || null;
      const city = org?.city || person.city || null;
      const state = org?.state || person.state || null;
      const zip = org?.postal_code || null;

      // Get industry
      const industry =
        org?.industry || (org?.industries && org.industries[0]) || null;

      return {
        id: person.id,
        name:
          person.name ||
          `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        title: person.title || null,
        email: person.email || null,
        phone,
        address,
        city,
        state,
        zip,
        company_name: org?.name || null,
        company_domain:
          org?.primary_domain ||
          org?.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ||
          null,
        employees: org?.estimated_num_employees || null,
        industry,
        revenue: org?.annual_revenue ? org.annual_revenue * 100 : null,
        linkedin_url: person.linkedin_url || null,
      };
    });

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
