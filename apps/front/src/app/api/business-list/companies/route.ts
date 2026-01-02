/**
 * Business List Companies API
 *
 * Search for companies/contacts via Apollo.io
 * Used by the import-companies page
 */

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
      name, // Search query (company/person name)
      state, // Array of states ["FL", "TX"]
      industry, // Array of industries
      city, // Array of cities
      revenueMin,
      revenueMax,
      page = 1,
      per_page = 25,
    } = body;

    // Build Apollo search parameters
    const searchParams: Record<string, unknown> = {
      page,
      per_page,
    };

    // Search by name/keyword
    if (name) {
      searchParams.q_keywords = name;
    }

    // Filter by state (Apollo uses person_locations format)
    if (state?.length) {
      searchParams.person_locations = state.map(
        (s: string) => `United States, ${s}`,
      );
    }

    // Filter by industry
    if (industry?.length) {
      // Apollo uses industry tags, but we can also search by keywords
      searchParams.q_organization_keyword_tags = industry;
    }

    // Filter by city
    if (city?.length) {
      // Add city to locations filter
      if (state?.length) {
        searchParams.person_locations = state.flatMap((s: string) =>
          city.map((c: string) => `${c}, ${s}, United States`),
        );
      } else {
        searchParams.person_locations = city.map(
          (c: string) => `${c}, United States`,
        );
      }
    }

    // Revenue filters (Apollo uses revenue_range)
    if (revenueMin !== undefined || revenueMax !== undefined) {
      const ranges: string[] = [];
      // Apollo revenue ranges: "0-1M", "1M-10M", "10M-50M", "50M-100M", "100M-500M", "500M-1B", "1B+"
      if (revenueMin !== undefined && revenueMax !== undefined) {
        if (revenueMax <= 1000000) ranges.push("0-1M");
        else if (revenueMax <= 10000000) ranges.push("1M-10M", "0-1M");
        else if (revenueMax <= 50000000)
          ranges.push("10M-50M", "1M-10M", "0-1M");
        else if (revenueMax <= 100000000)
          ranges.push("50M-100M", "10M-50M", "1M-10M", "0-1M");
        else ranges.push("100M-500M", "50M-100M", "10M-50M", "1M-10M", "0-1M");
      }
      if (ranges.length > 0) {
        searchParams.organization_revenue_ranges = ranges;
      }
    }

    // Search people with organization data
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
      console.error(
        "Apollo companies search error:",
        response.status,
        errorData,
      );
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

    // Transform Apollo results to match page expected format
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
      const personCity = org?.city || person.city || null;
      const personState = org?.state || person.state || null;
      const zip = org?.postal_code || null;

      // Get industry
      const personIndustry =
        org?.industry || (org?.industries && org.industries[0]) || null;

      return {
        id: person.id,
        name:
          person.name ||
          `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        firstName: person.first_name || null,
        lastName: person.last_name || null,
        title: person.title || null,
        email: person.email || null,
        phone,
        mobile:
          phones.find((p) => p.type === "mobile")?.sanitized_number || null,
        address,
        city: personCity,
        state: personState,
        zip,
        country: org?.country || person.country || "United States",
        // Page expects 'company' field which maps to 'companyName' on frontend
        company: org?.name || null,
        domain:
          org?.primary_domain ||
          org?.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ||
          null,
        website: org?.website_url || null,
        employees: org?.estimated_num_employees || null,
        industry: personIndustry,
        revenue: org?.annual_revenue || null,
        linkedin_url: person.linkedin_url || null,
        source: "apollo" as const,
        sourceLabel: "Apollo.io",
      };
    });

    return NextResponse.json({
      hits,
      estimatedTotalHits: data.pagination?.total_entries || hits.length,
      page: data.pagination?.page || page,
      totalPages: data.pagination?.total_pages || 1,
    });
  } catch (error: unknown) {
    console.error("Business list companies error:", error);
    return NextResponse.json(
      { error: "Search failed", hits: [], estimatedTotalHits: 0 },
      { status: 200 },
    );
  }
}
