import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * APOLLO.IO ENRICHMENT API
 *
 * Bulk enrichment for people and organizations:
 * - People: Up to 10 per request via bulk_match
 * - Organizations: Up to 10 per request via bulk_enrich
 *
 * Options:
 * - reveal_personal_emails: true - Get personal emails
 * - reveal_phone_number: true - Get phone numbers
 */

const APOLLO_API_KEY = process.env.APOLLO_IO_API_KEY || process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY || process.env.APOLLO_API_KEY || "";
const APOLLO_PEOPLE_URL = "https://api.apollo.io/api/v1/people/bulk_match";
const APOLLO_PEOPLE_SINGLE_URL = "https://api.apollo.io/api/v1/people/match";
const APOLLO_ORG_URL = "https://api.apollo.io/api/v1/organizations/bulk_enrich";

// Apollo limits 10 per bulk request
const BULK_LIMIT = 10;

interface PersonMatch {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  organization_name?: string;
  domain?: string;
  linkedin_url?: string;
  reveal_personal_emails?: boolean;
  reveal_phone_number?: boolean;
}

interface OrgEnrich {
  domain?: string;
  name?: string;
}

interface ApolloPersonResult {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  email_status?: string;
  personal_emails?: string[];
  phone_numbers?: Array<{
    raw_number?: string;
    sanitized_number?: string;
    type?: string;
    position?: number;
    status?: string;
  }>;
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    industry?: string;
    estimated_num_employees?: number;
  };
  title?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface ApolloOrgResult {
  id?: string;
  name?: string;
  website_url?: string;
  industry?: string;
  estimated_num_employees?: number;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedin_url?: string;
}

