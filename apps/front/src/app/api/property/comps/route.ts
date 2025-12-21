import { NextRequest, NextResponse } from "next/server";
import { realEstateApi } from "@/lib/services/real-estate-api";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const propertyId = searchParams.get("propertyId") || searchParams.get("id");
  const address = searchParams.get("address");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "0.5";

  try {
    if (!REALESTATE_API_KEY) {
      return NextResponse.json({
        configured: false,
        error: "RealEstateAPI key not configured",
      });
    }

    if (!propertyId && !address && !(lat && lng)) {
      return NextResponse.json({
        configured: true,
        message: "Comps API - provide propertyId, address, or lat/lng",
        endpoints: {
          byProperty: "GET /api/property/comps?propertyId=xxx",
          byAddress: "GET /api/property/comps?address=xxx",
          byLocation: "GET /api/property/comps?lat=xxx&lng=xxx&radius=0.5",
        },
      });
    }

    // If we have a propertyId, first get the property details
    let targetProperty;
    if (propertyId) {
      targetProperty = await realEstateApi.getPropertyDetail(propertyId);
    }

    // Build comps search params
    const searchParams: Record<string, string> = {
      radius: radius,
      limit: "10",
      sort: "distance",
    };

    if (targetProperty) {
      searchParams.lat = String(targetProperty.latitude);
      searchParams.lng = String(targetProperty.longitude);
      searchParams.beds_min = String(Math.max(1, (targetProperty.bedrooms || 3) - 1));
      searchParams.beds_max = String((targetProperty.bedrooms || 3) + 1);
      searchParams.sqft_min = String(Math.floor((targetProperty.squareFeet || 1500) * 0.8));
      searchParams.sqft_max = String(Math.ceil((targetProperty.squareFeet || 1500) * 1.2));
    } else if (lat && lng) {
      searchParams.lat = lat;
      searchParams.lng = lng;
    } else if (address) {
      // Would need to geocode address first
      return NextResponse.json({
        error: "Address lookup not implemented - use lat/lng or propertyId",
      }, { status: 400 });
    }

    // Call RealEstateAPI for comps
    const compsUrl = `https://api.realestateapi.com/v2/PropertyComps?${new URLSearchParams(searchParams)}`;
    
    const response = await fetch(compsUrl, {
      headers: {
        "x-api-key": REALESTATE_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        error: "RealEstateAPI comps request failed",
        status: response.status,
        details: errorText,
      }, { status: response.status });
    }

    const compsData = await response.json();

    return NextResponse.json({
      configured: true,
      subject: targetProperty || null,
      comps: compsData.data || compsData.properties || compsData,
      count: compsData.count || (compsData.data?.length) || 0,
    });
  } catch (error) {
    console.error("Property comps error:", error);
    return NextResponse.json(
      { error: "Failed to get property comps", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, criteria } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Get subject property
    const subject = await realEstateApi.getPropertyDetail(propertyId);

    // Custom criteria for comps
    const searchCriteria = {
      lat: subject.latitude,
      lng: subject.longitude,
      radius: criteria?.radius || 0.5,
      beds_min: criteria?.beds_min || Math.max(1, (subject.bedrooms || 3) - 1),
      beds_max: criteria?.beds_max || (subject.bedrooms || 3) + 1,
      sqft_min: criteria?.sqft_min || Math.floor((subject.squareFeet || 1500) * 0.8),
      sqft_max: criteria?.sqft_max || Math.ceil((subject.squareFeet || 1500) * 1.2),
      year_built_min: criteria?.year_built_min || (subject.yearBuilt || 1990) - 10,
      year_built_max: criteria?.year_built_max || (subject.yearBuilt || 1990) + 10,
      limit: criteria?.limit || 10,
    };

    const compsUrl = `https://api.realestateapi.com/v2/PropertyComps?${new URLSearchParams(
      Object.entries(searchCriteria).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
    )}`;

    const response = await fetch(compsUrl, {
      headers: {
        "x-api-key": REALESTATE_API_KEY || "",
        "Content-Type": "application/json",
      },
    });

    const compsData = await response.json();

    return NextResponse.json({
      subject,
      criteria: searchCriteria,
      comps: compsData.data || compsData.properties || compsData,
      count: compsData.count || 0,
    });
  } catch (error) {
    console.error("Property comps POST error:", error);
    return NextResponse.json(
      { error: "Failed to get property comps", details: String(error) },
      { status: 500 }
    );
  }
}
