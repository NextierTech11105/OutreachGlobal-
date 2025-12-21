/**
 * Business List Companies API
 *
 * Searches Apollo.io for companies and contacts based on filters.
 * This powers the Import Companies and B2B Admin pages.
 */
import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";
const APOLLO_API_KEY =
  process.env.APOLLO_IO_API_KEY ||
  process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY ||
  process.env.APOLLO_API_KEY ||
  "";

// Pushbutton Business List API (fallback)
const PUSHBUTTON_API_URL =
  process.env.BUSINESS_LIST_API_URL || "https://api.pushbuttonbusinesslist.com";
const PUSHBUTTON_API_KEY = process.env.BUSINESS_LIST_API_KEY || "";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("per_page") || "25");
  const state = searchParams.get("state");
  const city = searchParams.get("city");
  const name = searchParams.get("name");

  // Build search params for Apollo
  const apolloParams: Record<string, unknown> = {
    page,
    per_page: pageSize,
  };

  if (name) apolloParams.q_organization_name = name;
  if (state) apolloParams.organization_locations = [`United States, ${state}`];
  if (city) apolloParams.organization_locations = [`${city}, United States`];

  try {
    const result = await searchApollo(apolloParams, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Business List GET] Error:", error);
    return NextResponse.json({
      hits: [],
      estimatedTotalHits: 0,
      page,
      total_pages: 0,
      error: error instanceof Error ? error.message : "Search failed",
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      state,
      city,
      industry,
      title,
      page = 1,
      per_page = 25,
    } = body;

    // Build Apollo search parameters
    const apolloParams: Record<string, unknown> = {
      page,
      per_page,
    };

    // Company/organization filters
    if (name) apolloParams.q_organization_name = name;

    // Location filters
    if (state?.length) {
      apolloParams.organization_locations = state.map(
        (s: string) => `United States, ${s}`,
      );
    }
    if (city?.length) {
      apolloParams.organization_locations = city.map(
        (c: string) => `${c}, United States`,
      );
    }

    // Industry filter
    if (industry?.length) {
      apolloParams.organization_industry_tag_ids = industry;
    }

    // Title filter (for people search)
    if (title?.length) {
      apolloParams.person_titles = title;
    }

    const result = await searchApollo(apolloParams, page, per_page);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Business List POST] Error:", error);
    return NextResponse.json({
      hits: [],
      estimatedTotalHits: 0,
      page: 1,
      total_pages: 0,
      error: error instanceof Error ? error.message : "Search failed",
    });
  }
}

interface ApolloOrganization {
  id: string;
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
  phone?: string;
  sanitized_phone?: string;
  linkedin_url?: string;
  founded_year?: number;
}

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
  organization?: ApolloOrganization;
  linkedin_url?: string;
}

async function searchApollo(
  params: Record<string, unknown>,
  page: number,
  perPage: number,
) {
  if (!APOLLO_API_KEY) {
    console.warn("[Business List] No Apollo API key configured");
    return {
      hits: [],
      estimatedTotalHits: 0,
      page,
      total_pages: 0,
      error: "Apollo API key not configured",
    };
  }

  try {
    // Try mixed_people search first (gets both people and companies)
    const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...params,
        api_key: APOLLO_API_KEY,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Apollo] Search error:", response.status, errorData);

      // Try organization search as fallback
      return await searchApolloOrganizations(params, page, perPage);
    }

    const data = await response.json();
    const totalHits = data.pagination?.total_entries || 0;
    const totalPages = Math.ceil(totalHits / perPage);

    // Transform Apollo people results
    const hits = (data.people || []).map((person: ApolloPerson) => {
      const org = person.organization;
      const phones = person.phone_numbers || [];
      const phone =
        phones.find((p) => p.type === "work_direct" || p.type === "work")
          ?.sanitized_number ||
        org?.sanitized_phone ||
        org?.phone ||
        phones[0]?.sanitized_number ||
        null;

      return {
        id: person.id,
        name:
          person.name ||
          `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        firstName: person.first_name || "",
        lastName: person.last_name || "",
        title: person.title || "",
        company: org?.name || "",
        domain: org?.primary_domain || "",
        website: org?.website_url || "",
        industry: org?.industry || (org?.industries && org.industries[0]) || "",
        employees: org?.estimated_num_employees || null,
        revenue: org?.annual_revenue || null,
        address: org?.street_address || "",
        city: org?.city || person.city || "",
        state: org?.state || person.state || "",
        zip: org?.postal_code || "",
        country: org?.country || person.country || "US",
        phone,
        email: person.email || "",
        linkedin_url: person.linkedin_url || org?.linkedin_url || "",
        source: "apollo" as const,
        sourceLabel: "Apollo.io",
      };
    });

    return {
      hits,
      estimatedTotalHits: totalHits,
      page,
      total_pages: totalPages,
    };
  } catch (error) {
    console.error("[Apollo] Search exception:", error);
    throw error;
  }
}

async function searchApolloOrganizations(
  params: Record<string, unknown>,
  page: number,
  perPage: number,
) {
  try {
    const response = await fetch(`${APOLLO_API_BASE}/mixed_companies/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...params,
        api_key: APOLLO_API_KEY,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        "[Apollo] Organization search error:",
        response.status,
        errorData,
      );
      return {
        hits: [],
        estimatedTotalHits: 0,
        page,
        total_pages: 0,
        error: errorData.message || "Organization search failed",
      };
    }

    const data = await response.json();
    const totalHits = data.pagination?.total_entries || 0;
    const totalPages = Math.ceil(totalHits / perPage);

    // Transform Apollo organization results
    const hits = (data.organizations || data.accounts || []).map(
      (org: ApolloOrganization) => ({
        id: org.id,
        name: org.name || "",
        firstName: "",
        lastName: "",
        title: "",
        company: org.name || "",
        domain: org.primary_domain || "",
        website: org.website_url || "",
        industry: org.industry || (org.industries && org.industries[0]) || "",
        employees: org.estimated_num_employees || null,
        revenue: org.annual_revenue || null,
        address: org.street_address || "",
        city: org.city || "",
        state: org.state || "",
        zip: org.postal_code || "",
        country: org.country || "US",
        phone: org.sanitized_phone || org.phone || "",
        email: org.primary_domain ? `info@${org.primary_domain}` : "",
        linkedin_url: org.linkedin_url || "",
        source: "apollo" as const,
        sourceLabel: "Apollo.io",
      }),
    );

    return {
      hits,
      estimatedTotalHits: totalHits,
      page,
      total_pages: totalPages,
    };
  } catch (error) {
    console.error("[Apollo] Organization search exception:", error);
    return {
      hits: [],
      estimatedTotalHits: 0,
      page,
      total_pages: 0,
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}
