import { NextRequest, NextResponse } from "next/server";

/**
 * Cross-Reference API
 *
 * Purpose: Match business owners with property owners to find bundled deals
 * (business + real estate = motivated seller = higher fees)
 *
 * Workflow:
 * 1. Skip trace business owner (name/address from Apollo or business database)
 * 2. Skip trace property owner (via PropertyDetail → SkipTrace)
 * 3. Cross-reference phones, emails, addresses
 * 4. Score the match quality
 *
 * Use case: 15% commission on $667k-$3.33M deals = $100k-$500k fees
 */

const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v1/SkipTrace";
const PROPERTY_DETAIL_URL = "https://api.realestateapi.com/v2/PropertyDetail";

// Match scoring weights
const SCORE_WEIGHTS = {
  phoneMatch: 40,        // Same phone = strong signal
  emailMatch: 30,        // Same email = strong signal
  addressMatch: 20,      // Associated address match
  nameMatch: 10,         // Name similarity
};

interface SkipTraceOutput {
  phones: string[];
  emails: string[];
  addresses: string[];
  name: string;
  firstName?: string;
  lastName?: string;
  success: boolean;
  raw?: Record<string, unknown>;
}

interface CrossReferenceInput {
  // Business owner info (from Apollo, USBizData, etc.)
  business: {
    firstName?: string;
    lastName?: string;
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  // Property info (address or ID)
  property: {
    id?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

interface CrossReferenceResult {
  matched: boolean;
  matchScore: number;         // 0-100
  matchDetails: {
    phoneMatches: string[];   // Matched phone numbers
    emailMatches: string[];   // Matched emails
    addressMatches: string[]; // Matched addresses
    nameMatch: boolean;       // Names are similar
  };
  businessOwner: SkipTraceOutput;
  propertyOwner: SkipTraceOutput;
  recommendation: "HIGH_VALUE" | "LIKELY_MATCH" | "POSSIBLE" | "NO_MATCH";
  dealSignals: string[];      // Why this is a good deal
}

// Skip trace a person by name/address
async function skipTracePerson(
  firstName: string,
  lastName: string,
  address?: string,
  city?: string,
  state?: string,
  zip?: string
): Promise<SkipTraceOutput> {
  try {
    const body: Record<string, unknown> = {};
    if (firstName) body.first_name = firstName;
    if (lastName) body.last_name = lastName;
    if (address) body.address = address;
    if (city) body.city = city;
    if (state) body.state = state;
    if (zip) body.zip = zip;
    body.match_requirements = { phones: true };

    const response = await fetch(SKIP_TRACE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        phones: [],
        emails: [],
        addresses: [],
        name: [firstName, lastName].filter(Boolean).join(" "),
        firstName,
        lastName,
        success: false,
      };
    }

    const data = await response.json();
    const identity = data.output?.identity || {};

    // Extract phones (skip DNC and disconnected)
    const phones: string[] = [];
    if (identity.phones && Array.isArray(identity.phones)) {
      for (const p of identity.phones) {
        if (p.doNotCall === true || p.isConnected === false) continue;
        const num = p.phone || p.phoneDisplay?.replace(/\D/g, "");
        if (num) phones.push(num);
      }
    }

    // Extract emails
    const emails: string[] = [];
    if (identity.emails && Array.isArray(identity.emails)) {
      for (const e of identity.emails) {
        if (e.email) emails.push(e.email.toLowerCase());
      }
    }

    // Extract addresses
    const addresses: string[] = [];
    if (identity.address?.formattedAddress) {
      addresses.push(identity.address.formattedAddress.toLowerCase());
    }
    if (identity.addressHistory && Array.isArray(identity.addressHistory)) {
      for (const a of identity.addressHistory) {
        if (a.formattedAddress) {
          addresses.push(a.formattedAddress.toLowerCase());
        }
      }
    }

    const names = identity.names || data.output?.demographics?.names || [];
    const primaryName = names[0];

    return {
      phones,
      emails,
      addresses,
      name:
        primaryName?.fullName ||
        [primaryName?.firstName, primaryName?.lastName].filter(Boolean).join(" ") ||
        [firstName, lastName].filter(Boolean).join(" "),
      firstName: primaryName?.firstName || firstName,
      lastName: primaryName?.lastName || lastName,
      success: data.match === true,
      raw: data,
    };
  } catch (err) {
    console.error("[CrossRef] Skip trace error:", err);
    return {
      phones: [],
      emails: [],
      addresses: [],
      name: [firstName, lastName].filter(Boolean).join(" "),
      firstName,
      lastName,
      success: false,
    };
  }
}

// Get property owner and skip trace them
async function skipTracePropertyOwner(
  propertyId?: string,
  address?: string,
  city?: string,
  state?: string,
  zip?: string
): Promise<SkipTraceOutput> {
  try {
    // First get property details to get owner info
    let ownerFirstName = "";
    let ownerLastName = "";
    let propAddress = address || "";
    let propCity = city || "";
    let propState = state || "";
    let propZip = zip || "";

    if (propertyId) {
      const propResponse = await fetch(PROPERTY_DETAIL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": REALESTATE_API_KEY,
        },
        body: JSON.stringify({ id: propertyId }),
      });

      if (propResponse.ok) {
        const propData = await propResponse.json();
        const prop = propData.data || propData;
        const ownerInfo = prop.ownerInfo || {};
        const propInfo = prop.propertyInfo || {};
        const addrInfo = propInfo.address || prop.address || {};

        ownerFirstName =
          ownerInfo.owner1FirstName || prop.owner1FirstName || prop.ownerFirstName || "";
        ownerLastName =
          ownerInfo.owner1LastName || prop.owner1LastName || prop.ownerLastName || "";
        propAddress = addrInfo.address || addrInfo.street || addrInfo.label || address || "";
        propCity = addrInfo.city || city || "";
        propState = addrInfo.state || state || "";
        propZip = addrInfo.zip || zip || "";
      }
    }

    if (!ownerFirstName && !ownerLastName) {
      return {
        phones: [],
        emails: [],
        addresses: propAddress ? [propAddress.toLowerCase()] : [],
        name: "",
        success: false,
      };
    }

    // Now skip trace the owner
    return skipTracePerson(
      ownerFirstName,
      ownerLastName,
      propAddress,
      propCity,
      propState,
      propZip
    );
  } catch (err) {
    console.error("[CrossRef] Property skip trace error:", err);
    return {
      phones: [],
      emails: [],
      addresses: [],
      name: "",
      success: false,
    };
  }
}

