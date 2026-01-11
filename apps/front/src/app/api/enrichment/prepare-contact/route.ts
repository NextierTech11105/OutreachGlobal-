import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/api-auth";

// Just-in-Time Enrichment for Power Dialer
// This endpoint runs the full enrichment pipeline BEFORE contacting a lead:
// 1. Property Detail (or B2B company info)
// 2. Skip Trace (get owner name + property address → phone/email)
// 3. Return enriched data ready for contact

const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const PROPERTY_DETAIL_URL = "https://api.realestateapi.com/v2/PropertyDetail";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v1/SkipTrace";
const APOLLO_API_KEY =
  process.env.APOLLO_IO_API_KEY ||
  process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY ||
  process.env.APOLLO_API_KEY ||
  "";

interface EnrichedContact {
  id: string;
  type: "property" | "b2b";
  // Contact info
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phones: Array<{ number: string; type?: string; score?: number }>;
  emails: Array<{ email: string; type?: string }>;
  // Property specific
  propertyAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  estimatedValue?: number;
  ownerOccupied?: boolean;
  // B2B specific
  companyName?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  // Metadata
  enrichedAt: string;
  source: string;
}

// Enrich property lead: Detail → Skip Trace → Contact info
async function enrichPropertyLead(
  propertyId: string,
): Promise<EnrichedContact | null> {
  try {
    // Step 1: Get property detail
    console.log(`[Prepare Contact] Getting property detail for: ${propertyId}`);

    const detailResponse = await fetch(PROPERTY_DETAIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ id: propertyId }),
    });

    if (!detailResponse.ok) {
      console.error(
        `[Prepare Contact] Property detail failed: ${detailResponse.status}`,
      );
      return null;
    }

    const detailData = await detailResponse.json();
    const property = detailData.data || detailData;
    const propertyInfo = property.propertyInfo || {};
    const address = propertyInfo.address || property.address || {};
    const ownerInfo = property.ownerInfo || {};

    // Extract owner name and property address for skip trace
    const ownerFirstName =
      ownerInfo.owner1FirstName ||
      property.owner1FirstName ||
      property.ownerFirstName ||
      "";
    const ownerLastName =
      ownerInfo.owner1LastName ||
      property.owner1LastName ||
      property.ownerLastName ||
      "";
    const propertyAddress =
      address.address || address.street || address.label || "";
    const propertyCity = address.city || "";
    const propertyState = address.state || "";
    const propertyZip = address.zip || "";

    console.log(
      `[Prepare Contact] Owner: ${ownerFirstName} ${ownerLastName}, Address: ${propertyAddress}`,
    );

    // Step 2: Skip trace with BOTH owner name AND property address
    let phones: EnrichedContact["phones"] = [];
    let emails: EnrichedContact["emails"] = [];

    if (
      REALESTATE_API_KEY &&
      (ownerFirstName || ownerLastName || propertyAddress)
    ) {
      console.log(`[Prepare Contact] Running skip trace...`);

      const skipTraceBody: Record<string, string> = {};
      if (ownerFirstName) skipTraceBody.first_name = ownerFirstName;
      if (ownerLastName) skipTraceBody.last_name = ownerLastName;
      if (propertyAddress) skipTraceBody.address = propertyAddress;
      if (propertyCity) skipTraceBody.city = propertyCity;
      if (propertyState) skipTraceBody.state = propertyState;
      if (propertyZip) skipTraceBody.zip = propertyZip;

      const skipTraceResponse = await fetch(SKIP_TRACE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": REALESTATE_API_KEY,
          Accept: "application/json",
        },
        body: JSON.stringify(skipTraceBody),
      });

      if (skipTraceResponse.ok) {
        const skipData = await skipTraceResponse.json();
        const result = skipData.data || skipData;

        // Parse phones
        if (result.phones && Array.isArray(result.phones)) {
          phones = result.phones
            .map(
              (p: {
                number?: string;
                phoneNumber?: string;
                type?: string;
                score?: number;
              }) => ({
                number: p.number || p.phoneNumber || "",
                type: p.type,
                score: p.score,
              }),
            )
            .filter((p: { number: string }) => p.number);
        }
        if (result.phone)
          phones.push({ number: result.phone, type: "primary" });
        if (result.mobilePhone)
          phones.push({ number: result.mobilePhone, type: "mobile" });
        if (result.homePhone)
          phones.push({ number: result.homePhone, type: "home" });

        // Parse emails
        if (result.emails && Array.isArray(result.emails)) {
          emails = result.emails
            .map((e: { email?: string; address?: string; type?: string }) => ({
              email: e.email || e.address || "",
              type: e.type,
            }))
            .filter((e: { email: string }) => e.email);
        }
        if (result.email) emails.push({ email: result.email, type: "primary" });

        console.log(
          `[Prepare Contact] Skip trace found ${phones.length} phones, ${emails.length} emails`,
        );
      } else {
        console.warn(
          `[Prepare Contact] Skip trace failed: ${skipTraceResponse.status}`,
        );
      }
    }

    // Also check if property detail returned contact info directly
    if (property.phones && Array.isArray(property.phones)) {
      const existingNumbers = new Set(phones.map((p) => p.number));
      property.phones.forEach((p: string | { number?: string }) => {
        const num = typeof p === "string" ? p : p.number;
        if (num && !existingNumbers.has(num)) {
          phones.push({ number: num, type: "property" });
        }
      });
    }

    return {
      id: propertyId,
      type: "property",
      firstName: ownerFirstName,
      lastName: ownerLastName,
      fullName: [ownerFirstName, ownerLastName].filter(Boolean).join(" "),
      phones,
      emails,
      propertyAddress,
      city: propertyCity,
      state: propertyState,
      zip: propertyZip,
      estimatedValue: property.estimatedValue || property.avm,
      ownerOccupied: property.ownerOccupied,
      enrichedAt: new Date().toISOString(),
      source: "realestate_api",
    };
  } catch (error) {
    console.error("[Prepare Contact] Property enrichment error:", error);
    return null;
  }
}

