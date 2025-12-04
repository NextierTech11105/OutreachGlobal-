import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { search, type = "address", state, city } = body;

    if (!search || search.length < 3) {
      return NextResponse.json({ data: [], message: "Search term must be at least 3 characters" });
    }

    // Build request to RealEstateAPI Autocomplete endpoint
    const autocompleteBody: Record<string, string> = {
      search: search.trim(),
      type, // address, city, county, zip, neighborhood
    };

    if (state) autocompleteBody.state = state;
    if (city) autocompleteBody.city = city;

    const response = await fetch("https://api.realestateapi.com/v1/AutoComplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(autocompleteBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Autocomplete failed", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Address autocomplete error:", error);
    return NextResponse.json(
      { error: "Autocomplete failed", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("q") || searchParams.get("search") || "";
  const type = searchParams.get("type") || "address";
  const state = searchParams.get("state");
  const city = searchParams.get("city");

  if (!search || search.length < 3) {
    return NextResponse.json({ data: [], message: "Search term must be at least 3 characters" });
  }

  try {
    const autocompleteBody: Record<string, string> = {
      search: search.trim(),
      type,
    };

    if (state) autocompleteBody.state = state;
    if (city) autocompleteBody.city = city;

    const response = await fetch("https://api.realestateapi.com/v1/AutoComplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(autocompleteBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Autocomplete failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Address autocomplete error:", error);
    return NextResponse.json(
      { error: "Autocomplete failed", details: error.message },
      { status: 500 }
    );
  }
}