// Cross-reference two skip trace results
function crossReference(
  business: SkipTraceOutput,
  property: SkipTraceOutput,
  businessInput: CrossReferenceInput["business"]
): CrossReferenceResult {
  // Find phone matches
  const bizPhones = new Set([...business.phones, businessInput.phone?.replace(/\D/g, "") || ""].filter(Boolean));
  const propPhones = new Set(property.phones);
  const phoneMatches = [...bizPhones].filter((p) => propPhones.has(p));

  // Find email matches
  const bizEmails = new Set([...business.emails, businessInput.email?.toLowerCase() || ""].filter(Boolean));
  const propEmails = new Set(property.emails);
  const emailMatches = [...bizEmails].filter((e) => propEmails.has(e));

  // Find address matches (fuzzy)
  const bizAddresses = new Set([
    ...business.addresses,
    [businessInput.address, businessInput.city, businessInput.state]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  ].filter(Boolean));
  const propAddresses = new Set(property.addresses);
  const addressMatches: string[] = [];
  for (const bizAddr of bizAddresses) {
    for (const propAddr of propAddresses) {
      // Simple fuzzy match - check if addresses share significant overlap
      if (
        bizAddr.includes(propAddr.split(",")[0]) ||
        propAddr.includes(bizAddr.split(",")[0])
      ) {
        addressMatches.push(`${bizAddr} ≈ ${propAddr}`);
      }
    }
  }

  // Name match (fuzzy)
  const bizName = (businessInput.name || [businessInput.firstName, businessInput.lastName].filter(Boolean).join(" ")).toLowerCase();
  const propName = property.name.toLowerCase();
  const nameMatch =
    bizName &&
    propName &&
    (bizName.includes(propName.split(" ")[0]) ||
      propName.includes(bizName.split(" ")[0]) ||
      bizName === propName);

  // Calculate score
  let score = 0;
  if (phoneMatches.length > 0) score += SCORE_WEIGHTS.phoneMatch;
  if (emailMatches.length > 0) score += SCORE_WEIGHTS.emailMatch;
  if (addressMatches.length > 0) score += SCORE_WEIGHTS.addressMatch;
  if (nameMatch) score += SCORE_WEIGHTS.nameMatch;

  // Determine recommendation
  let recommendation: CrossReferenceResult["recommendation"];
  if (score >= 70) {
    recommendation = "HIGH_VALUE";
  } else if (score >= 40) {
    recommendation = "LIKELY_MATCH";
  } else if (score >= 20) {
    recommendation = "POSSIBLE";
  } else {
    recommendation = "NO_MATCH";
  }

  // Generate deal signals
  const dealSignals: string[] = [];
  if (phoneMatches.length > 0) {
    dealSignals.push(`Same phone (${phoneMatches[0]}) = likely same person`);
  }
  if (emailMatches.length > 0) {
    dealSignals.push(`Same email (${emailMatches[0]}) = verified identity`);
  }
  if (addressMatches.length > 0) {
    dealSignals.push("Business address matches property = owner-operator");
  }
  if (nameMatch) {
    dealSignals.push("Name match confirms ownership");
  }
  if (score >= 40) {
    dealSignals.push("BUNDLED DEAL: Business + Property = higher value exit");
  }

  return {
    matched: score >= 20,
    matchScore: score,
    matchDetails: {
      phoneMatches,
      emailMatches,
      addressMatches,
      nameMatch: !!nameMatch,
    },
    businessOwner: business,
    propertyOwner: property,
    recommendation,
    dealSignals,
  };
}

