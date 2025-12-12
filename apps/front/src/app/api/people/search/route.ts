import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";
const APOLLO_API_KEY = process.env.APOLLO_IO_API_KEY || process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY || process.env.APOLLO_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids, email, domain, name, company, reveal_personal_emails = true, reveal_phone_number = true } = body;

    if (!APOLLO_API_KEY) {
      return NextResponse.json(
        { error: "Apollo API key not configured" },
        { status: 500 },
      );
    }

    // If ID provided, treat it as an email or domain to search
    const searchEmail = email || (id && id.includes("@") ? id : undefined);
    const searchDomain = domain || (id && !id.includes("@") ? id : undefined);

    if (!searchEmail && !searchDomain && !name && !company) {
      return NextResponse.json(
        { error: "Email, domain, name, or company required" },
        { status: 400 },
      );
    }

    // Build Apollo search parameters
    // reveal_personal_emails and reveal_phone_number cost credits but return real contact data
    const searchParams: Record<string, unknown> = {
      page: 1,
      per_page: 10,
      reveal_personal_emails,
      reveal_phone_number,
    };

    if (searchEmail) {
      searchParams.email = searchEmail;
    }

    if (searchDomain) {
      searchParams.organization_domains = [searchDomain];
    }

    if (name) {
      searchParams.q_keywords = name;
    }

    if (company) {
      searchParams.q_organization_name = company;
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
        { error: errorData.message || "People search failed", success: false },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Transform results
    const people = (data.people || []).map(
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
        };
        linkedin_url?: string;
      }) => ({
        id: person.id,
        name:
          person.name ||
          `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        firstName: person.first_name,
        lastName: person.last_name,
        title: person.title,
        email: person.email,
        phone: person.phone_numbers?.[0]?.sanitized_number,
        phones:
          person.phone_numbers
            ?.map((p) => p.sanitized_number)
            .filter(Boolean) || [],
        city: person.city,
        state: person.state,
        country: person.country,
        company: person.organization?.name,
        companyDomain: person.organization?.website_url
          ?.replace(/^https?:\/\//, "")
          .replace(/\/$/, ""),
        industry: person.organization?.industry,
        linkedinUrl: person.linkedin_url,
      }),
    );

    return NextResponse.json({
      success: true,
      data: people.length === 1 ? people[0] : people,
      count: people.length,
      total: data.pagination?.total_entries || people.length,
    });
  } catch (error: unknown) {
    console.error("People search error:", error);
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 },
    );
  }
}