// Bulk enrich people (max 10 per request)
async function bulkEnrichPeople(
  people: PersonMatch[],
  options: { revealEmails?: boolean; revealPhones?: boolean } = {},
): Promise<ApolloPersonResult[]> {
  if (!APOLLO_API_KEY) {
    throw new Error("APOLLO_API_KEY not configured");
  }

  const results: ApolloPersonResult[] = [];

  // Process in chunks of 10
  for (let i = 0; i < people.length; i += BULK_LIMIT) {
    const chunk = people.slice(i, i + BULK_LIMIT);

    // Add reveal options to each person
    const details = chunk.map((person) => ({
      ...person,
      reveal_personal_emails: options.revealEmails ?? true,
      reveal_phone_number: options.revealPhones ?? true,
    }));

    try {
      const response = await fetch(APOLLO_PEOPLE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": APOLLO_API_KEY,
        },
        body: JSON.stringify({ details }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`[Apollo] People bulk_match failed:`, error);
        // Add nulls for failed chunk
        for (let j = 0; j < chunk.length; j++) {
          results.push({} as ApolloPersonResult);
        }
        continue;
      }

      const data = await response.json();
      const matches = data.matches || [];

      results.push(...matches);
    } catch (err) {
      console.error(`[Apollo] People bulk_match error:`, err);
      // Add nulls for failed chunk
      for (let j = 0; j < chunk.length; j++) {
        results.push({} as ApolloPersonResult);
      }
    }

    // Small delay between chunks to avoid rate limits
    if (i + BULK_LIMIT < people.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}

// Bulk enrich organizations (max 10 per request)
async function bulkEnrichOrgs(orgs: OrgEnrich[]): Promise<ApolloOrgResult[]> {
  if (!APOLLO_API_KEY) {
    throw new Error("APOLLO_API_KEY not configured");
  }

  const results: ApolloOrgResult[] = [];

  // Process in chunks of 10
  for (let i = 0; i < orgs.length; i += BULK_LIMIT) {
    const chunk = orgs.slice(i, i + BULK_LIMIT);

    try {
      const response = await fetch(APOLLO_ORG_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": APOLLO_API_KEY,
        },
        body: JSON.stringify({
          domains: chunk.map((o) => o.domain).filter(Boolean),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`[Apollo] Org bulk_enrich failed:`, error);
        continue;
      }

      const data = await response.json();
      const organizations = data.organizations || [];

      results.push(...organizations);
    } catch (err) {
      console.error(`[Apollo] Org bulk_enrich error:`, err);
    }

    // Small delay between chunks
    if (i + BULK_LIMIT < orgs.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}

// Single person enrichment (original behavior)
async function enrichSinglePerson(params: {
  email?: string;
  domain?: string;
  firstName?: string;
  lastName?: string;
  revealEmails?: boolean;
  revealPhones?: boolean;
}): Promise<ApolloPersonResult | null> {
  if (!APOLLO_API_KEY) {
    throw new Error("APOLLO_API_KEY not configured");
  }

  const response = await fetch(APOLLO_PEOPLE_SINGLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": APOLLO_API_KEY,
    },
    body: JSON.stringify({
      email: params.email,
      domain: params.domain,
      first_name: params.firstName,
      last_name: params.lastName,
      reveal_personal_emails: params.revealEmails ?? true,
      reveal_phone_number: params.revealPhones ?? true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorMsg = error.message || error.error || `Apollo API returned ${response.status}`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.person || null;
}

// POST - Enrich leads with Apollo data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check for bulk mode
    if (body.leadIds && Array.isArray(body.leadIds)) {
      return handleBulkEnrichment(body);
    }

    // Single person enrichment (original behavior)
    const { email, domain, firstName, lastName, revealEmails, revealPhones } =
      body;

    if (!APOLLO_API_KEY) {
      return NextResponse.json(
        { error: "Apollo API key not configured" },
        { status: 400 },
      );
    }

    if (!email && !domain && !firstName && !lastName) {
      return NextResponse.json(
        { error: "Email, domain, or name is required for enrichment" },
        { status: 400 },
      );
    }

    const person = await enrichSinglePerson({
      email,
      domain,
      firstName,
      lastName,
      revealEmails,
      revealPhones,
    });

    if (!person) {
      return NextResponse.json({
        success: true,
        result: {
          id: crypto.randomUUID(),
          name: "Unknown",
          email: email || "",
          title: "",
          company: "",
          phone: "",
          linkedin: "",
          status: "not_found",
          enrichedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      result: {
        id: person.id,
        name:
          person.name ||
          `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        email: person.email || email || "",
        personalEmails: person.personal_emails || [],
        title: person.title || "",
        company: person.organization?.name || "",
        phone: person.phone_numbers?.[0]?.sanitized_number || "",
        phones:
          person.phone_numbers
            ?.map((p) => p.sanitized_number || p.raw_number)
            .filter(Boolean) || [],
        linkedin: person.linkedin_url || "",
        status: "found",
        enrichedAt: new Date().toISOString(),
      },
      raw: person,
    });
  } catch (error: unknown) {
    console.error("Apollo enrich error:", error);
    const message =
      error instanceof Error ? error.message : "Enrichment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Handle bulk enrichment of leads
async function handleBulkEnrichment(body: {
  leadIds: string[];
  type?: "people" | "organizations";
  revealEmails?: boolean;
  revealPhones?: boolean;
  updateDb?: boolean;
}) {
  const {
    leadIds,
    type = "people",
    revealEmails = true,
    revealPhones = true,
    updateDb = true,
  } = body;

  if (!APOLLO_API_KEY) {
    return NextResponse.json(
      { error: "APOLLO_API_KEY not configured" },
      { status: 500 },
    );
  }

  // Fetch leads from database
  const leadsData = await db
    .select()
    .from(leads)
    .where(inArray(leads.id, leadIds));

  if (leadsData.length === 0) {
    return NextResponse.json({ error: "No leads found" }, { status: 404 });
  }

  console.log(`[Apollo] Enriching ${leadsData.length} leads (type: ${type})`);

  const results = {
    total: leadsData.length,
    enriched: 0,
    withPhones: 0,
    withEmails: 0,
    failed: 0,
    errors: [] as string[],
  };

  if (type === "people") {
    // Build person match requests
    const people: (PersonMatch & { leadId: string })[] = leadsData.map(
      (lead) => ({
        leadId: lead.id,
        first_name: lead.firstName || lead.owner1FirstName || undefined,
        last_name: lead.lastName || lead.owner1LastName || undefined,
        name:
          lead.firstName && lead.lastName
            ? `${lead.firstName} ${lead.lastName}`
            : lead.owner1FirstName && lead.owner1LastName
              ? `${lead.owner1FirstName} ${lead.owner1LastName}`
              : undefined,
      }),
    );

    // Filter out people without names
    const validPeople = people.filter(
      (p) => p.first_name || p.last_name || p.name,
    );

    if (validPeople.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No leads with valid names to enrich",
        results,
      });
    }

    // Bulk enrich
    const apolloResults = await bulkEnrichPeople(validPeople, {
      revealEmails,
      revealPhones,
    });

    // Map results back to leads and update database
    for (let i = 0; i < validPeople.length; i++) {
      const lead = validPeople[i];
      const apolloData = apolloResults[i];

      if (!apolloData || !apolloData.id) {
        results.failed++;
        continue;
      }

      results.enriched++;

      // Extract phones
      const phones =
        apolloData.phone_numbers
          ?.filter((p) => p.sanitized_number || p.raw_number)
          .map((p) => p.sanitized_number || p.raw_number || "") || [];

      // Extract emails
      const emails = [
        apolloData.email,
        ...(apolloData.personal_emails || []),
      ].filter(Boolean) as string[];

      if (phones.length > 0) results.withPhones++;
      if (emails.length > 0) results.withEmails++;

      // Update lead in database
      if (updateDb) {
        try {
          await db
            .update(leads)
            .set({
              // Contact info from Apollo
              phone: phones[0] || null,
              secondaryPhone: phones[1] || null,
              email: emails[0] || null,

              // Person info
              firstName: apolloData.first_name || null,
              lastName: apolloData.last_name || null,

              // Apollo-specific fields from schema
              apolloPersonId: apolloData.id || null,
              apolloTitle: apolloData.title || null,
              apolloCompany: apolloData.organization?.name || null,
              apolloLinkedinUrl: apolloData.linkedin_url || null,
              apolloOrgId: apolloData.organization?.id || null,
              apolloIndustry: apolloData.organization?.industry || null,
              apolloEmployeeCount:
                apolloData.organization?.estimated_num_employees || null,

              // Apollo metadata
              apolloEnrichedAt: new Date(),
              apolloData: {
                personId: apolloData.id,
                title: apolloData.title,
                linkedinUrl: apolloData.linkedin_url,
                allPhones: phones,
                allEmails: emails,
                organization: apolloData.organization,
              },

              // Update status if we got contact info
              enrichmentStatus:
                phones.length > 0 || emails.length > 0
                  ? "completed"
                  : "partial",
              updatedAt: new Date(),
            })
            .where(eq(leads.id, lead.leadId));
        } catch (dbErr) {
          console.error(`[Apollo] DB update failed for ${lead.leadId}:`, dbErr);
          results.errors.push(`DB update failed for ${lead.leadId}`);
        }
      }
    }
  } else if (type === "organizations") {
    // For organization enrichment (less common for property leads)
    const orgs: (OrgEnrich & { leadId: string })[] = leadsData
      .filter((lead) => lead.apolloCompany)
      .map((lead) => ({
        leadId: lead.id,
        name: lead.apolloCompany || undefined,
      }));

    if (orgs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No leads with company names to enrich",
        results,
      });
    }

    const apolloResults = await bulkEnrichOrgs(orgs);

    for (let i = 0; i < orgs.length; i++) {
      const org = orgs[i];
      const apolloData = apolloResults[i];

      if (!apolloData || !apolloData.id) {
        results.failed++;
        continue;
      }

      results.enriched++;

      if (updateDb) {
        try {
          await db
            .update(leads)
            .set({
              // Apollo-specific fields from schema
              apolloCompany: apolloData.name || org.name || null,
              apolloOrgId: apolloData.id || null,
              apolloCompanyDomain: apolloData.website_url || null,
              apolloIndustry: apolloData.industry || null,
              apolloEmployeeCount: apolloData.estimated_num_employees || null,
              apolloLinkedinUrl: apolloData.linkedin_url || null,
              apolloEnrichedAt: new Date(),
              apolloData: {
                orgId: apolloData.id,
                website: apolloData.website_url,
                industry: apolloData.industry,
                employees: apolloData.estimated_num_employees,
                linkedinUrl: apolloData.linkedin_url,
              },
              updatedAt: new Date(),
            })
            .where(eq(leads.id, org.leadId));
        } catch (dbErr) {
          console.error(`[Apollo] DB update failed for ${org.leadId}:`, dbErr);
        }
      }
    }
  }

  console.log(
    `[Apollo] Enrichment complete: ${results.enriched}/${results.total}, ${results.withPhones} phones, ${results.withEmails} emails`,
  );

  return NextResponse.json({
    success: true,
    results,
  });
}

// GET - Check Apollo API status and credits
export async function GET() {
  try {
    if (!APOLLO_API_KEY) {
      return NextResponse.json({
        configured: false,
        error: "APOLLO_API_KEY not configured",
      });
    }

    // Test API with a simple request
    const response = await fetch("https://api.apollo.io/api/v1/auth/health", {
      headers: {
        "x-api-key": APOLLO_API_KEY,
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        configured: true,
        healthy: false,
        error: "API key invalid or expired",
      });
    }

    return NextResponse.json({
      configured: true,
      healthy: true,
      bulkLimit: BULK_LIMIT,
      endpoints: {
        people: APOLLO_PEOPLE_URL,
        organizations: APOLLO_ORG_URL,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json(
      {
        configured: true,
        healthy: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
