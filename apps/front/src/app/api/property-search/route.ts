import { NextRequest, NextResponse } from "next/server";
import {
  realEstateApi,
  type PropertySearchQuery,
} from "@/lib/services/real-estate-api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Build query from URL params
  const query: PropertySearchQuery = {};

  // Location
  if (searchParams.get("zip")) query.zip = searchParams.get("zip")!;
  if (searchParams.get("city")) query.city = searchParams.get("city")!;
  if (searchParams.get("state")) query.state = searchParams.get("state")!;
  if (searchParams.get("county")) query.county = searchParams.get("county")!;
  if (searchParams.get("latitude"))
    query.latitude = parseFloat(searchParams.get("latitude")!);
  if (searchParams.get("longitude"))
    query.longitude = parseFloat(searchParams.get("longitude")!);
  if (searchParams.get("radius"))
    query.radius = parseFloat(searchParams.get("radius")!);

  // Property filters
  if (searchParams.get("property_type"))
    query.property_type = searchParams.get("property_type")!;
  if (searchParams.get("beds_min"))
    query.beds_min = parseInt(searchParams.get("beds_min")!);
  if (searchParams.get("beds_max"))
    query.beds_max = parseInt(searchParams.get("beds_max")!);
  if (searchParams.get("baths_min"))
    query.baths_min = parseInt(searchParams.get("baths_min")!);
  if (searchParams.get("baths_max"))
    query.baths_max = parseInt(searchParams.get("baths_max")!);
  if (searchParams.get("year_built_min"))
    query.year_built_min = parseInt(searchParams.get("year_built_min")!);
  if (searchParams.get("year_built_max"))
    query.year_built_max = parseInt(searchParams.get("year_built_max")!);

  // Value filters
  if (searchParams.get("estimated_value_min"))
    query.estimated_value_min = parseInt(
      searchParams.get("estimated_value_min")!,
    );
  if (searchParams.get("estimated_value_max"))
    query.estimated_value_max = parseInt(
      searchParams.get("estimated_value_max")!,
    );
  if (searchParams.get("estimated_equity_min"))
    query.estimated_equity_min = parseInt(
      searchParams.get("estimated_equity_min")!,
    );
  if (searchParams.get("estimated_equity_max"))
    query.estimated_equity_max = parseInt(
      searchParams.get("estimated_equity_max")!,
    );

  // Boolean filters
  if (searchParams.get("absentee_owner") === "true")
    query.absentee_owner = true;
  if (searchParams.get("owner_occupied") === "true")
    query.owner_occupied = true;
  if (searchParams.get("high_equity") === "true") query.high_equity = true;
  if (searchParams.get("pre_foreclosure") === "true")
    query.pre_foreclosure = true;
  if (searchParams.get("foreclosure") === "true") query.foreclosure = true;
  if (searchParams.get("vacant") === "true") query.vacant = true;
  if (searchParams.get("tax_lien") === "true") query.tax_lien = true;
  if (searchParams.get("inherited") === "true") query.inherited = true;
  if (searchParams.get("corporate_owned") === "true")
    query.corporate_owned = true;

  // MLS filters
  if (searchParams.get("mls_active") === "true") query.mls_active = true;
  if (searchParams.get("mls_pending") === "true") query.mls_pending = true;
  if (searchParams.get("mls_sold") === "true") query.mls_sold = true;

  // Pagination & sorting
  if (searchParams.get("size"))
    query.size = parseInt(searchParams.get("size")!);
  if (searchParams.get("from"))
    query.from = parseInt(searchParams.get("from")!);

  // Sort
  const sortField = searchParams.get("sort_field");
  const sortOrder = searchParams.get("sort_order") as "asc" | "desc" | null;
  if (sortField && sortOrder) {
    query.sort = { [sortField]: sortOrder } as PropertySearchQuery["sort"];
  }

  // Response mode
  if (searchParams.get("count") === "true") query.count = true;
  if (searchParams.get("ids_only") === "true") query.ids_only = true;

  try {
    const data = await realEstateApi.searchProperties(query);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Property search error:", error);
    return NextResponse.json(
      { error: "Failed to search properties", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await realEstateApi.searchProperties(body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Property search error:", error);
    return NextResponse.json(
      { error: "Failed to search properties", details: String(error) },
      { status: 500 },
    );
  }
}
