import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "NEXTIER-2906-74a1-8684-d2f63f473b7b";
const BASE_URL = "https://api.realestateapi.com/v1/PropertyPortfolio/SavedSearch/List";

// List All Saved Searches
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { filter } = body;

    console.log("Listing RealEstateAPI Saved Searches", filter ? `with filter: ${JSON.stringify(filter)}` : "");

    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify(filter ? { filter } : {}),
    });

    const data = await response.json();
    console.log("RealEstateAPI List response:", response.status, `${data.data?.length || 0} searches found`);

    if (!response.ok || data.statusCode !== 200) {
      return NextResponse.json(
        { error: data.statusMessage || "Failed to list saved searches", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      searches: data.data || [],
      count: data.data?.length || 0,
      credits: data.credits,
    });
  } catch (error: any) {
    console.error("List saved searches error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET also works (for easier browser testing)
export async function GET() {
  try {
    console.log("Listing all RealEstateAPI Saved Searches");

    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok || data.statusCode !== 200) {
      return NextResponse.json(
        { error: data.statusMessage || "Failed to list saved searches" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      searches: data.data || [],
      count: data.data?.length || 0,
    });
  } catch (error: any) {
    console.error("List saved searches error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
