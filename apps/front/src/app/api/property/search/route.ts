import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2/PropertySearch";

// Valid property types per RealEstateAPI
const VALID_PROPERTY_TYPES = ["SFR", "MFR", "LAND", "CONDO", "OTHER", "MOBILE"];

// Invalid parameters that RealEstateAPI doesn't accept
const INVALID_PARAMS = [
  "ownership_years_min",
  "ownership_years_max",
  "zoning",
  "distressed",
  "distress_type",
];

function sanitizeSearchBody(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...body };

  // Remove invalid parameters
  for (const param of INVALID_PARAMS) {
    delete sanitized[param];
  }

  // Validate property_type
  if (sanitized.property_type) {
    const types = Array.isArray(sanitized.property_type)
      ? sanitized.property_type
      : [sanitized.property_type];
    const validTypes = types.filter((t: string) => VALID_PROPERTY_TYPES.includes(t));
    if (validTypes.length > 0) {
      sanitized.property_type = validTypes.length === 1 ? validTypes[0] : validTypes;
    } else {
      delete sanitized.property_type;
    }
  }

  return sanitized;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const body = sanitizeSearchBody(rawBody);

    // Log the request for debugging
    console.log("PropertySearch request (sanitized):", JSON.stringify(body, null, 2));

    const response = await fetch(REALESTATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Log the response for debugging
    console.log("PropertySearch response status:", response.status);
    if (!response.ok) {
      console.error("PropertySearch error:", JSON.stringify(data, null, 2));
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: true, message: data.message || data.error || "API request failed", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Property search error:", error);
    return NextResponse.json(
      { error: true, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
