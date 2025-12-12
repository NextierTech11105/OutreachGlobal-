import { NextRequest, NextResponse } from "next/server";

/**
 * Apollo.io Enrichment API
 *
 * On-demand business contact enrichment from Apollo.io
 * Gets: LinkedIn, company info, tech stack, verified emails, revenue data
 *
 * Usage:
 *   POST /api/enrichment/apollo
 *   Body: { recordId, bucketId, email?, companyName?, firstName?, lastName?, linkedinUrl? }
 *
 * Docs: See docs/APOLLO_BUSINESS_ADVISOR_COOKBOOK.md
 */

const APOLLO_API_URL = "https://api.apollo.io/v1/people/match";
const APOLLO_API_KEY = process.env.APOLLO_IO_API_KEY || process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY || process.env.APOLLO_API_KEY || "";

interface ApolloEnrichRequest {
  recordId: string;
  bucketId: string;
  email?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  linkedinUrl?: string;
  domain?: string;
}

interface ApolloPersonMatch {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  linkedin_url: string;
  title: string;
  email_status: string;
  email: string;
  organization_id: string;
  organization: {
    id: string;
    name: string;
    website_url: string;
    linkedin_url: string;
    founded_year: number;
    estimated_num_employees: number;
    industry: string;
    keywords: string[];
    phone: string;
    city: string;
    state: string;
    country: string;
    short_description: string;
    annual_revenue: number;
    total_funding: number;
    technologies: string[];
  };
  seniority: string;
  departments: string[];
  phone_numbers: Array<{ raw_number: string; type: string }>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ApolloEnrichRequest = await request.json();
    const {
      recordId,
      bucketId,
      email,
      companyName,
      firstName,
      lastName,
      linkedinUrl,
      domain,
    } = body;

    // Validate required fields
    if (!recordId || !bucketId) {
      return NextResponse.json(
        { error: "recordId and bucketId are required" },
        { status: 400 },
      );
    }

    // Need at least one identifier for Apollo match
    if (
      !email &&
      !linkedinUrl &&
      !(firstName && lastName && (companyName || domain))
    ) {
      return NextResponse.json(
        {
          error:
            "Need email, linkedinUrl, or (firstName + lastName + companyName/domain)",
          hint: "Provide at least one strong identifier for matching",
        },
        { status: 400 },
      );
    }

    // Check API key
    if (!APOLLO_API_KEY) {
      console.warn("[Apollo] APOLLO_API_KEY not configured");
      return NextResponse.json(
        {
          error: "Apollo API not configured",
          hint: "Set APOLLO_API_KEY environment variable",
        },
        { status: 503 },
      );
    }

    console.log(
      `[Apollo] Enriching record ${recordId} from bucket ${bucketId}`,
    );

    // Build Apollo match request
    const matchRequest: Record<string, string | undefined> = {};
    if (email) matchRequest.email = email;
    if (linkedinUrl) matchRequest.linkedin_url = linkedinUrl;
    if (firstName) matchRequest.first_name = firstName;
    if (lastName) matchRequest.last_name = lastName;
    if (companyName) matchRequest.organization_name = companyName;
    if (domain) matchRequest.domain = domain;

    // Call Apollo API
    const response = await fetch(APOLLO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify(matchRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Apollo] API error: ${response.status} - ${errorText}`);

      if (response.status === 401) {
        return NextResponse.json(
          { error: "Invalid Apollo API key" },
          { status: 401 },
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: "Apollo rate limited" },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { error: `Apollo enrichment failed: ${response.status}` },
        { status: response.status },
      );
    }

    const result = await response.json();
    const person: ApolloPersonMatch | null = result.person;

    if (!person) {
      return NextResponse.json({
        success: false,
        recordId,
        bucketId,
        error: "No match found in Apollo",
        matchedWith: matchRequest,
      });
    }

    const org = person.organization;

    // Calculate business age
    const yearsInBusiness = org?.founded_year
      ? new Date().getFullYear() - org.founded_year
      : null;

    // Determine revenue tier
    let revenueTier = "unknown";
    const revenue = org?.annual_revenue || 0;
    if (revenue < 500000) revenueTier = "startup";
    else if (revenue < 2500000) revenueTier = "main-street";
    else if (revenue < 10000000) revenueTier = "growth";
    else if (revenue < 50000000) revenueTier = "established";
    else revenueTier = "enterprise";

    console.log(
      `[Apollo] Match found for ${recordId}: ${person.name} @ ${org?.name}`,
    );

    return NextResponse.json({
      success: true,
      recordId,
      bucketId,
      enrichedData: {
        apolloEnriched: true,
        apolloEnrichedAt: new Date().toISOString(),
        apolloId: person.id,

        // Person data
        firstName: person.first_name,
        lastName: person.last_name,
        fullName: person.name,
        title: person.title,
        seniority: person.seniority,
        departments: person.departments,
        linkedinUrl: person.linkedin_url,
        email: person.email,
        emailStatus: person.email_status,
        phones: person.phone_numbers?.map((p) => p.raw_number) || [],

        // Organization data
        organization: org
          ? {
              id: org.id,
              name: org.name,
              website: org.website_url,
              linkedinUrl: org.linkedin_url,
              foundedYear: org.founded_year,
              yearsInBusiness,
              employees: org.estimated_num_employees,
              industry: org.industry,
              keywords: org.keywords,
              phone: org.phone,
              location: {
                city: org.city,
                state: org.state,
                country: org.country,
              },
              description: org.short_description,
              annualRevenue: org.annual_revenue,
              revenueTier,
              totalFunding: org.total_funding,
              technologies: org.technologies,
            }
          : null,

        // Flags for filtering
        flags: {
          hasVerifiedEmail: person.email_status === "verified",
          hasLinkedin: !!person.linkedin_url,
          isOwnerOrCLevel: ["owner", "founder", "c_suite"].includes(
            person.seniority?.toLowerCase() || "",
          ),
          isMainStreet: ["main-street", "growth"].includes(revenueTier),
          isEstablished: yearsInBusiness !== null && yearsInBusiness >= 5,
        },
      },
    });
  } catch (error) {
    console.error("[Apollo] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Apollo enrichment failed",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check Apollo status
export async function GET(): Promise<NextResponse> {
  if (!APOLLO_API_KEY) {
    return NextResponse.json({
      configured: false,
      message: "APOLLO_API_KEY not set",
    });
  }

  return NextResponse.json({
    configured: true,
    endpoint: "POST /api/enrichment/apollo",
    matchingFields: ["email", "linkedinUrl", "firstName+lastName+companyName"],
    enrichmentData: [
      "verified email",
      "linkedin profile",
      "job title & seniority",
      "company info (revenue, employees, tech stack)",
      "phone numbers",
    ],
    documentation: "/docs/APOLLO_BUSINESS_ADVISOR_COOKBOOK.md",
  });
}