// POST - Cross-reference business owner with property owner
export async function POST(request: NextRequest) {
  try {
    if (!REALESTATE_API_KEY) {
      return NextResponse.json(
        {
          error: "RealEstateAPI not configured",
          message: "Set REAL_ESTATE_API_KEY in environment variables",
        },
        { status: 503 }
      );
    }

    const body = await request.json();

    // Support single or batch
    const inputs: CrossReferenceInput[] = body.records || [body];

    if (inputs.length === 0 || (!inputs[0].business && !inputs[0].property)) {
      return NextResponse.json(
        {
          error: "Provide business and property info",
          example: {
            business: {
              firstName: "Mike",
              lastName: "Braham",
              address: "123 Business St",
              city: "Brooklyn",
              state: "NY",
              zip: "11201",
              company: "Braham Auto",
              email: "mike@brahamauto.com",
              phone: "7181234567",
            },
            property: {
              id: "property-id-from-search",
              // OR
              address: "456 Property Ave",
              city: "Brooklyn",
              state: "NY",
              zip: "11201",
            },
          },
          batch: {
            records: [
              { business: {}, property: {} },
              { business: {}, property: {} },
            ],
          },
        },
        { status: 400 }
      );
    }

    const results: CrossReferenceResult[] = [];

    // Process each input
    for (const input of inputs) {
      const { business, property } = input;

      // Parse business owner name
      let bizFirstName = business.firstName || "";
      let bizLastName = business.lastName || "";
      if (!bizFirstName && !bizLastName && business.name) {
        const parts = business.name.split(" ");
        bizFirstName = parts[0] || "";
        bizLastName = parts.slice(1).join(" ") || "";
      }

      // Skip trace business owner
      console.log(`[CrossRef] Skip tracing business owner: ${bizFirstName} ${bizLastName}`);
      const businessResult = await skipTracePerson(
        bizFirstName,
        bizLastName,
        business.address,
        business.city,
        business.state,
        business.zip
      );

      // Skip trace property owner
      console.log(`[CrossRef] Skip tracing property owner for: ${property.id || property.address}`);
      const propertyResult = await skipTracePropertyOwner(
        property.id,
        property.address,
        property.city,
        property.state,
        property.zip
      );

      // Cross-reference
      const crossRefResult = crossReference(businessResult, propertyResult, business);
      results.push(crossRefResult);

      // Brief delay between records
      if (inputs.length > 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // Return single result if single input
    if (inputs.length === 1) {
      const result = results[0];
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Return batch results with stats
    const matched = results.filter((r) => r.matched).length;
    const highValue = results.filter((r) => r.recommendation === "HIGH_VALUE").length;
    const likelyMatch = results.filter((r) => r.recommendation === "LIKELY_MATCH").length;

    return NextResponse.json({
      success: true,
      results,
      stats: {
        total: results.length,
        matched,
        highValue,
        likelyMatch,
        noMatch: results.length - matched,
      },
      summary: `Found ${matched} matches (${highValue} high-value, ${likelyMatch} likely) out of ${results.length} records`,
    });
  } catch (error: unknown) {
    console.error("[CrossRef] Error:", error);
    const message = error instanceof Error ? error.message : "Cross-reference failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - API documentation
export async function GET() {
  const isConfigured = !!REALESTATE_API_KEY;

  return NextResponse.json({
    name: "Cross-Reference API",
    description: "Match business owners with property owners to find bundled deals",
    configured: isConfigured,
    workflow: [
      "1. Skip trace business owner (from Apollo/business database)",
      "2. Get property owner via PropertyDetail API",
      "3. Skip trace property owner",
      "4. Cross-reference phones, emails, addresses",
      "5. Score match quality (0-100)",
      "6. Recommend: HIGH_VALUE, LIKELY_MATCH, POSSIBLE, NO_MATCH",
    ],
    scoring: SCORE_WEIGHTS,
    endpoints: {
      single: "POST /api/cross-reference { business: {...}, property: {...} }",
      batch: "POST /api/cross-reference { records: [{ business, property }, ...] }",
    },
    useCase:
      "Find bundled deals (business + real estate = motivated seller). Target: $100k-$500k fees on $667k-$3.33M deals (15% commission).",
  });
}
