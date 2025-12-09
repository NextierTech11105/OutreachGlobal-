import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2/PropertySearch";

/**
 * PROPERTY SEARCH PIPELINE
 *
 * Economical flow:
 * 1. Search returns IDs + minimal data (low/no credits)
 * 2. Save IDs to bucket/datalake (800K+ capacity)
 * 3. On-demand: Batch detail + skip trace (2K per campaign block)
 *
 * This preserves credits by only enriching properties you'll actually contact.
 */

// Valid property types per RealEstateAPI
const VALID_PROPERTY_TYPES = ["SFR", "MFR", "LAND", "CONDO", "OTHER", "MOBILE"];

// Valid sort fields per RealEstateAPI
const VALID_SORT_FIELDS = [
  "years_owned",
  "equity_percent",
  "year_built",
  "building_size",
  "lot_size",
  "assessed_value",
  "last_sale_date",
  "estimated_equity",
  "estimated_value",
  "assessed_land_value",
];

// Invalid parameters that RealEstateAPI doesn't accept
const INVALID_PARAMS = [
  "zoning",
  "distressed",
  "distress_type",
  "ids_only",
  "start", // Use 'resultIndex' instead
  "from",  // Use 'resultIndex' instead
];

// Response mode options
type ResponseMode = "full" | "ids" | "count";

// Extract IDs from results
function extractIds(results: Record<string, unknown>[]): string[] {
  return results.map((p) => {
    // RealEstateAPI returns 'id' field
    return String(p.id || p.propertyId || "");
  }).filter(Boolean);
}

// Count distress signals from results
function countSignals(results: Record<string, unknown>[]) {
  return {
    preForeclosure: results.filter((p) => p.preForeclosure || p.pre_foreclosure).length,
    foreclosure: results.filter((p) => p.foreclosure).length,
    taxLien: results.filter((p) => p.taxLien || p.tax_lien).length,
    taxDelinquent: results.filter((p) => p.taxDelinquent || p.tax_delinquent).length,
    highEquity: results.filter((p) => p.highEquity || p.high_equity || (p.equityPercent && Number(p.equityPercent) >= 50)).length,
    vacant: results.filter((p) => p.vacant).length,
    absenteeOwner: results.filter((p) => p.absenteeOwner || p.absentee_owner).length,
    outOfState: results.filter((p) => p.outOfState || p.out_of_state).length,
    reverseMortgage: results.filter((p) => p.loanType === "REV" || p.reverseMortgage || p.loan_type === "REV").length,
    inherited: results.filter((p) => p.inherited).length,
    probate: results.filter((p) => p.probate).length,
    freeClear: results.filter((p) => p.freeClear || p.free_clear).length,
  };
}

function sanitizeSearchBody(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...body };

  // Remove invalid parameters
  for (const param of INVALID_PARAMS) {
    delete sanitized[param];
  }

  // Handle special mortgage/lender flags (not passed to API, handled in response)
  // lender_name_match and flag_compulink are for client-side post-processing
  delete sanitized.lender_name_match;
  delete sanitized.flag_compulink;

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

  // Validate and sanitize sort field
  if (sanitized.sort && typeof sanitized.sort === "object") {
    const sortObj = sanitized.sort as Record<string, string>;
    const validSortObj: Record<string, string> = {};

    for (const [field, direction] of Object.entries(sortObj)) {
      if (VALID_SORT_FIELDS.includes(field) && ["asc", "desc"].includes(direction)) {
        validSortObj[field] = direction;
      }
    }

    if (Object.keys(validSortObj).length > 0) {
      sanitized.sort = validSortObj;
    } else {
      delete sanitized.sort;
    }
  }

  return sanitized;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();

    // Extract response mode (full, ids, count)
    const mode: ResponseMode = rawBody.mode || "full";
    delete rawBody.mode;

    const body = sanitizeSearchBody(rawBody);

    // Log the request for debugging
    console.log(`[PropertySearch] Mode: ${mode}, Request:`, JSON.stringify(body, null, 2));

    // Check for required location parameter
    const hasLocation = body.state || body.county || body.city || body.zip || body.address;
    if (!hasLocation) {
      console.error("PropertySearch: No location parameter provided");
      return NextResponse.json(
        {
          error: true,
          message: "Please select a location (state, county, city, or zip code)",
          code: "MISSING_LOCATION"
        },
        { status: 400 }
      );
    }

    // Check API key
    if (!REALESTATE_API_KEY) {
      console.error("PropertySearch: Missing API key");
      return NextResponse.json(
        { error: true, message: "Real Estate API key not configured", code: "MISSING_API_KEY" },
        { status: 500 }
      );
    }

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
      return NextResponse.json(
        { error: true, message: data.message || data.error || "API request failed", details: data },
        { status: response.status }
      );
    }

    // Extract results array
    const results = data.data || data.properties || data.results || [];
    const totalCount = data.resultCount || data.totalCount || data.total || results.length;

    // Handle different response modes
    if (mode === "count") {
      // Just return count (no data, no credits used for IDs)
      return NextResponse.json({
        success: true,
        count: totalCount,
        signals: countSignals(results),
      });
    }

    if (mode === "ids") {
      // Return only IDs (economical - save to bucket)
      const ids = extractIds(results);
      const signals = countSignals(results);

      console.log(`[PropertySearch] Found ${ids.length} IDs (${totalCount} total)`);

      return NextResponse.json({
        success: true,
        ids,
        totalCount,
        page: body.resultIndex ? Math.floor(Number(body.resultIndex) / (Number(body.size) || 500)) + 1 : 1,
        pageSize: Number(body.size) || 500,
        hasMore: (body.resultIndex ? Number(body.resultIndex) : 0) + results.length < totalCount,
        signals,
      });
    }

    // Default: return full data
    return NextResponse.json({
      ...data,
      signals: countSignals(results),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Property search error:", error);
    return NextResponse.json(
      { error: true, message },
      { status: 500 }
    );
  }
}

// GET - Quick count endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    if (!REALESTATE_API_KEY) {
      return NextResponse.json({ error: "REALESTATE_API_KEY not configured" }, { status: 500 });
    }

    // Build body from query params
    const body: Record<string, unknown> = {};

    // Location
    if (searchParams.get("state")) body.state = searchParams.get("state");
    if (searchParams.get("county")) body.county = searchParams.get("county");
    if (searchParams.get("city")) body.city = searchParams.get("city");
    if (searchParams.get("zip")) body.zip = searchParams.get("zip");

    // Distress signals
    if (searchParams.get("preForeclosure") === "true") body.pre_foreclosure = true;
    if (searchParams.get("taxLien") === "true") body.tax_lien = true;
    if (searchParams.get("highEquity") === "true") body.high_equity = true;
    if (searchParams.get("vacant") === "true") body.vacant = true;
    if (searchParams.get("absenteeOwner") === "true") body.absentee_owner = true;

    // Require at least one location
    if (!body.state && !body.county && !body.city && !body.zip) {
      return NextResponse.json({
        error: "At least one location filter required"
      }, { status: 400 });
    }

    // Just get count
    body.size = 1;

    const response = await fetch(REALESTATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Count failed" },
        { status: response.status }
      );
    }

    const totalCount = data.resultCount || data.totalCount || data.total || 0;

    return NextResponse.json({
      success: true,
      count: totalCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Count failed";
    console.error("[Property Search] Count error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
