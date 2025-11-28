import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = "NEXTIER-2906-74a1-8684-d2f63f473b7b";
const REALESTATE_API_BASE = "https://api.realestateapi.com/v2";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Build the query string to forward to RealEstateAPI
  const params = new URLSearchParams();

  // Forward all params
  searchParams.forEach((value, key) => {
    params.set(key, value);
  });

  try {
    const response = await fetch(
      `${REALESTATE_API_BASE}/PropertySearch?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "x-api-key": REALESTATE_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("RealEstateAPI error:", error);
      return NextResponse.json(
        { error: "API request failed", details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Property search error:", error);
    return NextResponse.json(
      { error: "Failed to search properties" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${REALESTATE_API_BASE}/PropertySearch`, {
      method: "POST",
      headers: {
        "x-api-key": REALESTATE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("RealEstateAPI error:", error);
      return NextResponse.json(
        { error: "API request failed", details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Property search error:", error);
    return NextResponse.json(
      { error: "Failed to search properties" },
      { status: 500 }
    );
  }
}