// Enrich B2B lead: Apollo company/person lookup
async function enrichB2BLead(
  companyId: string,
  personId?: string,
): Promise<EnrichedContact | null> {
  try {
    if (!APOLLO_API_KEY) {
      console.warn("[Prepare Contact] Apollo API key not configured");
      return null;
    }

    // If we have a person ID, get their details
    // Apollo requires api_key in body for POST, but for GET we use query params
    if (personId) {
      const personResponse = await fetch(
        `https://api.apollo.io/v1/people/${personId}?api_key=${APOLLO_API_KEY}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (personResponse.ok) {
        const personData = await personResponse.json();
        const person = personData.person || personData;

        return {
          id: personId,
          type: "b2b",
          firstName: person.first_name,
          lastName: person.last_name,
          fullName: person.name,
          phones:
            person.phone_numbers?.map(
              (p: { number: string; type?: string }) => ({
                number: p.number,
                type: p.type || "work",
              }),
            ) || [],
          emails: person.email ? [{ email: person.email, type: "work" }] : [],
          companyName: person.organization?.name,
          jobTitle: person.title,
          linkedinUrl: person.linkedin_url,
          enrichedAt: new Date().toISOString(),
          source: "apollo",
        };
      }
    }

    // Otherwise, get company info and find contacts
    // Apollo requires api_key as query param for GET requests
    const companyResponse = await fetch(
      `https://api.apollo.io/v1/organizations/${companyId}?api_key=${APOLLO_API_KEY}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (companyResponse.ok) {
      const companyData = await companyResponse.json();
      const company = companyData.organization || companyData;

      return {
        id: companyId,
        type: "b2b",
        companyName: company.name,
        phones: company.phone ? [{ number: company.phone, type: "main" }] : [],
        emails: [],
        city: company.city,
        state: company.state,
        enrichedAt: new Date().toISOString(),
        source: "apollo",
      };
    }

    return null;
  } catch (error) {
    console.error("[Prepare Contact] B2B enrichment error:", error);
    return null;
  }
}

// POST - Prepare a lead for contact (just-in-time enrichment)
export async function POST(request: NextRequest) {
  try {
    // P0: Use requireTenantContext to enforce team isolation
    await requireTenantContext();

    const body = await request.json();
    const { id, type = "property", personId, skipCache = false } = body;

    if (!id) {
      return NextResponse.json(
        {
          error: "id required",
          example: {
            id: "property-id-or-company-id",
            type: "property", // or "b2b"
            personId: "optional-apollo-person-id",
          },
        },
        { status: 400 },
      );
    }

    console.log(`[Prepare Contact] Enriching ${type} lead: ${id}`);

    let enrichedData: EnrichedContact | null = null;

    if (type === "property") {
      enrichedData = await enrichPropertyLead(id);
    } else if (type === "b2b") {
      enrichedData = await enrichB2BLead(id, personId);
    } else {
      return NextResponse.json(
        { error: "type must be 'property' or 'b2b'" },
        { status: 400 },
      );
    }

    if (!enrichedData) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to enrich lead",
          id,
          type,
        },
        { status: 404 },
      );
    }

    // Determine best phone to dial
    const bestPhone =
      enrichedData.phones.find(
        (p) =>
          p.type?.toLowerCase() === "mobile" ||
          p.type?.toLowerCase() === "cell",
      ) || enrichedData.phones[0];

    return NextResponse.json({
      success: true,
      contact: enrichedData,
      recommended: {
        phone: bestPhone?.number,
        phoneType: bestPhone?.type,
        email: enrichedData.emails[0]?.email,
        displayName:
          enrichedData.fullName || enrichedData.companyName || "Unknown",
      },
      stats: {
        phonesFound: enrichedData.phones.length,
        emailsFound: enrichedData.emails.length,
        hasMobile: enrichedData.phones.some(
          (p) =>
            p.type?.toLowerCase() === "mobile" ||
            p.type?.toLowerCase() === "cell",
        ),
      },
    });
  } catch (error) {
    console.error("[Prepare Contact] Error:", error);
    const message =
      error instanceof Error ? error.message : "Enrichment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Check enrichment status/config
export async function GET() {
  const hasRealEstateApi = !!REALESTATE_API_KEY;
  const hasApolloApi = !!APOLLO_API_KEY;

  return NextResponse.json({
    configured: {
      property: hasRealEstateApi,
      b2b: hasApolloApi,
    },
    endpoints: {
      property: hasRealEstateApi
        ? "PropertyDetail + SkipTrace v1"
        : "Not configured",
      b2b: hasApolloApi ? "Apollo People/Organizations" : "Not configured",
    },
    usage:
      "POST with { id, type: 'property' | 'b2b' } to enrich before contact",
  });
}
