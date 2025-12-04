import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_KEY || "";
const API_BASE = "https://api.realestateapi.com/v2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, house, street, city, state, zip } = body;

    // Build request body - supports full address or address parts
    const requestBody: Record<string, string> = {};

    if (address) {
      // Full address lookup
      requestBody.address = address;
    } else if (house || street || city || state || zip) {
      // Address parts lookup
      if (house) requestBody.house = house;
      if (street) requestBody.street = street;
      if (city) requestBody.city = city;
      if (state) requestBody.state = state;
      if (zip) requestBody.zip = zip;
    } else {
      return NextResponse.json(
        { error: "Address or address parts required" },
        { status: 400 }
      );
    }

    // Call RealEstateAPI PropertyDetail endpoint
    const response = await fetch(`${API_BASE}/PropertyDetail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Property not found", statusCode: response.status },
        { status: response.status }
      );
    }

    // Return standardized response
    return NextResponse.json({
      success: true,
      data: data.data || data,
      input: requestBody,
      verified: !!(data.data?.id || data.id),
    });
  } catch (error: any) {
    console.error("Address verify error:", error);
    return NextResponse.json(
      { error: "Verification failed", details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for simple address verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  try {
    const response = await fetch(`${API_BASE}/PropertyDetail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "Accept": "application/json",
      },
      body: JSON.stringify({ address }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Property not found", verified: false },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data || data,
      verified: !!(data.data?.id || data.id),
    });
  } catch (error: any) {
    console.error("Address verify error:", error);
    return NextResponse.json(
      { error: "Verification failed", details: error.message, verified: false },
      { status: 500 }
    );
  }
}
