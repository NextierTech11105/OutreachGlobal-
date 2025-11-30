import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "NEXTIER-2906-74a1-8684-d2f63f473b7b";
const BASE_URL = "https://api.realestateapi.com/v1/PropertyPortfolio/SavedSearch";

// Create Saved Search - POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { search_name, search_query, list_size, meta_data } = body;

    if (!search_name || !search_query) {
      return NextResponse.json({ error: "search_name and search_query are required" }, { status: 400 });
    }

    console.log("Creating RealEstateAPI Saved Search:", { search_name, list_size });

    const response = await fetch(`${BASE_URL}/Create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({
        search_name,
        search_query,
        list_size: list_size || 10000,
        meta_data: meta_data || {},
      }),
    });

    const data = await response.json();
    console.log("RealEstateAPI Create response:", response.status, data.statusMessage);

    if (!response.ok || data.statusCode !== 200) {
      return NextResponse.json(
        { error: data.statusMessage || "Failed to create saved search", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      searchId: data.data?.searchId || data.data?.search?.searchId,
      searchName: data.data?.searchName || data.data?.search?.searchName,
      credits: data.credits,
      data: data.data,
    });
  } catch (error: any) {
    console.error("Create saved search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Retrieve Saved Search - GET with search_id param
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search_id = searchParams.get("search_id");

    if (!search_id) {
      return NextResponse.json({ error: "search_id is required" }, { status: 400 });
    }

    console.log("Retrieving RealEstateAPI Saved Search:", search_id);

    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ search_id }),
    });

    const data = await response.json();
    console.log("RealEstateAPI Retrieve response:", response.status);

    if (!response.ok || data.statusCode !== 200) {
      return NextResponse.json(
        { error: data.statusMessage || "Failed to retrieve saved search", details: data },
        { status: response.status }
      );
    }

    // Group results by changeType
    const results = data.data?.results || [];
    const grouped = {
      added: results.filter((r: any) => r.changeType === "added"),
      updated: results.filter((r: any) => r.changeType === "updated"),
      deleted: results.filter((r: any) => r.changeType === "deleted"),
      unchanged: results.filter((r: any) => r.changeType === null || r.changeType === "unchanged"),
    };

    return NextResponse.json({
      success: true,
      search: data.data?.search,
      summary: data.data?.summary,
      grouped,
      results,
      credits: data.credits,
    });
  } catch (error: any) {
    console.error("Retrieve saved search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete Saved Search - DELETE with search_id param
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search_id = searchParams.get("search_id");

    if (!search_id) {
      return NextResponse.json({ error: "search_id is required" }, { status: 400 });
    }

    console.log("Deleting RealEstateAPI Saved Search:", search_id);

    const response = await fetch(`${BASE_URL}/Delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ search_id }),
    });

    const data = await response.json();

    if (!response.ok || data.statusCode !== 200) {
      return NextResponse.json(
        { error: data.statusMessage || "Failed to delete saved search" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: data.data?.deleted,
      searchId: search_id,
    });
  } catch (error: any) {
    console.error("Delete saved search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
